import { NextResponse } from 'next/server';

const WANDBOX_COMPILERS: Record<string, string> = {
  cpp17: 'gcc-head',
  cpp: 'gcc-head',
  c: 'gcc-head-c',
  java: 'openjdk-head',
  python: 'cpython-head',
  python3: 'cpython-head',
  javascript: 'nodejs-head',
  js: 'nodejs-head',
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
        },
        { status: 400 }
      );
    }

    const compiler = WANDBOX_COMPILERS[language] || 'gcc-head';

    try {
      const res = await fetch('https://wandbox.org/api/compile.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiler,
          code,
          stdin: typeof stdin === 'string' ? stdin : String(stdin || ''),
        }),
      });

      if (res.ok) {
        const data = await res.json();

        const rawStatus = String(data.status ?? '0');
        const signal = data.signal || null;
        const stdout = data.program_output || '';
        const stderr = data.program_error || '';
        const compileStdout = data.compiler_output || '';
        const compileStderr = data.compiler_error || data.compiler_message || '';
        const exitCode = rawStatus !== '' ? parseInt(rawStatus, 10) : 0;

        let status = 'SUCCESS';
        let message: string | null = null;

        if (compileStderr && exitCode !== 0 && !stdout) {
          status = 'COMPILATION_ERROR';
          message = 'Compilation failed. Check compiler diagnostics.';
        } else if (signal === 'SIGKILL' || (stderr && stderr.toLowerCase().includes('time limit exceeded'))) {
          status = 'TIME_LIMIT_EXCEEDED';
          message = 'Execution exceeded time limit.';
        } else if (signal || (!isNaN(exitCode) && exitCode !== 0)) {
          status = 'RUNTIME_ERROR';
          message = signal ? `Process terminated by signal: ${signal}` : `Process exited with code ${exitCode}`;
        } else {
          status = 'SUCCESS';
          message = 'Execution finished successfully.';
        }

        return NextResponse.json({
          status,
          stdout,
          stderr,
          compileStdout,
          compileStderr,
          exitCode: isNaN(exitCode) ? null : exitCode,
          signal,
          executionTimeMs: null,
          memoryUsedMb: null,
          message,
        });
      }
    } catch (wandboxErr: any) {
      console.warn('Wandbox execution error:', wandboxErr);
    }

    if (language === 'javascript' || language === 'js') {
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
        });
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
        });
      }
    }

    return NextResponse.json({
      status: 'SYSTEM_ERROR',
      stdout: '',
      stderr: '',
      compileStdout: '',
      compileStderr: '',
      exitCode: null,
      signal: null,
      executionTimeMs: null,
      memoryUsedMb: null,
      message: 'Unable to reach execution server. Please try again.',
    });
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
      },
      { status: 500 }
    );
  }
}
