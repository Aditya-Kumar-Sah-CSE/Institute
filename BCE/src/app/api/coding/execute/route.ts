import { NextResponse } from 'next/server';
import type { ExecutionStatus, NormalizedExecutionResult } from '@/features/code-arena/types';

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
    const { code, language, stdin = '' } = await request.json();

    if (language === 'html') {
      return NextResponse.json({
        status: 'SUCCESS',
        stdout: 'HTML/CSS/React compilation is run directly in the browser sandbox.',
        stderr: '',
        compileStdout: '',
        compileStderr: '',
        exitCode: 0,
        signal: null,
        executionTimeMs: 0,
        memoryUsedMb: 0,
        message: 'Direct HTML rendering',
      } as NormalizedExecutionResult);
    }

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

    const compiler = WANDBOX_COMPILERS[language] || 'gcc-head';

    let codeToSend = code;
    if (language === 'java') {
      // Strip "public class" to "class" so that file compiled by Wandbox as prog.java doesn't fail compilation
      codeToSend = code.replace(/\bpublic\s+class\b/g, 'class');
    }

    try {
      const res = await fetch('https://wandbox.org/api/compile.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiler,
          code: codeToSend,
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

        let status: ExecutionStatus = 'SUCCESS';
        let message: string | null = null;

        // 1. Compilation Error
        if (compileStderr && exitCode !== 0 && !stdout) {
          status = 'COMPILATION_ERROR';
          message = 'Compilation failed. Check compiler diagnostics.';
        }
        // 2. Time Limit Exceeded
        else if (signal === 'SIGKILL' || (stderr && stderr.toLowerCase().includes('time limit exceeded'))) {
          status = 'TIME_LIMIT_EXCEEDED';
          message = 'Execution exceeded time limit.';
        }
        // 3. Runtime Error
        else if (signal || (!isNaN(exitCode) && exitCode !== 0)) {
          status = 'RUNTIME_ERROR';
          message = signal ? `Process terminated by signal: ${signal}` : `Process exited with code ${exitCode}`;
        }
        // 4. Success
        else {
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
        } as NormalizedExecutionResult);
      }
    } catch (wandboxErr: any) {
      console.warn('Wandbox execution error:', wandboxErr);
    }

    // JS Sandbox fallback if offline
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
      stderr: '',
      compileStdout: '',
      compileStderr: '',
      exitCode: null,
      signal: null,
      executionTimeMs: null,
      memoryUsedMb: null,
      message: 'Unable to reach execution server. Please try again.',
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
