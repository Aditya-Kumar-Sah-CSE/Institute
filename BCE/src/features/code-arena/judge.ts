import type { CodeExecutionRequest, CodeExecutionResult, SubmissionStatus, ProblemSignature } from './types';
import { wrapCodeWithHarness, hasMainFunction } from './harness';
import { validateContract, ExecutionCapturedState } from './lib/contractValidator';

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

// 5-minute TTL Server Metadata Cache for Problem Signatures & Testcases
interface CacheItem<T> {
  data: T;
  timestamp: number;
}
const CACHE_TTL_MS = 5 * 60 * 1000;
const signatureCache = new Map<string, CacheItem<any>>();
const hiddenTestsCache = new Map<string, CacheItem<any[]>>();

export function getCachedProblemSignature(problemId: string): any | null {
  const cached = signatureCache.get(problemId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

export function setCachedProblemSignature(problemId: string, signature: any) {
  signatureCache.set(problemId, { data: signature, timestamp: Date.now() });
}

export function getCachedHiddenTests(problemId: string): any[] | null {
  const cached = hiddenTestsCache.get(problemId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

export function setCachedHiddenTests(problemId: string, tests: any[]) {
  hiddenTestsCache.set(problemId, { data: tests, timestamp: Date.now() });
}

function parseHarnessCapturedState(stdout: string): ExecutionCapturedState {
  if (!stdout) {
    return { returnValue: '', afterState: {}, rawStdout: '' };
  }
  const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === 'object' && ('ret' in parsed || 'params' in parsed)) {
          return {
            returnValue: parsed.ret,
            afterState: parsed.params || {},
            rawStdout: stdout,
          };
        }
      } catch {}
    }
  }
  return {
    returnValue: stdout.trim(),
    afterState: {},
    rawStdout: stdout,
  };
}

export interface SingleTestResult {
  status: 'PASSED' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'COMPILATION_ERROR' | 'TIME_LIMIT_EXCEEDED';
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  mismatchInfo?: string;
  stderr?: string;
}

async function runSingleTestCase(
  compiler: string,
  code: string,
  input: string,
  expected: string,
  language: string,
  signature?: ProblemSignature | null
): Promise<SingleTestResult> {
  let codeToSend = code;
  if (language === 'java') {
    codeToSend = code.replace(/\bpublic\s+class\b/g, 'class');
  }

  try {
    const res = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compiler,
        code: codeToSend,
        stdin: input,
      }),
    });

    if (!res.ok) {
      throw new Error(`Execution server responded with status ${res.status}`);
    }

    const data = await res.json();
    const rawStatus = String(data.status ?? '0');
    const signal = data.signal || null;
    const stdout = data.program_output || '';
    const stderr = data.program_error || '';
    const compileStderr = data.compiler_error || data.compiler_message || '';
    const exitCode = rawStatus !== '' ? parseInt(rawStatus, 10) : 0;

    // 1. Compilation Error
    if (compileStderr && exitCode !== 0 && !stdout) {
      return {
        status: 'COMPILATION_ERROR',
        input,
        expectedOutput: expected,
        actualOutput: '',
        passed: false,
        stderr: compileStderr,
      };
    }
    // 2. Time Limit Exceeded
    if (signal === 'SIGKILL' || (stderr && stderr.toLowerCase().includes('time limit exceeded'))) {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        input,
        expectedOutput: expected,
        actualOutput: stdout,
        passed: false,
        stderr,
      };
    }
    // 3. Runtime Error
    if (signal || (!isNaN(exitCode) && exitCode !== 0)) {
      return {
        status: 'RUNTIME_ERROR',
        input,
        expectedOutput: expected,
        actualOutput: stdout,
        passed: false,
        stderr: stderr || `Exited with code ${exitCode}`,
      };
    }

    // 4. Universal Output Contract Validation
    const capturedState = parseHarnessCapturedState(stdout);
    const validation = validateContract(signature, capturedState, expected);

    if (validation.passed) {
      return {
        status: 'PASSED',
        input,
        expectedOutput: validation.expectedFormatted,
        actualOutput: validation.actualFormatted,
        passed: true,
      };
    } else {
      return {
        status: 'WRONG_ANSWER',
        input,
        expectedOutput: validation.expectedFormatted,
        actualOutput: validation.actualFormatted,
        passed: false,
        mismatchInfo: validation.mismatchInfo || `Expected ${validation.expectedFormatted}, got ${validation.actualFormatted}`,
      };
    }
  } catch (err: any) {
    return {
      status: 'RUNTIME_ERROR',
      input,
      expectedOutput: expected,
      actualOutput: '',
      passed: false,
      stderr: err?.message || 'Execution request failed',
    };
  }
}

export interface JudgeService {
  execute(request: CodeExecutionRequest): Promise<CodeExecutionResult>;
}

export const judgeService: JudgeService = {
  async execute(request) {
    const startTime = Date.now();
    let { language, sourceCode, testCases, problemId } = request;

    if (!testCases || testCases.length === 0) {
      return {
        status: 'ACCEPTED',
        passedTests: 0,
        totalTests: 0,
        runtimeOutput: JSON.stringify([]),
      };
    }

    let mode: 'leetcode_function' | 'custom_program' = 'custom_program';
    let signatureLookupTime = 0;
    let signature: ProblemSignature | null = null;

    if (problemId) {
      const sigStart = Date.now();
      signature = getCachedProblemSignature(problemId);
      if (!signature) {
        try {
          const { createAdminClient } = await import('@/lib/supabase/server');
          const adminClient = await createAdminClient();
          const { data: problem } = await adminClient
            .from('coding_problems')
            .select('signature')
            .eq('id', problemId)
            .single();

          if (problem && problem.signature) {
            signature = problem.signature;
            setCachedProblemSignature(problemId, signature);
          }
        } catch (err) {
          console.error('Error loading problem signature in judge service:', err);
        }
      }
      signatureLookupTime = Date.now() - sigStart;

      if (signature) {
        const userHasMain = hasMainFunction(sourceCode, language);
        if (!userHasMain) {
          mode = 'leetcode_function';
          sourceCode = wrapCodeWithHarness(sourceCode, signature, language);
        }
      }
    }

    const compiler = WANDBOX_COMPILERS[language] || 'gcc-head';

    // Run testcases cleanly and concurrently for accurate evaluation
    const tc1 = testCases[0];
    const res1 = await runSingleTestCase(compiler, sourceCode, tc1.input, tc1.expectedOutput, language, signature);

    if (res1.status === 'COMPILATION_ERROR') {
      const allResults: SingleTestResult[] = testCases.map((tc, idx) => {
        if (idx === 0) return res1;
        return {
          status: 'COMPILATION_ERROR',
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: '',
          passed: false,
        };
      });
      return {
        status: 'COMPILATION_ERROR',
        passedTests: 0,
        totalTests: testCases.length,
        compilerOutput: res1.stderr,
        runtimeOutput: JSON.stringify(allResults),
      };
    }

    const restPromises = testCases.slice(1).map((tc) =>
      runSingleTestCase(compiler, sourceCode, tc.input, tc.expectedOutput, language, signature)
    );
    const restResults = await Promise.all(restPromises);

    const allResults = [res1, ...restResults];
    const passedCount = allResults.filter(r => r.status === 'PASSED').length;

    let overallStatus: SubmissionStatus = 'ACCEPTED';
    const statuses = allResults.map(r => r.status);
    
    if (statuses.includes('COMPILATION_ERROR')) {
      overallStatus = 'COMPILATION_ERROR';
    } else if (statuses.includes('TIME_LIMIT_EXCEEDED')) {
      overallStatus = 'TIME_LIMIT_EXCEEDED';
    } else if (statuses.includes('RUNTIME_ERROR')) {
      overallStatus = 'RUNTIME_ERROR';
    } else if (statuses.includes('WRONG_ANSWER')) {
      overallStatus = 'WRONG_ANSWER';
    }

    const totalTime = Date.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CodeArena Perf] Mode: ${mode} (Parallel Fallback), SigLookup: ${signatureLookupTime}ms, Total: ${totalTime}ms`);
    }

    return {
      status: overallStatus,
      passedTests: passedCount,
      totalTests: testCases.length,
      compilerOutput: allResults.map(r => r.stderr || '').filter(Boolean).join('\n') || undefined,
      runtimeOutput: JSON.stringify(allResults),
    };
  },
};
