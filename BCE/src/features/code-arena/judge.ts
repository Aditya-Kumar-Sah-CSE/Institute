import type { CodeExecutionRequest, CodeExecutionResult } from './types';

/**
 * Deliberately non-executing judge boundary. A remote sandboxed worker should replace this
 * implementation; submitted code is never evaluated by the Next.js process.
 */
export interface JudgeService {
  execute(request: CodeExecutionRequest): Promise<CodeExecutionResult>;
}

export const judgeService: JudgeService = {
  async execute(request) {
    return {
      status: 'QUEUED',
      passedTests: 0,
      totalTests: request.testCases.length,
      runtimeOutput: 'Queued for the external judge worker. Code execution is not enabled on this application server.',
    };
  },
};
