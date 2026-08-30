import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { 
  cleanAndValidatePath, 
  toUserFacingPath, 
  getWorkspaceTree 
} from '@/features/code-arena/workspace-db';

const WANDBOX_COMPILERS: Record<string, string> = {
  cpp17: 'gcc-head',
  cpp: 'gcc-head',
  c: 'gcc-head-c',
  java: 'openjdk-jdk-21+35',
  python: 'cpython-3.12.7',
  python3: 'cpython-3.12.7',
  javascript: 'nodejs-20.17.0',
  js: 'nodejs-20.17.0',
};

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { command, cwd: clientCwd, stdin = '' } = await request.json();
    
    // 1. Sanitize and validate CWD
    let cwd = '';
    try {
      cwd = cleanAndValidatePath(clientCwd || '');
    } catch (e: any) {
      return NextResponse.json({ 
        stdout: '', 
        stderr: e.message || 'Invalid working directory', 
        exitCode: 1,
        cwd: '' 
      });
    }

    // 2. Parse command parts
    const trimmedCmd = (command || '').trim();
    if (!trimmedCmd) {
      return NextResponse.json({ 
        stdout: '', 
        stderr: '', 
        exitCode: 0, 
        cwd 
      });
    }

    // Parse simple args (basic parser handling spaces and quotes)
    const args: string[] = [];
    let currentArg = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < trimmedCmd.length; i++) {
      const char = trimmedCmd[i];
      if ((char === '"' || char === "'") && (i === 0 || trimmedCmd[i - 1] !== '\\')) {
        if (inQuotes && char === quoteChar) {
          inQuotes = false;
        } else if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        }
      } else if (char === ' ' && !inQuotes) {
        if (currentArg) {
          args.push(currentArg);
          currentArg = '';
        }
      } else {
        currentArg += char;
      }
    }
    if (currentArg) {
      args.push(currentArg);
    }

    const primaryCmd = args[0];

    // Helper: resolve relative path against current CWD
    const resolvePath = (target: string): string => {
      if (!target) return cwd;
      
      // If it starts with ~/workspace or /workspace, resolve from root
      if (target.startsWith('~/workspace') || target.startsWith('/workspace')) {
        return cleanAndValidatePath(target);
      }
      
      // If absolute root reference like ~ or /
      if (target === '~' || target === '/') {
        return '';
      }
      
      const combined = cwd ? `${cwd}/${target}` : target;
      return cleanAndValidatePath(combined);
    };

    // Helper: check if file or directory exists in database
    const checkExists = async (path: string): Promise<{ exists: boolean; kind?: 'file' | 'directory'; content?: string }> => {
      const { data, error } = await supabase
        .from('student_workspace_files')
        .select('kind, content')
        .eq('student_id', user.id)
        .eq('path', path)
        .maybeSingle();
        
      if (error || !data) return { exists: false };
      return { exists: true, kind: data.kind as 'file' | 'directory', content: data.content };
    };

    // 3. Command dispatcher
    switch (primaryCmd) {
      case 'clear':
        return NextResponse.json({ stdout: '\x1bc', stderr: '', exitCode: 0, cwd });

      case 'pwd':
        return NextResponse.json({ 
          stdout: `/workspace${cwd ? '/' + cwd : ''}\n`, 
          stderr: '', 
          exitCode: 0, 
          cwd 
        });

      case 'cd': {
        const target = args[1] || '';
        let targetPath = '';
        if (target === '~' || target === '' || target === '/') {
          targetPath = '';
        } else {
          try {
            targetPath = resolvePath(target);
          } catch (e: any) {
            return NextResponse.json({ 
              stdout: '', 
              stderr: `cd: ${target}: ${e.message || 'Access denied'}\n`, 
              exitCode: 1, 
              cwd 
            });
          }
        }

        if (targetPath !== '') {
          const { exists, kind } = await checkExists(targetPath);
          if (!exists) {
            return NextResponse.json({ 
              stdout: '', 
              stderr: `cd: ${target}: No such file or directory\n`, 
              exitCode: 1, 
              cwd 
            });
          }
          if (kind !== 'directory') {
            return NextResponse.json({ 
              stdout: '', 
              stderr: `cd: ${target}: Not a directory\n`, 
              exitCode: 1, 
              cwd 
            });
          }
        }

        return NextResponse.json({ 
          stdout: '', 
          stderr: '', 
          exitCode: 0, 
          cwd: targetPath 
        });
      }

      case 'mkdir': {
        if (args.length < 2) {
          return NextResponse.json({ stdout: '', stderr: 'mkdir: missing operand\n', exitCode: 1, cwd });
        }
        let targetPath = '';
        try {
          targetPath = resolvePath(args[1]);
        } catch (e: any) {
          return NextResponse.json({ stdout: '', stderr: `mkdir: ${e.message}\n`, exitCode: 1, cwd });
        }

        const { exists } = await checkExists(targetPath);
        if (exists) {
          return NextResponse.json({ stdout: '', stderr: `mkdir: cannot create directory '${args[1]}': File exists\n`, exitCode: 1, cwd });
        }

        const { error } = await supabase
          .from('student_workspace_files')
          .insert({ student_id: user.id, path: targetPath, kind: 'directory', content: '' });

        if (error) {
          return NextResponse.json({ stdout: '', stderr: `mkdir: database error: ${error.message}\n`, exitCode: 1, cwd });
        }

        return NextResponse.json({ stdout: '', stderr: '', exitCode: 0, cwd });
      }

      case 'touch': {
        if (args.length < 2) {
          return NextResponse.json({ stdout: '', stderr: 'touch: missing file operand\n', exitCode: 1, cwd });
        }
        let targetPath = '';
        try {
          targetPath = resolvePath(args[1]);
        } catch (e: any) {
          return NextResponse.json({ stdout: '', stderr: `touch: ${e.message}\n`, exitCode: 1, cwd });
        }

        const { exists } = await checkExists(targetPath);
        if (!exists) {
          const { error } = await supabase
            .from('student_workspace_files')
            .insert({ student_id: user.id, path: targetPath, kind: 'file', content: '' });

          if (error) {
            return NextResponse.json({ stdout: '', stderr: `touch: database error: ${error.message}\n`, exitCode: 1, cwd });
          }
        } else {
          // Update timestamp
          await supabase
            .from('student_workspace_files')
            .update({ updated_at: new Date().toISOString() })
            .eq('student_id', user.id)
            .eq('path', targetPath);
        }

        return NextResponse.json({ stdout: '', stderr: '', exitCode: 0, cwd });
      }

      case 'cat': {
        if (args.length < 2) {
          return NextResponse.json({ stdout: '', stderr: 'cat: missing file operand\n', exitCode: 1, cwd });
        }
        let targetPath = '';
        try {
          targetPath = resolvePath(args[1]);
        } catch (e: any) {
          return NextResponse.json({ stdout: '', stderr: `cat: ${e.message}\n`, exitCode: 1, cwd });
        }

        const { exists, kind, content } = await checkExists(targetPath);
        if (!exists) {
          return NextResponse.json({ stdout: '', stderr: `cat: ${args[1]}: No such file or directory\n`, exitCode: 1, cwd });
        }
        if (kind !== 'file') {
          return NextResponse.json({ stdout: '', stderr: `cat: ${args[1]}: Is a directory\n`, exitCode: 1, cwd });
        }

        return NextResponse.json({ stdout: `${content}\n`, stderr: '', exitCode: 0, cwd });
      }

      case 'ls': {
        const { data, error } = await supabase
          .from('student_workspace_files')
          .select('path, kind, content, updated_at')
          .eq('student_id', user.id);

        if (error) {
          return NextResponse.json({ stdout: '', stderr: `ls: database error: ${error.message}\n`, exitCode: 1, cwd });
        }

        const items = data || [];
        // Filter immediate children of current cwd
        const prefix = cwd ? cwd + '/' : '';
        const filtered = items.filter(x => {
          if (cwd) {
            return x.path.startsWith(prefix) && x.path.slice(prefix.length).split('/').length === 1;
          } else {
            return x.path.split('/').length === 1;
          }
        });

        filtered.sort((a, b) => {
          if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
          return a.path.localeCompare(b.path);
        });

        const isLong = args.includes('-la') || args.includes('-l');
        if (isLong) {
          let output = '';
          for (const item of filtered) {
            const name = cwd ? item.path.slice(prefix.length) : item.path;
            const date = new Date(item.updated_at).toLocaleDateString();
            const time = new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const type = item.kind === 'directory' ? 'd' : '-';
            const size = item.kind === 'file' ? (item.content || '').length : 4096;
            
            output += `${type}rwxr-xr-x 1 user user ${String(size).padStart(6)} ${date} ${time} ${name}\n`;
          }
          return NextResponse.json({ stdout: output || 'total 0\n', stderr: '', exitCode: 0, cwd });
        } else {
          const names = filtered.map(x => cwd ? x.path.slice(prefix.length) : x.path);
          return NextResponse.json({ stdout: names.join('  ') + (names.length ? '\n' : ''), stderr: '', exitCode: 0, cwd });
        }
      }

      case 'rm': {
        const recursive = args.includes('-r') || args.includes('-rf');
        const fileArgs = args.filter(x => x !== 'rm' && x !== '-r' && x !== '-rf');
        
        if (fileArgs.length === 0) {
          return NextResponse.json({ stdout: '', stderr: 'rm: missing operand\n', exitCode: 1, cwd });
        }

        let targetPath = '';
        try {
          targetPath = resolvePath(fileArgs[0]);
        } catch (e: any) {
          return NextResponse.json({ stdout: '', stderr: `rm: ${e.message}\n`, exitCode: 1, cwd });
        }

        const { exists, kind } = await checkExists(targetPath);
        if (!exists) {
          return NextResponse.json({ stdout: '', stderr: `rm: cannot remove '${fileArgs[0]}': No such file or directory\n`, exitCode: 1, cwd });
        }

        if (kind === 'directory' && !recursive) {
          return NextResponse.json({ stdout: '', stderr: `rm: cannot remove '${fileArgs[0]}': Is a directory\n`, exitCode: 1, cwd });
        }

        if (kind === 'file') {
          await supabase
            .from('student_workspace_files')
            .delete()
            .eq('student_id', user.id)
            .eq('path', targetPath);
        } else {
          // Recursive directory delete
          await supabase
            .from('student_workspace_files')
            .delete()
            .eq('student_id', user.id)
            .or(`path.eq.${targetPath},path.like.${targetPath}/*`);
        }

        return NextResponse.json({ stdout: '', stderr: '', exitCode: 0, cwd });
      }

      case 'cp': {
        if (args.length < 3) {
          return NextResponse.json({ stdout: '', stderr: 'cp: missing file operand\n', exitCode: 1, cwd });
        }
        let src = '';
        let dest = '';
        try {
          src = resolvePath(args[1]);
          dest = resolvePath(args[2]);
        } catch (e: any) {
          return NextResponse.json({ stdout: '', stderr: `cp: ${e.message}\n`, exitCode: 1, cwd });
        }

        const { exists: srcExists, kind: srcKind, content: srcContent } = await checkExists(src);
        if (!srcExists) {
          return NextResponse.json({ stdout: '', stderr: `cp: cannot stat '${args[1]}': No such file or directory\n`, exitCode: 1, cwd });
        }

        if (srcKind === 'directory') {
          return NextResponse.json({ stdout: '', stderr: 'cp: directory copying is not supported yet\n', exitCode: 1, cwd });
        }

        // Upsert destination file
        await supabase
          .from('student_workspace_files')
          .upsert({
            student_id: user.id,
            path: dest,
            kind: 'file',
            content: srcContent || ''
          }, { onConflict: 'student_id,path' });

        return NextResponse.json({ stdout: '', stderr: '', exitCode: 0, cwd });
      }

      case 'mv': {
        if (args.length < 3) {
          return NextResponse.json({ stdout: '', stderr: 'mv: missing file operand\n', exitCode: 1, cwd });
        }
        let src = '';
        let dest = '';
        try {
          src = resolvePath(args[1]);
          dest = resolvePath(args[2]);
        } catch (e: any) {
          return NextResponse.json({ stdout: '', stderr: `mv: ${e.message}\n`, exitCode: 1, cwd });
        }

        const { exists: srcExists, kind: srcKind } = await checkExists(src);
        if (!srcExists) {
          return NextResponse.json({ stdout: '', stderr: `mv: cannot stat '${args[1]}': No such file or directory\n`, exitCode: 1, cwd });
        }

        if (srcKind === 'file') {
          await supabase
            .from('student_workspace_files')
            .upsert({
              student_id: user.id,
              path: dest,
              kind: 'file',
              content: (await checkExists(src)).content || ''
            }, { onConflict: 'student_id,path' });

          await supabase
            .from('student_workspace_files')
            .delete()
            .eq('student_id', user.id)
            .eq('path', src);
        } else {
          // Rename directory and update children
          const { data: allItems } = await supabase
            .from('student_workspace_files')
            .select('path, kind, content')
            .eq('student_id', user.id);
            
          const targets = (allItems || []).filter(x => x.path === src || x.path.startsWith(src + '/'));
          for (const target of targets) {
            const suffix = target.path.slice(src.length);
            const targetDest = dest + suffix;
            
            await supabase
              .from('student_workspace_files')
              .upsert({
                student_id: user.id,
                path: targetDest,
                kind: target.kind,
                content: target.content || ''
              }, { onConflict: 'student_id,path' });
              
            await supabase
              .from('student_workspace_files')
              .delete()
              .eq('student_id', user.id)
              .eq('path', target.path);
          }
        }

        return NextResponse.json({ stdout: '', stderr: '', exitCode: 0, cwd });
      }

      case 'echo': {
        // Redirection parser
        const match = trimmedCmd.match(/^echo\s+("(.*)"|'(.*)'|([^>]+))\s*>\s*(.*)$/i);
        if (match) {
          const content = match[2] || match[3] || match[4] || '';
          const targetFile = match[5].trim().replace(/^["']|["']$/g, '');
          
          let targetPath = '';
          try {
            targetPath = resolvePath(targetFile);
          } catch (e: any) {
            return NextResponse.json({ stdout: '', stderr: `echo: ${e.message}\n`, exitCode: 1, cwd });
          }

          await supabase
            .from('student_workspace_files')
            .upsert({
              student_id: user.id,
              path: targetPath,
              kind: 'file',
              content: content.trim()
            }, { onConflict: 'student_id,path' });

          return NextResponse.json({ stdout: '', stderr: '', exitCode: 0, cwd });
        } else {
          // Just printing echo
          const echoVal = trimmedCmd.replace(/^echo\s+/i, '').replace(/^["']|["']$/g, '');
          return NextResponse.json({ stdout: `${echoVal}\n`, stderr: '', exitCode: 0, cwd });
        }
      }

      // 4. COMPILER COMMANDS & EXECUTIONS (Wandbox engine integration)
      case 'g++': {
        // Syntax: g++ main.cpp -o main
        const srcArg = args[1];
        const outIdx = args.indexOf('-o');
        const destArg = outIdx !== -1 ? args[outIdx + 1] : 'a.out';

        if (!srcArg) {
          return NextResponse.json({ stdout: '', stderr: 'g++: error: no input files\n', exitCode: 1, cwd });
        }

        let srcPath = '';
        let destPath = '';
        try {
          srcPath = resolvePath(srcArg);
          destPath = resolvePath(destArg);
        } catch (e: any) {
          return NextResponse.json({ stdout: '', stderr: `g++: ${e.message}\n`, exitCode: 1, cwd });
        }

        const { exists, kind, content } = await checkExists(srcPath);
        if (!exists) {
          return NextResponse.json({ stdout: '', stderr: `g++: error: ${srcArg}: No such file or directory\n`, exitCode: 1, cwd });
        }
        if (kind !== 'file') {
          return NextResponse.json({ stdout: '', stderr: `g++: error: ${srcArg}: is a directory\n`, exitCode: 1, cwd });
        }

        // Call Wandbox to verify compilation
        const compiler = WANDBOX_COMPILERS.cpp17;
        const res = await fetch('https://wandbox.org/api/compile.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ compiler, code: content, stdin: '' }),
        });

        if (!res.ok) {
          return NextResponse.json({ stdout: '', stderr: 'g++: compilation service offline\n', exitCode: 1, cwd });
        }

        const data = await res.json();
        const compileStderr = data.compiler_error || data.compiler_message || '';
        const rawStatus = String(data.status ?? '0');
        const exitCode = parseInt(rawStatus, 10) || 0;

        if (exitCode !== 0) {
          return NextResponse.json({ 
            stdout: '', 
            stderr: compileStderr + '\n', 
            exitCode, 
            cwd 
          });
        }

        // Compilation succeeded! Write a virtual executable linkage file into the database
        await supabase
          .from('student_workspace_files')
          .upsert({
            student_id: user.id,
            path: destPath,
            kind: 'file',
            content: `__VIRTUAL_EXE__:cpp17:${srcPath}`
          }, { onConflict: 'student_id,path' });

        return NextResponse.json({ stdout: '', stderr: '', exitCode: 0, cwd });
      }

      case 'javac': {
        // Syntax: javac Main.java
        const srcArg = args[1];
        if (!srcArg) {
          return NextResponse.json({ stdout: '', stderr: 'javac: no source files\n', exitCode: 1, cwd });
        }

        let srcPath = '';
        try {
          srcPath = resolvePath(srcArg);
        } catch (e: any) {
          return NextResponse.json({ stdout: '', stderr: `javac: ${e.message}\n`, exitCode: 1, cwd });
        }

        const { exists, kind, content } = await checkExists(srcPath);
        if (!exists) {
          return NextResponse.json({ stdout: '', stderr: `javac: error: ${srcArg}: No such file or directory\n`, exitCode: 1, cwd });
        }
        if (kind !== 'file') {
          return NextResponse.json({ stdout: '', stderr: `javac: error: ${srcArg}: is a directory\n`, exitCode: 1, cwd });
        }

        // Call Wandbox to verify compilation
        const compiler = WANDBOX_COMPILERS.java;
        const res = await fetch('https://wandbox.org/api/compile.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ compiler, code: content, stdin: '' }),
        });

        if (!res.ok) {
          return NextResponse.json({ stdout: '', stderr: 'javac: compilation service offline\n', exitCode: 1, cwd });
        }

        const data = await res.json();
        const compileStderr = data.compiler_error || data.compiler_message || '';
        const rawStatus = String(data.status ?? '0');
        const exitCode = parseInt(rawStatus, 10) || 0;

        if (exitCode !== 0) {
          return NextResponse.json({ 
            stdout: '', 
            stderr: compileStderr + '\n', 
            exitCode, 
            cwd 
          });
        }

        // Write a virtual Java class target linked to source
        const className = srcArg.replace(/\.java$/, '');
        let destPath = '';
        try {
          destPath = resolvePath(`${className}.class`);
        } catch (e: any) {
          return NextResponse.json({ stdout: '', stderr: `javac: ${e.message}\n`, exitCode: 1, cwd });
        }

        await supabase
          .from('student_workspace_files')
          .upsert({
            student_id: user.id,
            path: destPath,
            kind: 'file',
            content: `__VIRTUAL_EXE__:java:${srcPath}`
          }, { onConflict: 'student_id,path' });

        return NextResponse.json({ stdout: '', stderr: '', exitCode: 0, cwd });
      }

      case 'python':
      case 'python3': {
        const srcArg = args[1];
        if (!srcArg) {
          return NextResponse.json({ stdout: '', stderr: 'python: missing script filename\n', exitCode: 1, cwd });
        }

        let srcPath = '';
        try {
          srcPath = resolvePath(srcArg);
        } catch (e: any) {
          return NextResponse.json({ stdout: '', stderr: `python: ${e.message}\n`, exitCode: 1, cwd });
        }

        const { exists, kind, content } = await checkExists(srcPath);
        if (!exists) {
          return NextResponse.json({ stdout: '', stderr: `python: can't open file '${srcArg}': No such file or directory\n`, exitCode: 1, cwd });
        }
        if (kind !== 'file') {
          return NextResponse.json({ stdout: '', stderr: `python: '${srcArg}' is a directory\n`, exitCode: 1, cwd });
        }

        // Execute via Wandbox Python interpreter
        const compiler = WANDBOX_COMPILERS.python;
        const res = await fetch('https://wandbox.org/api/compile.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ compiler, code: content, stdin }),
        });

        if (!res.ok) {
          return NextResponse.json({ stdout: '', stderr: 'python: execution service offline\n', exitCode: 1, cwd });
        }

        const data = await res.json();
        const stdout = data.program_output || '';
        const stderr = data.program_error || '';
        const exitCode = parseInt(String(data.status ?? '0'), 10) || 0;

        return NextResponse.json({ stdout, stderr, exitCode, cwd });
      }

      case 'node': {
        const srcArg = args[1];
        if (!srcArg) {
          return NextResponse.json({ stdout: '', stderr: 'node: missing script filename\n', exitCode: 1, cwd });
        }

        let srcPath = '';
        try {
          srcPath = resolvePath(srcArg);
        } catch (e: any) {
          return NextResponse.json({ stdout: '', stderr: `node: ${e.message}\n`, exitCode: 1, cwd });
        }

        const { exists, kind, content } = await checkExists(srcPath);
        if (!exists) {
          return NextResponse.json({ stdout: '', stderr: `node: internal/modules/cjs/loader: Cannot find module '${srcArg}'\n`, exitCode: 1, cwd });
        }
        if (kind !== 'file') {
          return NextResponse.json({ stdout: '', stderr: `node: '${srcArg}' is a directory\n`, exitCode: 1, cwd });
        }

        // Run Node.js on Wandbox
        const compiler = WANDBOX_COMPILERS.javascript;
        const res = await fetch('https://wandbox.org/api/compile.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ compiler, code: content, stdin }),
        });

        if (!res.ok) {
          return NextResponse.json({ stdout: '', stderr: 'node: execution service offline\n', exitCode: 1, cwd });
        }

        const data = await res.json();
        const stdout = data.program_output || '';
        const stderr = data.program_error || '';
        const exitCode = parseInt(String(data.status ?? '0'), 10) || 0;

        return NextResponse.json({ stdout, stderr, exitCode, cwd });
      }

      case 'java': {
        const classArg = args[1];
        if (!classArg) {
          return NextResponse.json({ stdout: '', stderr: 'java: missing class name\n', exitCode: 1, cwd });
        }

        // Try looking up either "Class" or "Class.class" virtual executable
        let classPath = '';
        try {
          classPath = resolvePath(classArg.endsWith('.class') ? classArg : `${classArg}.class`);
        } catch (e: any) {
          return NextResponse.json({ stdout: '', stderr: `java: ${e.message}\n`, exitCode: 1, cwd });
        }

        const { exists, content } = await checkExists(classPath);
        if (!exists || !content || !content.startsWith('__VIRTUAL_EXE__:java:')) {
          return NextResponse.json({ stdout: '', stderr: `Error: Could not find or load main class ${classArg}\n`, exitCode: 1, cwd });
        }

        const srcPath = content.split(':')[2];
        const { exists: srcExists, content: srcCode } = await checkExists(srcPath);
        if (!srcExists || !srcCode) {
          return NextResponse.json({ stdout: '', stderr: `Error: Source file for class ${classArg} was deleted\n`, exitCode: 1, cwd });
        }

        // Run java on Wandbox
        const compiler = WANDBOX_COMPILERS.java;
        const res = await fetch('https://wandbox.org/api/compile.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ compiler, code: srcCode, stdin }),
        });

        if (!res.ok) {
          return NextResponse.json({ stdout: '', stderr: 'java: execution service offline\n', exitCode: 1, cwd });
        }

        const data = await res.json();
        const stdout = data.program_output || '';
        const stderr = data.program_error || '';
        const exitCode = parseInt(String(data.status ?? '0'), 10) || 0;

        return NextResponse.json({ stdout, stderr, exitCode, cwd });
      }

      default: {
        // Check if user is executing a local virtual binary, e.g., ./main
        if (primaryCmd.startsWith('./')) {
          const exeName = primaryCmd.slice(2);
          let exePath = '';
          try {
            exePath = resolvePath(exeName);
          } catch (e: any) {
            return NextResponse.json({ stdout: '', stderr: `bash: ${primaryCmd}: ${e.message}\n`, exitCode: 1, cwd });
          }

          const { exists, content } = await checkExists(exePath);
          if (!exists) {
            return NextResponse.json({ stdout: '', stderr: `bash: ${primaryCmd}: No such file or directory\n`, exitCode: 1, cwd });
          }
          if (!content || !content.startsWith('__VIRTUAL_EXE__:')) {
            return NextResponse.json({ stdout: '', stderr: `bash: ${primaryCmd}: Permission denied\n`, exitCode: 1, cwd });
          }

          const parts = content.split(':');
          const lang = parts[1];
          const srcPath = parts[2];

          const { exists: srcExists, content: srcCode } = await checkExists(srcPath);
          if (!srcExists || !srcCode) {
            return NextResponse.json({ stdout: '', stderr: `bash: ${primaryCmd}: source code file deleted\n`, exitCode: 1, cwd });
          }

          const compiler = WANDBOX_COMPILERS[lang];
          const res = await fetch('https://wandbox.org/api/compile.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ compiler, code: srcCode, stdin }),
          });

          if (!res.ok) {
            return NextResponse.json({ stdout: '', stderr: 'bash: execution service offline\n', exitCode: 1, cwd });
          }

          const data = await res.json();
          const stdout = data.program_output || '';
          const stderr = data.program_error || '';
          const exitCode = parseInt(String(data.status ?? '0'), 10) || 0;

          return NextResponse.json({ stdout, stderr, exitCode, cwd });
        }

        // Unknown command
        return NextResponse.json({ 
          stdout: '', 
          stderr: `bash: ${primaryCmd}: command not found\n`, 
          exitCode: 127, 
          cwd 
        });
      }
    }
  } catch (err: any) {
    console.error('Error executing command:', err);
    return NextResponse.json({ 
      stdout: '', 
      stderr: `bash: internal server error: ${err.message || 'unknown'}\n`, 
      exitCode: 1, 
      cwd: '' 
    });
  }
}
