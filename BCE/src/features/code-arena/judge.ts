import type { CodeExecutionRequest, CodeExecutionResult, SubmissionStatus } from './types';
import { wrapCodeWithHarness, hasMainFunction } from './harness';

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

function normalizeOutput(str: string): string {
  if (!str) return '';
  return str
    .replace(/\r\n/g, '\n') // Normalize newlines
    .split('\n')
    .map(line => line.trimEnd()) // Trim trailing spaces per line
    .join('\n')
    .trim(); // Trim starting/trailing newlines
}

function getMismatchInfo(expected: string, actual: string): string | null {
  const normExpected = normalizeOutput(expected);
  const normActual = normalizeOutput(actual);
  if (normExpected === normActual) return null;

  const expTokens = normExpected.split(/\s+/).filter(Boolean);
  const actTokens = normActual.split(/\s+/).filter(Boolean);

  const maxLen = Math.max(expTokens.length, actTokens.length);
  for (let i = 0; i < maxLen; i++) {
    const exp = expTokens[i];
    const act = actTokens[i];
    if (exp !== act) {
      const pos = i + 1; // 1-based token position
      const expectedStr = exp !== undefined ? exp : '<EOF>';
      const actualStr = act !== undefined ? act : '<EOF>';
      return `Mismatch at position ${pos}: expected ${expectedStr}, got ${actualStr}`;
    }
  }
  return 'Wrong Answer';
}

interface SingleTestResult {
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
  language: string
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

    // 4. Compare Outputs
    const mismatch = getMismatchInfo(expected, stdout);
    if (mismatch === null) {
      return {
        status: 'PASSED',
        input,
        expectedOutput: expected,
        actualOutput: stdout,
        passed: true,
      };
    } else {
      return {
        status: 'WRONG_ANSWER',
        input,
        expectedOutput: expected,
        actualOutput: stdout,
        passed: false,
        mismatchInfo: mismatch,
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

    if (problemId) {
      try {
        const { createAdminClient } = await import('@/lib/supabase/server');
        const adminClient = await createAdminClient();
        const { data: problem } = await adminClient
          .from('coding_problems')
          .select('source_type, external_platform, signature')
          .eq('id', problemId)
          .single();

        if (problem && problem.signature) {
          const userHasMain = hasMainFunction(sourceCode, language);
          if (!userHasMain) {
            mode = 'leetcode_function';
            sourceCode = wrapCodeWithHarness(sourceCode, problem.signature, language);
          }
        }
      } catch (err) {
        console.error('Error loading problem signature in judge service:', err);
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[JUDGE DEBUG]', {
        mode,
        language,
        problemId,
        testCasesCount: testCases.length,
        sourceCodeSnippet: sourceCode.slice(0, 150) + '...',
      });
    }

    const compiler = WANDBOX_COMPILERS[language] || 'gcc-head';

    // Step 1: Run the first test case to fail fast on Compilation Errors.
    const tc1 = testCases[0];
    const res1 = await runSingleTestCase(compiler, sourceCode, tc1.input, tc1.expectedOutput, language);

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

    // Step 2: Run all remaining test cases concurrently.
    const restPromises = testCases.slice(1).map(tc =>
      runSingleTestCase(compiler, sourceCode, tc.input, tc.expectedOutput, language)
    );
    const restResults = await Promise.all(restPromises);

    const allResults = [res1, ...restResults];
    const passedCount = allResults.filter(r => r.status === 'PASSED').length;

    // Determine the overall status based on checklist precedence.
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

    return {
      status: overallStatus,
      passedTests: passedCount,
      totalTests: testCases.length,
      compilerOutput: allResults.map(r => r.stderr || '').filter(Boolean).join('\n') || undefined,
      runtimeOutput: JSON.stringify(allResults),
    };
  },
};
