import { AGENT_TOOLS, AgentToolResult } from './agent-tools';
import { runSmartAgent, AgentChatMessage, AgentResponse } from './agent';
import { AgentPageContext } from './agent-context';

export interface AgentSessionState {
  route: string;
  pageType?: string;
  sheetId?: string;
  sheetTitle?: string;
  problemId?: string;
  problemTitle?: string;
  problemNumber?: number;
  courseId?: string;
  courseTitle?: string;
  lastAction?: string;
  lastActionResult?: any;
  lastTimestamp?: number;
  pendingTask?: string;
}

export interface AgentRequestInput {
  user: { id: string };
  studentProfile?: any;
  prompt: string;
  history?: AgentChatMessage[];
  pageContext?: AgentPageContext;
  confirmedTool?: { toolName: string; args: any };
  sessionState?: AgentSessionState;
}

export interface AgentControllerResponse extends AgentResponse {
  sessionState?: AgentSessionState;
  verified?: boolean;
  status?: 'planned' | 'executing' | 'success' | 'failed' | 'verification_failed' | 'recovered';
}

// In-memory deduplication cache for race condition protection
const actionLockMap = new Map<string, { timestamp: number; result: AgentControllerResponse }>();
const DEDUP_WINDOW_MS = 1500;

export class AgentController {
  /**
   * Central entrypoint processing user requests deterministically & fast.
   */
  public static async processRequest(input: AgentRequestInput): Promise<AgentControllerResponse> {
    const startTime = Date.now();
    const promptRaw = (input.prompt || '').trim();
    const promptLower = promptRaw.toLowerCase();

    // 1. Race Condition / Deduplication Protection
    const lockKey = `${input.user.id}_${promptLower}`;
    const existingLock = actionLockMap.get(lockKey);
    if (existingLock && (Date.now() - existingLock.timestamp < DEDUP_WINDOW_MS)) {
      console.log('[AgentController] Action request deduplicated:', promptRaw);
      return existingLock.result;
    }

    // Update active session state from input pageContext
    const activeState: AgentSessionState = {
      route: input.pageContext?.route || input.sessionState?.route || '/dashboard',
      sheetId: input.pageContext?.liveContext?.currentEntity?.type === 'sheet'
        ? input.pageContext.liveContext.currentEntity.id
        : input.sessionState?.sheetId,
      sheetTitle: input.pageContext?.liveContext?.currentEntity?.type === 'sheet'
        ? input.pageContext.liveContext.currentEntity.title
        : input.sessionState?.sheetTitle,
      problemId: input.pageContext?.problemId || (
        input.pageContext?.liveContext?.currentEntity?.type === 'problem'
          ? input.pageContext.liveContext.currentEntity.id
          : input.sessionState?.problemId
      ),
      problemTitle: input.pageContext?.problemTitle || (
        input.pageContext?.liveContext?.currentEntity?.type === 'problem'
          ? input.pageContext.liveContext.currentEntity.title
          : input.sessionState?.problemTitle
      ),
      problemNumber: input.sessionState?.problemNumber,
      courseId: input.pageContext?.courseId || input.sessionState?.courseId,
      courseTitle: input.pageContext?.courseTitle || input.sessionState?.courseTitle,
      ...input.sessionState
    };

    // 2. High-Risk User Confirmed Tool Execution
    if (input.confirmedTool) {
      const { toolName, args } = input.confirmedTool;
      if (AGENT_TOOLS[toolName]) {
        const result: AgentToolResult = await AGENT_TOOLS[toolName].execute(args, input.user, input.pageContext);
        const actions: Array<{ label: string; url: string; isExternal?: boolean }> = [];
        if (result.url) actions.push({ label: 'Open Page', url: result.url });
        if (result.externalUrl) actions.push({ label: 'View External Link', url: result.externalUrl, isExternal: true });

        const resp: AgentControllerResponse = {
          success: result.success,
          message: result.message,
          actions: actions.length > 0 ? actions : undefined,
          toolExecuted: toolName,
          pendingNavigation: result.pendingNavigation,
          navigationId: result.navigationId,
          expectedRoute: result.expectedRoute,
          expectedEntity: result.expectedEntity,
          successMessage: result.successMessage,
          status: result.success ? 'success' : 'failed',
          sessionState: activeState
        };
        actionLockMap.set(lockKey, { timestamp: Date.now(), result: resp });
        return resp;
      }
    }

    // 3. Fast-Path Deterministic Intent Resolution
    const fastPathResult = await this.resolveDeterministicIntent(promptLower, promptRaw, input.user, input.pageContext, activeState);
    if (fastPathResult) {
      console.log(`[AgentController] Fast-path executed in ${Date.now() - startTime}ms:`, fastPathResult.toolExecuted);
      actionLockMap.set(lockKey, { timestamp: Date.now(), result: fastPathResult });
      return fastPathResult;
    }

    // 4. LLM Intent & Tool Calling Fallback
    const llmResult = await runSmartAgent({
      user: input.user,
      studentProfile: (input as any).studentProfile || { userId: input.user.id },
      prompt: promptRaw,
      history: input.history,
      pageContext: input.pageContext
    });

    const response: AgentControllerResponse = {
      ...llmResult,
      status: llmResult.success ? 'success' : 'failed',
      sessionState: activeState
    };

    actionLockMap.set(lockKey, { timestamp: Date.now(), result: response });
    return response;
  }

  /**
   * Deterministically resolves & executes high-frequency user commands without LLM overhead.
   */
  private static async resolveDeterministicIntent(
    promptLower: string,
    promptRaw: string,
    user: { id: string },
    pageContext: any,
    sessionState: AgentSessionState
  ): Promise<AgentControllerResponse | null> {

    // A. Static Navigation Intents
    if (/^(dashboard|home|main page|home page|dashboard kholo|open dashboard|open home)$/i.test(promptLower)) {
      const res = await AGENT_TOOLS.openDashboard.execute({}, user, pageContext);
      return this.formatToolResult('openDashboard', res, sessionState);
    }

    if (/^(courses|courses catalog|all courses|courses kholo|browse courses|open courses|sabhi courses)$/i.test(promptLower)) {
      const res = await AGENT_TOOLS.openCourses.execute({}, user, pageContext);
      return this.formatToolResult('openCourses', res, sessionState);
    }

    if (/^(my courses|enrolled courses|mere courses|my course kholo)$/i.test(promptLower)) {
      const res = await AGENT_TOOLS.openMyCourses.execute({}, user, pageContext);
      return this.formatToolResult('openMyCourses', res, sessionState);
    }

    if (/^(dsa|dsa sheet|dsa sheets|coding sheets|dsa kholo|open dsa|dsa sheet kholo)$/i.test(promptLower)) {
      const res = await AGENT_TOOLS.openDSASheets.execute({}, user, pageContext);
      return this.formatToolResult('openDSASheets', res, sessionState);
    }

    if (/^(profile|my profile|user profile|meri profile|account|my account)$/i.test(promptLower)) {
      const res = await AGENT_TOOLS.openProfile.execute({}, user, pageContext);
      return this.formatToolResult('openProfile', res, sessionState);
    }

    if (/^(routine|my routine|schedule|mera routine|routine kholo|kal ki routine)$/i.test(promptLower)) {
      const res = await AGENT_TOOLS.openRoutine.execute({}, user, pageContext);
      return this.formatToolResult('openRoutine', res, sessionState);
    }

    if (/^(goals|my goals|mere goals|goals kholo)$/i.test(promptLower)) {
      const res = await AGENT_TOOLS.openGoals.execute({}, user, pageContext);
      return this.formatToolResult('openGoals', res, sessionState);
    }

    if (/^(latex|latex editor|latex kholo|notes editor)$/i.test(promptLower)) {
      const res = await AGENT_TOOLS.openLatexEditor.execute({ problemId: sessionState.problemId }, user, pageContext);
      return this.formatToolResult('openLatexEditor', res, sessionState);
    }

    if (/^(leaderboard|rank|leaderboard kholo)$/i.test(promptLower)) {
      const res = await AGENT_TOOLS.openLeaderboard.execute({}, user, pageContext);
      return this.formatToolResult('openLeaderboard', res, sessionState);
    }

    // B. Relative / Sequential Problem Navigation ("next problem", "previous problem")
    const isNext = /\b(next|agli|agla|aage)\b/i.test(promptLower) && /\b(problem|wala|question|kholo|open)\b/i.test(promptLower);
    const isPrev = /\b(previous|pichli|pichla|prev|back|piche)\b/i.test(promptLower) && /\b(problem|wala|question|kholo|open)\b/i.test(promptLower);

    if (isNext || isPrev) {
      const currentNum = sessionState.problemNumber || (
        pageContext?.liveContext?.currentEntity?.type === 'problem' && pageContext?.liveContext?.currentEntity?.metadata?.number
      ) || 1;

      const targetNum = isNext ? currentNum + 1 : Math.max(1, currentNum - 1);

      if (!isNext && currentNum <= 1) {
        return {
          success: true,
          message: 'Pehla problem (Problem 1) already open hai.',
          status: 'success',
          sessionState
        };
      }

      const res = await AGENT_TOOLS.openDSAProblem.execute(
        { problemIndex: targetNum, sheetId: sessionState.sheetId, problemId: sessionState.problemId },
        user,
        pageContext
      );

      if (res.success && res.data?.number) {
        sessionState.problemNumber = res.data.number;
        sessionState.problemId = res.data.problemId;
        sessionState.problemTitle = res.data.problemTitle;
        if (res.data.sheetId) sessionState.sheetId = res.data.sheetId;
      }

      return this.formatToolResult('openDSAProblem', res, sessionState);
    }

    // C. Combined Sheet + Problem references ("Binary Search sheet ka Problem 5 kholo", "Blind 75 problem 3")
    const sheetProbMatch = promptLower.match(/^(?:open\s+)?(.+?)\s+(?:sheet|wala)?\s*(?:ka|ki|me|par)?\s*problem\s*(\d+)/i) ||
                           promptLower.match(/^(?:open\s+)?problem\s*(\d+)\s+(?:of|in|from)?\s*(.+?)\s*sheet/i);
    if (sheetProbMatch) {
      const sheetQuery = sheetProbMatch[1]?.trim();
      const problemIndex = parseInt(sheetProbMatch[2] || sheetProbMatch[1], 10);
      if (sheetQuery && !isNaN(problemIndex)) {
        const res = await AGENT_TOOLS.openDSAProblem.execute(
          { sheetQuery, problemIndex },
          user,
          pageContext
        );
        if (res.success && res.data?.number) {
          sessionState.problemNumber = res.data.number;
          sessionState.problemId = res.data.problemId;
          sessionState.problemTitle = res.data.problemTitle;
          if (res.data.sheetId) sessionState.sheetId = res.data.sheetId;
        }
        return this.formatToolResult('openDSAProblem', res, sessionState);
      }
    }

    // D. Direct Problem Number Navigation ("Problem 5 kholo", "problem 4", "p5")
    const probNumMatch = promptLower.match(/^(?:open\s+)?(?:problem|p)\s*(\d+)(?:\s+kholo|\s+open)?$/i) ||
                         promptLower.match(/^(\d+)(?:st|nd|rd|th)?\s+problem(?:\s+kholo|\s+open)?$/i);
    if (probNumMatch) {
      const targetNum = parseInt(probNumMatch[1], 10);
      if (!isNaN(targetNum)) {
        const res = await AGENT_TOOLS.openDSAProblem.execute(
          { problemIndex: targetNum, sheetId: sessionState.sheetId, problemId: sessionState.problemId },
          user,
          pageContext
        );
        if (res.success && res.data?.number) {
          sessionState.problemNumber = res.data.number;
          sessionState.problemId = res.data.problemId;
          sessionState.problemTitle = res.data.problemTitle;
          if (res.data.sheetId) sessionState.sheetId = res.data.sheetId;
        }
        return this.formatToolResult('openDSAProblem', res, sessionState);
      }
    }

    // E. Named Sheet Navigation ("Binary Search sheet kholo", "Blind 75 kholo")
    const sheetMatch = promptLower.match(/^(?:open\s+)?(.+?)\s+sheet(?:\s+kholo|\s+open)?$/i);
    if (sheetMatch) {
      const titleQuery = sheetMatch[1].trim();
      const res = await AGENT_TOOLS.openDSASheet.execute({ titleQuery }, user, pageContext);
      if (res.success && res.expectedEntity?.id) {
        sessionState.sheetId = res.expectedEntity.id;
        sessionState.sheetTitle = res.expectedEntity.title;
      }
      return this.formatToolResult('openDSASheet', res, sessionState);
    }

    // F. Problem Explanation / Solution Approach ("isko solve kaise karna hai?", "explain solution", "approach samjhao")
    const isSolveIntent = /\b(solve|approach|samjhao|solution|samjhau|kaise karun|kaise kare|kaise karna|explain|logic)\b/i.test(promptLower);
    if (isSolveIntent) {
      const activeTitle = sessionState.problemTitle || pageContext?.problemTitle || (
        pageContext?.liveContext?.currentEntity?.type === 'problem' ? pageContext?.liveContext?.currentEntity?.title : null
      );
      if (activeTitle) {
        return {
          success: true,
          message: `Problem **${activeTitle}** solve karne ka standard approach:\n\n1. **Problem Statement & Input Analysis**: Target constraints and edge cases check karo.\n2. **Optimal Strategy**: Brute force se behtar time complexity calculate karo (e.g. Hash Table / Two Pointers / Binary Search).\n3. **Implementation**: Code Arena editor me clean code write karke Test Cases run karo.\n\nKya main YouTube par is problem solution ka video search karun?`,
          actions: [
            { label: 'Search YouTube Solution', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(activeTitle + ' DSA solution')}`, isExternal: true },
            { label: 'Open LaTeX Editor', url: sessionState.problemId ? `/latex-editor?problemId=${sessionState.problemId}` : '/latex-editor' }
          ],
          status: 'success',
          sessionState
        };
      }
    }

    return null; // Not resolved by fast-path, delegate to LLM
  }

  private static formatToolResult(
    toolName: string,
    result: AgentToolResult,
    sessionState: AgentSessionState
  ): AgentControllerResponse {
    const actions: Array<{ label: string; url: string; isExternal?: boolean }> = [];
    if (result.url) actions.push({ label: 'Open Page', url: result.url });
    if (result.externalUrl) actions.push({ label: 'View External Link', url: result.externalUrl, isExternal: true });

    return {
      success: result.success,
      message: result.message,
      actions: actions.length > 0 ? actions : undefined,
      toolExecuted: toolName,
      pendingNavigation: result.pendingNavigation,
      navigationId: result.navigationId,
      expectedRoute: result.expectedRoute,
      expectedEntity: result.expectedEntity,
      successMessage: result.successMessage || result.message,
      status: result.success ? 'success' : 'failed',
      sessionState
    };
  }
}
