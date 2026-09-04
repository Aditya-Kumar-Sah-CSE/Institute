export const CODE_LANGUAGES = ['cpp17', 'c', 'java', 'python', 'javascript', 'html'] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];
export type CodingDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type SubmissionStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'SYSTEM_ERROR';

export type ExecutionStatus =
  | 'SUCCESS'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'SYSTEM_ERROR';

export type NormalizedExecutionResult = {
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  compileStdout: string;
  compileStderr: string;
  exitCode: number | null;
  signal: string | null;
  executionTimeMs: number | null;
  memoryUsedMb: number | null;
  message: string | null;
};

export interface CodeExecutionRequest {
  problemId?: string;
  language: CodeLanguage;
  sourceCode: string;
  testCases: { input: string; expectedOutput: string }[];
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface CodeExecutionResult {
  status: SubmissionStatus;
  passedTests: number;
  totalTests: number;
  executionTimeMs?: number;
  memoryUsedMb?: number;
  compilerOutput?: string;
  runtimeOutput?: string;
}

export type ContractType =
  | 'return_value'
  | 'mutated_parameter'
  | 'return_and_mutation'
  | 'custom_evaluator';

export type OrderingRequirement = 'exact' | 'unordered' | 'sorted' | 'unordered_groups';

export interface OutputContract {
  type: ContractType;
  targetParam?: string | number;
  lengthRef?: 'return_value' | number | string;
  ordering?: OrderingRequirement;
  floatTolerance?: number;
}

export interface ProblemSignature {
  name: string;
  params: {
    name: string;
    type: string;
    mutated?: boolean;
  }[];
  return: {
    type: string;
  };
  outputContract?: OutputContract;
}

