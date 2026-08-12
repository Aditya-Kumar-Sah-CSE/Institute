import { NextResponse } from 'next/server';
import type { ExecutionStatus, NormalizedExecutionResult } from '@/features/code-arena/types';

const PISTON_LANG_MAP: Record<string, string> = {
  cpp17: 'cpp',
  cpp: 'cpp',
  c: 'c',
  java: 'java',
  python: 'python',
  python3: 'python',
  javascript: 'javascript',
  js: 'javascript',
};

const FILE_NAMES: Record<string, string> = {
  cpp: 'main.cpp',
  c: 'main.c',
  java: 'Main.java',
  python: 'main.py',
  javascript: 'main.js',
};

export async function POST(request: Request) {
  try {
    const { code, language, stdin = '' } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        {
          status: 'SYSTEM_ERROR',
          stdout: '',
          stderr: '',
          compileStdout: '',
          compileStderr: '',
          exitCode: null,
          signal: null,
          executionTimeMs: null,
          memoryUsedMb: null,
          message: 'Code string is required',
        } as NormalizedExecutionResult,
        { status: 400 }
      );
    }

    const targetLang = PISTON_LANG_MAP[language] || 'javascript';
    const fileName = FILE_NAMES[targetLang] || 'main';

    try {
      const pistonRes = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: targetLang,
          version: '*',
          files: [
            {
              name: fileName,
              content: code,
            },
          ],
          stdin: typeof stdin === 'string' ? stdin : String(stdin || ''),
        }),
      });

      if (pistonRes.ok) {
        const data = await pistonRes.json();
        const compile = data.compile || {};
        const run = data.run || {};

        const compileStdout = compile.stdout || '';
        const compileStderr = compile.stderr || compile.output || '';
        const stdout = run.stdout || '';
        const stderr = run.stderr || '';
        const exitCode = typeof run.code === 'number' ? run.code : null;
        const signal = run.signal || compile.signal || null;

        let status: ExecutionStatus = 'SUCCESS';
        let message: string | null = null;

        // 1. Compilation error check
        if (compile.code !== undefined && compile.code !== 0) {
          status = 'COMPILATION_ERROR';
          message = 'Compilation failed. Check compiler diagnostics.';
        } else if (compileStderr && !compileStdout && compile.code !== 0) {
          status = 'COMPILATION_ERROR';
          message = 'Compilation failed.';
        }
        // 2. Time Limit Exceeded check
        else if (signal === 'SIGKILL' || (run.output && run.output.toLowerCase().includes('time limit exceeded'))) {
          status = 'TIME_LIMIT_EXCEEDED';
          message = 'Execution exceeded time limit.';
        }
        // 3. Runtime Error check
        else if (signal || (exitCode !== null && exitCode !== 0)) {
          status = 'RUNTIME_ERROR';
          message = signal ? `Process terminated with signal: ${signal}` : `Process exited with code ${exitCode}`;
        }
        // 4. Success
        else {
          status = 'SUCCESS';
          message = 'Execution finished successfully.';
        }

        const result: NormalizedExecutionResult = {
          status,
          stdout,
          stderr,
          compileStdout,
          compileStderr,
          exitCode,
          signal,
          executionTimeMs: null,
          memoryUsedMb: null,
          message,
        };

        return NextResponse.json(result);
      }
    } catch (pistonErr: any) {
      console.warn('Piston API request error:', pistonErr);
    }

    // Secondary fallback for JS
    if (targetLang === 'javascript') {
      const logs: string[] = [];
      const errLogs: string[] = [];
      const customConsole = {
        log: (...args: any[]) => logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
        error: (...args: any[]) => errLogs.push(args.map((a) => String(a)).join(' ')),
        warn: (...args: any[]) => logs.push('[Warn] ' + args.map((a) => String(a)).join(' ')),
      };
      try {
        const fn = new Function('console', 'input', code);
        const ret = fn(customConsole, stdin);
        if (ret !== undefined) {
          logs.push(`[Return Value]: ${typeof ret === 'object' ? JSON.stringify(ret) : String(ret)}`);
        }
        return NextResponse.json({
          status: errLogs.length > 0 ? 'RUNTIME_ERROR' : 'SUCCESS',
          stdout: logs.join('\n'),
          stderr: errLogs.join('\n'),
          compileStdout: '',
          compileStderr: '',
          exitCode: errLogs.length > 0 ? 1 : 0,
          signal: null,
          executionTimeMs: null,
          memoryUsedMb: null,
          message: errLogs.length > 0 ? 'Runtime error in JS environment' : 'JavaScript execution completed',
        } as NormalizedExecutionResult);
      } catch (err: any) {
        return NextResponse.json({
          status: 'RUNTIME_ERROR',
          stdout: logs.join('\n'),
          stderr: err?.message || String(err),
          compileStdout: '',
          compileStderr: '',
          exitCode: 1,
          signal: null,
          executionTimeMs: null,
          memoryUsedMb: null,
          message: err?.message || 'JavaScript execution error',
        } as NormalizedExecutionResult);
      }
    }

    return NextResponse.json({
      status: 'SYSTEM_ERROR',
      stdout: '',
      stderr: 'Unable to reach execution server.',
      compileStdout: '',
      compileStderr: '',
      exitCode: null,
      signal: null,
      executionTimeMs: null,
      memoryUsedMb: null,
      message: 'Failed to connect to Online Judge execution server.',
    } as NormalizedExecutionResult);
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'SYSTEM_ERROR',
        stdout: '',
        stderr: err?.message || 'Internal server error',
        compileStdout: '',
        compileStderr: '',
        exitCode: null,
        signal: null,
        executionTimeMs: null,
        memoryUsedMb: null,
        message: err?.message || 'Execution request failed',
      } as NormalizedExecutionResult,
      { status: 500 }
    );
  }
}
