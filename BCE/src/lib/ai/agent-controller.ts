import { AGENT_TOOLS, AgentToolResult } from './agent-tools';
import { runSmartAgent, AgentChatMessage, AgentResponse } from './agent';
import { AgentPageContext } from './agent-context';
import { normalizeAgentRole, canUseTool, canAccessPage, requireAgentPermission, AppRole } from '@/lib/auth/agent-permissions';
import { resolveCourse, resolveDSASheet, resolveDSAProblem } from '@/lib/ai/entity-resolver';

export interface LatencyTelemetry {
  speech_final?: number;
  intent_detected?: number;
  tool_started?: number;
  entity_lookup_started?: number;
  entity_lookup_finished?: number;
  navigation_started?: number;
  response_started?: number;
  response_finished?: number;
  total_latency_ms?: number;
}

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
  user: { id: string } | null;
  userRole?: string | null;
  studentProfile?: any;
  prompt: string;
  history?: AgentChatMessage[];
  pageContext?: AgentPageContext;
  confirmedTool?: { toolName: string; args: any };
  sessionState?: AgentSessionState;
  timestamps?: {
    speech_final?: number;
  };
}

export interface AgentControllerResponse extends AgentResponse {
  sessionState?: AgentSessionState;
  verified?: boolean;
  status?: 'planned' | 'executing' | 'success' | 'failed' | 'verification_failed' | 'recovered';
  latencyMetrics?: LatencyTelemetry;
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
    const userRole: AppRole = normalizeAgentRole(input.userRole);
    const userId = input.user?.id || 'guest';

    // 1. Race Condition / Deduplication Protection
    const lockKey = `${userId}_${promptLower}`;
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
      const permCheck = requireAgentPermission(input.user, userRole, 'tool', toolName);
      if (!permCheck.allowed) {
        return {
          success: false,
          message: permCheck.reason || 'Please log in first. This section is available to authenticated users.',
          status: 'failed',
          sessionState: activeState
        };
      }

      if (AGENT_TOOLS[toolName]) {
        const result: AgentToolResult = await AGENT_TOOLS[toolName].execute(args, input.user || { id: 'guest' }, input.pageContext);
        const actions: Array<{ label: string; url: string; isExternal?: boolean }> = [];
        if (result.url && canAccessPage(userRole, result.url)) {
          actions.push({ label: 'Open Page', url: result.url });
        }
        if (result.externalUrl) {
          actions.push({ label: 'View External Link', url: result.externalUrl, isExternal: true });
        }

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
    const intentStart = Date.now();
    const fastPathResult = await this.resolveDeterministicIntent(promptLower, promptRaw, input.user, userRole, input.pageContext, activeState);
    if (fastPathResult) {
      const intentEnd = Date.now();
      fastPathResult.latencyMetrics = {
        speech_final: input.timestamps?.speech_final || startTime,
        intent_detected: intentStart,
        tool_started: intentStart,
        entity_lookup_started: intentStart,
        entity_lookup_finished: intentEnd,
        navigation_started: intentEnd,
        response_started: intentEnd,
        response_finished: intentEnd,
        total_latency_ms: intentEnd - startTime
      };
      console.log(`[AgentController] Fast-path executed in ${intentEnd - startTime}ms:`, fastPathResult.toolExecuted);
      actionLockMap.set(lockKey, { timestamp: Date.now(), result: fastPathResult });
      return fastPathResult;
    }

    // 4. LLM Intent & Tool Calling Fallback
    const llmResult = await runSmartAgent({
      user: input.user,
      userRole,
      studentProfile: input.studentProfile,
      prompt: promptRaw,
      history: input.history,
      pageContext: input.pageContext
    });

    const response = this.formatToolResult(llmResult.toolExecuted || 'agent', llmResult, activeState, userRole);
    const endTime = Date.now();
    response.latencyMetrics = {
      speech_final: input.timestamps?.speech_final || startTime,
      intent_detected: intentStart,
      tool_started: startTime,
      entity_lookup_started: startTime,
      entity_lookup_finished: endTime,
      navigation_started: endTime,
      response_started: endTime,
      response_finished: endTime,
      total_latency_ms: endTime - startTime
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
    user: { id: string } | null,
    userRole: AppRole,
    pageContext: any,
    sessionState: AgentSessionState
  ): Promise<AgentControllerResponse | null> {

    // Helper for executing tool if permission allowed
    const executeWithPermission = async (toolName: string, args: any = {}): Promise<AgentControllerResponse> => {
      const permCheck = requireAgentPermission(user, userRole, 'tool', toolName);
      if (!permCheck.allowed) {
        return {
          success: false,
          message: permCheck.reason || 'Please log in first. This section is available to authenticated users.',
          status: 'failed',
          sessionState
        };
      }

      if (!AGENT_TOOLS[toolName]) {
        return { success: false, message: 'Tool not found', status: 'failed', sessionState };
      }

      const res = await AGENT_TOOLS[toolName].execute(args, user || { id: 'guest' }, pageContext);
      return this.formatToolResult(toolName, res, sessionState, userRole);
    };

    // 0. Live Current-Page Content Queries ("isme kya hai?", "is page par kya hai?", "yaha kya likha hai?", "explain this page", "is page ka progress")
    const isCurrentPageQuery = /\b(isme|is\s+page|yaha|yahan|current\s+page|open\s+page|this\s+page)\b/i.test(promptLower) &&
                               /\b(kya|what|explain|progress|detail|details|info|padho|read|list|batao|dikhao)\b/i.test(promptLower);

    if (isCurrentPageQuery) {
      const live = pageContext?.liveContext;
      if (live) {
        const titleStr = live.pageTitle || live.currentEntity?.title || live.route;
        const headingsStr = live.visibleHeadings && live.visibleHeadings.length > 0 ? live.visibleHeadings.join(', ') : 'None';
        const textStr = live.visibleTextContent ? live.visibleTextContent : 'No extra details text visible.';
        const entityStr = live.currentEntity ? `Active Item: ${live.currentEntity.title} (${live.currentEntity.type})` : '';

        return {
          success: true,
          message: `📄 **Current Page**: ${titleStr} (\`${live.route}\`)\n\n` +
                   (entityStr ? `• **${entityStr}**\n` : '') +
                   `• **Visible Headings**: ${headingsStr}\n` +
                   `• **Page Summary**: ${textStr.slice(0, 350)}...\n\n` +
                   `Aap mujhse is page ki kisi specific detail ya problem par sawaal pooch sakte hain.`,
          status: 'success',
          toolExecuted: 'getCurrentPageContext',
          sessionState
        };
      }
    }

    // 0B. Dynamic Live Page Element Interaction & Operations ("click Submit", "Edit button dabao", "save karo", "cancel karo", "type test in search")
    const liveList = pageContext?.liveContext?.interactiveElementsList || [];
    const liveSummary = pageContext?.liveContext?.interactiveElements || [];

    // Explicit Click / Open / Edit / Save / Cancel / Delete / Submit Action Detection
    const clickMatch = promptLower.match(/^(?:click|open|press|tap)\s+(?:on\s+)?(?:the\s+)?(.+?)(?:\s+button|\s+card|\s+link|\s+tab)?$/i) ||
                       promptLower.match(/^(.+?)\s+(?:button|card|link|tab|option)\s*(?:dabao|click\s*karo|open\s*karo|press\s*karo)?$/i) ||
                       promptLower.match(/^(edit|save|cancel|delete|submit|close)\s*(?:karo|button|kardo)?$/i);

    if (clickMatch) {
      const targetQuery = clickMatch[1]?.trim() || promptLower;
      let actionType: 'click' | 'open' | 'edit' | 'save' | 'cancel' | 'delete' | 'submit' | 'close' = 'click';

      if (promptLower.includes('edit')) actionType = 'edit';
      else if (promptLower.includes('save') || promptLower.includes('submit')) actionType = 'save';
      else if (promptLower.includes('cancel')) actionType = 'cancel';
      else if (promptLower.includes('delete')) actionType = 'delete';
      else if (promptLower.includes('close')) actionType = 'close';
      else if (promptLower.includes('open')) actionType = 'open';

      // Check if target matches any visible element on screen
      const matchedElement = liveList.find((el: any) => {
        const textStr = (el.text || el.ariaLabel || el.title || '').toLowerCase();
        return textStr.includes(targetQuery.toLowerCase()) || targetQuery.toLowerCase().includes(textStr);
      }) || liveSummary.find((s: string) => s.toLowerCase().includes(targetQuery.toLowerCase()));

      if (matchedElement || ['save', 'submit', 'cancel', 'close', 'edit', 'delete'].includes(targetQuery.toLowerCase())) {
        const elementLabel = typeof matchedElement === 'string' ? matchedElement : (matchedElement?.text || targetQuery);
        return await executeWithPermission('interactWithPageElement', {
          actionType,
          targetText: elementLabel
        });
      }
    }

    // Type / Fill Input Detection ("type hello in search", "search me test daalo")
    const typeMatch = promptLower.match(/^(?:type|write|fill|enter|daalo|likho)\s+(.+?)\s+(?:in|into|me|par)\s+(.+)$/i) ||
                      promptLower.match(/^(?:in|me)\s+(.+?)\s+(?:field|input|search)\s+(?:type|write|enter|likho)\s+(.+)$/i);
    if (typeMatch) {
      const value = typeMatch[1]?.trim();
      const fieldLabel = typeMatch[2]?.trim();
      if (value && fieldLabel) {
        return await executeWithPermission('fillFormInput', {
          fieldLabel,
          value
        });
      }
    }

    // Scan Available Elements Intent ("what buttons are here?", "is page par kya kya click kar sakte hain?")
    if (/\b(what\s+can\s+i\s+click|buttons\s+dikhao|actionable\s+elements|show\s+buttons|elements\s+list)\b/i.test(promptLower)) {
      return await executeWithPermission('scanLivePageElements');
    }

    // A. Static Navigation Intents
    if (/\b(dashboard|home)\b/i.test(promptLower)) {
      return await executeWithPermission('openDashboard');
    }

    if (/\b(dsa|sheet|sheets|coding sheet)\b/i.test(promptLower) && !promptLower.includes('problem') && !promptLower.includes('create') && !promptLower.includes('banao') && !promptLower.includes('add')) {
      return await executeWithPermission('openDSASheets');
    }

    if (/\b(courses|course|subject|subjects)\b/i.test(promptLower) && !promptLower.includes('itw') && !promptLower.includes('dbms') && !promptLower.includes('java') && !promptLower.includes('python')) {
      return await executeWithPermission('openCourses');
    }

    if (/\b(profile|account)\b/i.test(promptLower)) {
      return await executeWithPermission('openProfile');
    }

    // A2. Named Course Navigation ("open DBMS", "DBMS course kholo", "DBMS wala course", "open DBMS course")
    const courseMatch = promptLower.match(/^(?:open\s+)?(.+?)\s+(?:course|subject)(?:\s+kholo|\s+open|\s+dikhao)?$/i) ||
                        promptLower.match(/^(?:open\s+)?(.+?)\s+wala\s+course(?:\s+kholo|\s+open)?$/i) ||
                        promptLower.match(/^(?:open\s+)?(dbms|itw|dsa|java|python|c\+\+|web dev|web development|operating system|computer networks)(?:\s+kholo|\s+open)?$/i);
    if (courseMatch) {
      const courseQuery = courseMatch[1]?.trim();
      if (courseQuery) {
        const res = await executeWithPermission('openCourse', { courseName: courseQuery });
        if (res.success && res.expectedEntity?.id) {
          sessionState.courseId = res.expectedEntity.id;
          sessionState.courseTitle = res.expectedEntity.title;
        }
        return res;
      }
    }

    // A3. Contextual Reference ("iska first module kholo", "first lesson kholo")
    const contextModuleMatch = promptLower.match(/\b(iska|is\s+course\s+ka)\s+(?:first|1st|pehla)\s+(module|lesson)\b/i);
    if (contextModuleMatch && sessionState.courseId) {
      const courseUrl = `/courses/${sessionState.courseId}`;
      return {
        success: true,
        message: `Opening Module 1 of ${sessionState.courseTitle || 'course'}...`,
        actions: [{ label: 'Open Page', url: courseUrl }],
        pendingNavigation: true,
        navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        expectedRoute: courseUrl,
        status: 'success',
        sessionState
      };
    }

    if (/\b(routine|schedule|timetable)\b/i.test(promptLower) && !promptLower.includes('bana')) {
      return await executeWithPermission('openRoutine');
    }

    if (/\b(goals|target|targets)\b/i.test(promptLower)) {
      return await executeWithPermission('openGoals');
    }

    // Notice & Announcement Intents ("notice read karo", "latest notice kya hai", "announcements dikhao")
    if (/\b(notice|notices|announcement|announcements)\b/i.test(promptLower)) {
      if (/\b(read|padho|kya|latest|dikhao|show|batao|check|get)\b/i.test(promptLower) || !promptLower.includes('kholo')) {
        return await executeWithPermission('getNotices');
      }
      return await executeWithPermission('openNotifications');
    }

    // Leaderboard & Rank Intents ("meri rank kya hai", "leaderboard rank read karo", "top rankers kaun hain")
    if (/\b(leaderboard|rank|rankings|position)\b/i.test(promptLower)) {
      if (/\b(read|kya|my|meri|top|check|batao|show|dikhao|kitni)\b/i.test(promptLower) || !promptLower.includes('kholo')) {
        return await executeWithPermission('getLeaderboardRank');
      }
      return await executeWithPermission('openLeaderboard');
    }

    // LaTeX Code & Resume Intents ("latex code edit karo", "resume me education section add karo", "latex format clean karo")
    if (/\b(latex|latex editor|resume template)\b/i.test(promptLower)) {
      if (/\b(edit|add|change|update|banao|insert|template|section|write|modify)\b/i.test(promptLower)) {
        const secMatch = promptRaw.match(/add\s+(.+?)\s+section/i) || promptRaw.match(/(.+?)\s+section\s+add/i);
        const sectionTitle = secMatch ? secMatch[1].trim() : undefined;
        return await executeWithPermission('editLatexCode', { sectionTitle });
      }
      if (/\b(read|show|dikhao|view|check)\b/i.test(promptLower)) {
        return await executeWithPermission('readLatexCode');
      }
      return await executeWithPermission('openLatexEditor', { problemId: sessionState.problemId });
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

      const res = await executeWithPermission('openDSAProblem', { problemIndex: targetNum, sheetId: sessionState.sheetId, problemId: sessionState.problemId });

      if (res.success && res.data?.number) {
        sessionState.problemNumber = res.data.number;
        sessionState.problemId = res.data.problemId;
        sessionState.problemTitle = res.data.problemTitle;
        if (res.data.sheetId) sessionState.sheetId = res.data.sheetId;
      }

      return res;
    }

    // C. Combined Sheet + Problem references ("Binary Search sheet ka Problem 5 kholo", "Blind 75 problem 3")
    const sheetProbMatch = promptLower.match(/^(?:open\s+)?(.+?)\s+(?:sheet|wala)?\s*(?:ka|ki|me|par)?\s*problem\s*(\d+)/i) ||
                           promptLower.match(/^(?:open\s+)?problem\s*(\d+)\s+(?:of|in|from)?\s*(.+?)\s*sheet/i);
    if (sheetProbMatch) {
      const sheetQuery = sheetProbMatch[1]?.trim();
      const problemIndex = parseInt(sheetProbMatch[2] || sheetProbMatch[1], 10);
      if (sheetQuery && !isNaN(problemIndex)) {
        const res = await executeWithPermission('openDSAProblem', { sheetQuery, problemIndex });
        if (res.success && res.data?.number) {
          sessionState.problemNumber = res.data.number;
          sessionState.problemId = res.data.problemId;
          sessionState.problemTitle = res.data.problemTitle;
          if (res.data.sheetId) sessionState.sheetId = res.data.sheetId;
        }
        return res;
      }
    }

    // D. Direct Problem Number Navigation ("Problem 5 kholo", "problem 4", "p5")
    const probNumMatch = promptLower.match(/^(?:open\s+)?(?:problem|p)\s*(\d+)(?:\s+kholo|\s+open)?$/i) ||
                         promptLower.match(/^(\d+)(?:st|nd|rd|th)?\s+problem(?:\s+kholo|\s+open)?$/i);
    if (probNumMatch) {
      const targetNum = parseInt(probNumMatch[1], 10);
      if (!isNaN(targetNum)) {
        const res = await executeWithPermission('openDSAProblem', { problemIndex: targetNum, sheetId: sessionState.sheetId, problemId: sessionState.problemId });
        if (res.success && res.data?.number) {
          sessionState.problemNumber = res.data.number;
          sessionState.problemId = res.data.problemId;
          sessionState.problemTitle = res.data.problemTitle;
          if (res.data.sheetId) sessionState.sheetId = res.data.sheetId;
        }
        return res;
      }
    }

    // E. Named Sheet Navigation ("Binary Search sheet kholo", "Blind 75 kholo")
    const sheetMatch = promptLower.match(/^(?:open\s+)?(.+?)\s+sheet(?:\s+kholo|\s+open)?$/i);
    if (sheetMatch) {
      const titleQuery = sheetMatch[1].trim();
      const res = await executeWithPermission('openDSASheet', { titleQuery });
      if (res.success && res.expectedEntity?.id) {
        sessionState.sheetId = res.expectedEntity.id;
        sessionState.sheetTitle = res.expectedEntity.title;
      }
      return res;
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

    // G. Create Sheet ("Advanced Graph sheet banao", "create DSA sheet named DP")
    const createSheetMatch = promptLower.match(/^(?:create|make|banao|bana\s+do)?\s*(.+?)\s+sheet(?:\s+banao|\s+bana\s+do|\s+create)?$/i) ||
                             promptLower.match(/^(?:create\s+sheet|banao\s+sheet)\s+(.+)$/i);
    if (createSheetMatch && (promptLower.includes('banao') || promptLower.includes('create') || promptLower.includes('make') || promptLower.includes('bana'))) {
      const sheetName = createSheetMatch[1].replace(/^(create|make|banao|bana\s+do|dsa|coding)\s+/gi, '').trim();
      if (sheetName) {
        const res = await executeWithPermission('createCodingSheet', { title: sheetName });
        if (res.success && res.data?.sheetId) {
          sessionState.sheetId = res.data.sheetId;
          sessionState.sheetTitle = res.data.sheetTitle || sheetName;
        }
        return res;
      }
    }

    // H. Add Problems to Sheet ("isme Binary Search ke problems add karo", "add binary search questions")
    const isAddProbIntent = (promptLower.includes('add') || promptLower.includes('daalo') || promptLower.includes('daal')) &&
                            (promptLower.includes('problem') || promptLower.includes('sawal') || promptLower.includes('question'));
    if (isAddProbIntent) {
      const topicMatch = promptLower.match(/(?:binary search|arrays?|strings?|linked list|trees?|graphs?|dp|dynamic programming|sorting|math)/i);
      const topicQuery = topicMatch ? topicMatch[0] : 'Binary Search';
      const res = await executeWithPermission('addProblemsToSheet', { sheetId: sessionState.sheetId, topicQuery });
      return res;
    }

    // I. Hint Request ("iska hint do", "give me a hint", "hint chahiye")
    const isHintIntent = /\b(hint|hints|ishara|clue)\b/i.test(promptLower);
    if (isHintIntent) {
      const activeTitle = sessionState.problemTitle || pageContext?.problemTitle || (
        pageContext?.liveContext?.currentEntity?.type === 'problem' ? pageContext?.liveContext?.currentEntity?.title : null
      );
      if (activeTitle) {
        return {
          success: true,
          message: `💡 **Hint for ${activeTitle}**:\n\n1. Pehle input values aur constraints ko analyze karo.\n2. Brute force approach se $O(N^2)$ ho sakta hai, kya aap Hash Map ya Binary Search apply karke $O(N \\log N)$ ya $O(N)$ achieve kar sakte hain?\n3. Dry run with a small sample input before writing code.`,
          actions: [
            { label: 'Search YouTube Solution', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(activeTitle + ' DSA hint')}`, isExternal: true }
          ],
          status: 'success',
          sessionState
        };
      }
    }

    // J. Safe SQL Query Execution ("SQL query run karo", "select average salary from employees")
    if (promptLower.includes('sql') && (promptLower.includes('run') || promptLower.includes('execute') || promptLower.includes('select') || promptLower.includes('query'))) {
      const sqlMatch = promptRaw.match(/SELECT\s+[\s\S]+/i);
      const queryStr = sqlMatch ? sqlMatch[0] : 'SELECT department, AVG(salary) FROM employees GROUP BY department;';
      const res = await executeWithPermission('runSafeSQLQuery', { query: queryStr });
      return res;
    }

    return null; // Not resolved by fast-path, delegate to LLM
  }

  private static formatToolResult(
    toolName: string,
    result: AgentToolResult,
    sessionState: AgentSessionState,
    userRole: AppRole = 'student'
  ): AgentControllerResponse {
    if (result.data) {
      if (result.data.sheetId) sessionState.sheetId = result.data.sheetId;
      if (result.data.sheetTitle) sessionState.sheetTitle = result.data.sheetTitle;
      if (result.data.problemId) sessionState.problemId = result.data.problemId;
      if (result.data.problemTitle) sessionState.problemTitle = result.data.problemTitle;
      if (result.data.number) sessionState.problemNumber = result.data.number;
    }
    if (result.expectedEntity) {
      if (result.expectedEntity.type === 'problem') {
        if (result.expectedEntity.id) sessionState.problemId = result.expectedEntity.id;
        if (result.expectedEntity.title) sessionState.problemTitle = result.expectedEntity.title;
        if (result.expectedEntity.number) sessionState.problemNumber = result.expectedEntity.number;
      }
      if (result.expectedEntity.type === 'sheet') {
        if (result.expectedEntity.id) sessionState.sheetId = result.expectedEntity.id;
        if (result.expectedEntity.title) sessionState.sheetTitle = result.expectedEntity.title;
      }
    }

    const actions: Array<{ label: string; url: string; isExternal?: boolean }> = [];
    if (result.url && canAccessPage(userRole, result.url)) {
      actions.push({ label: 'Open Page', url: result.url });
    }
    if (result.externalUrl) {
      actions.push({ label: 'View External Link', url: result.externalUrl, isExternal: true });
    }

    return {
      success: result.success,
      message: result.message,
      actions: actions.length > 0 ? actions : undefined,
      toolExecuted: toolName,
      pendingNavigation: result.pendingNavigation ?? (result.url ? true : false),
      navigationId: result.navigationId || (result.url ? `nav_${Date.now()}_${Math.random().toString(36).substring(7)}` : undefined),
      expectedRoute: result.expectedRoute || result.url,
      expectedEntity: result.expectedEntity,
      successMessage: result.successMessage || result.message,
      status: result.success ? 'success' : 'failed',
      sessionState
    };
  }
}
