import { NextResponse } from 'next/server';
import type { ExecutionStatus, NormalizedExecutionResult } from '@/features/code-arena/types';
import { checkRateLimit } from '@/lib/rate-limit';
import { getCachedProblemSignature, setCachedProblemSignature } from '@/features/code-arena/judge';

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
  const reqStart = Date.now();
  try {
    const { isFeatureAllowed } = await import('@/lib/feature-flags');
    if (!(await isFeatureAllowed('coding_arena')) || !(await isFeatureAllowed('compiler'))) {
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
          message: 'Coding Arena and Compiler have been disabled globally by the Platform Owner.',
        } as NormalizedExecutionResult,
        { status: 403 }
      );
    }

    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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
          message: 'Unauthorized: Authentication required',
        } as NormalizedExecutionResult,
        { status: 401 }
      );
    }

    // Rate limit: 60 compiler executions per minute
    const rl = checkRateLimit(`compiler:${user.id}`, 60, 60000);
    if (!rl.success) {
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
          message: rl.error,
        } as NormalizedExecutionResult,
        { status: 429 }
      );
    }

    const { code, language, stdin = '', problemId, testCases, signature: providedSignature } = await request.json();

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

    // Support running batch test cases via judgeService
    if (Array.isArray(testCases) && testCases.length > 0) {
      const { judgeService } = await import('@/features/code-arena/judge');
      const result = await judgeService.execute({
        problemId,
        language,
        sourceCode: code,
        testCases: testCases.map((tc: any) => ({
          input: tc.input || '',
          expectedOutput: tc.expectedOutput || '',
        })),
        timeLimitMs: 2000,
        memoryLimitMb: 256,
      });

      return NextResponse.json({
        isBatch: true,
        ...result,
      });
    }

    let codeToSend = code;

    // Single-run execution: check if harness wrapping is needed
    if (problemId) {
      let sig = providedSignature || getCachedProblemSignature(problemId);
      if (!sig) {
        try {
          const { createAdminClient } = await import('@/lib/supabase/server');
          const adminClient = await createAdminClient();
          const { data: problem } = await adminClient
            .from('coding_problems')
            .select('signature')
            .eq('id', problemId)
            .single();

          if (problem && problem.signature) {
            sig = problem.signature;
            setCachedProblemSignature(problemId, sig);
          }
        } catch (err) {
          console.error('Error fetching problem signature in execute route:', err);
        }
      }

      if (sig) {
        const { wrapCodeWithHarness, hasMainFunction } = await import('@/features/code-arena/harness');
        if (!hasMainFunction(codeToSend, language)) {
          codeToSend = wrapCodeWithHarness(codeToSend, sig, language);
        }
      }
    }

    const { executeCodeResiliently } = await import('@/features/code-arena/execution-engine');
    const result = await executeCodeResiliently({
      language,
      code: codeToSend,
      stdin: typeof stdin === 'string' ? stdin : String(stdin || ''),
    });

    return NextResponse.json({
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      compileStdout: result.compileStdout,
      compileStderr: result.compileStderr,
      exitCode: result.exitCode,
      signal: result.signal,
      executionTimeMs: result.executionTimeMs || (Date.now() - reqStart),
      memoryUsedMb: result.memoryUsedMb,
      message: result.message,
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
