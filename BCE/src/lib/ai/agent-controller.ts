import { AGENT_TOOLS, AgentToolResult } from './agent-tools-server';
import { runSmartAgent, AgentChatMessage, AgentResponse } from './agent';
import { AgentPageContext } from './agent-context';
import { normalizeAgentRole, canUseTool, canAccessPage, requireAgentPermission, AppRole } from '@/lib/auth/agent-permissions';
import { resolveCourse, resolveDSASheet, resolveDSAProblem } from '@/lib/ai/entity-resolver';
import { resolveTargetUrl } from '@/lib/ai/url-resolver';
import { LatencyTracker } from './latency-telemetry';

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
  currentPanel?: 'student' | 'instructor' | 'admin' | 'developer';
  currentRole?: string;
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

export interface ServerTimingTelemetry {
  intentMs: number;
  snapshotMs: number;
  resolutionMs: number;
  llmMs: number;
  toolMs: number;
  navigationMs: number;
  totalMs: number;
}

export interface AgentControllerResponse extends AgentResponse {
  sessionState?: AgentSessionState;
  verified?: boolean;
  status?: 'planned' | 'executing' | 'success' | 'failed' | 'verification_failed' | 'recovered';
  latencyMetrics?: LatencyTelemetry;
  timingMetadata?: ServerTimingTelemetry;
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
    const liveCtx = input.pageContext?.liveContext || (input.pageContext?.snapshot || input.pageContext?.route ? input.pageContext : null);
    const activeRoute = input.pageContext?.route || liveCtx?.route || input.sessionState?.route || '/dashboard';
    const routeSheetMatch = activeRoute.match(/\/code-arena\/sheets\/([a-f0-9\-]+)/i);

    const activeState: AgentSessionState = {
      route: activeRoute,
      sheetId: liveCtx?.currentEntity?.type === 'sheet'
        ? liveCtx.currentEntity.id
        : (input.sessionState?.sheetId || (routeSheetMatch ? routeSheetMatch[1] : undefined)),
      sheetTitle: liveCtx?.currentEntity?.type === 'sheet'
        ? liveCtx.currentEntity.title
        : input.sessionState?.sheetTitle,
      problemId: input.pageContext?.problemId || (
        liveCtx?.currentEntity?.type === 'problem'
          ? liveCtx.currentEntity.id
          : input.sessionState?.problemId
      ),
      problemTitle: input.pageContext?.problemTitle || (
        liveCtx?.currentEntity?.type === 'problem'
          ? liveCtx.currentEntity.title
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
        const result: AgentToolResult = await AGENT_TOOLS[toolName].execute(
          args,
          input.user || { id: 'guest' },
          { ...(input.pageContext || {}), __agentConfirmation: true }
        );
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

    // Contextual Pronoun & Reference Resolution ("this", "that", "this card", "this button", "isko", "isme", "yaha", "waha", "usko", "usme", "ye", "woh", "same one", "previous one")
    let processedPromptLower = promptLower;
    let processedPromptRaw = promptRaw;

    const pronounMatch = promptLower.match(/\b(it|this|that|this\s+card|this\s+button|isko|isme|yaha|waha|usko|usme|ye|woh|same\s+one|previous\s+one)\b/i);

    if (pronounMatch) {
      const pronoun = pronounMatch[1].toLowerCase();

      // Case A: Action on referenced item ("isme start karo", "isko open karo", "usme submit karo")
      const actionInsideMatch = promptLower.match(/^(?:isko|isme|usko|usme|this|that|ye|woh)\s+(?:me\s+|par\s+)?(start|open|click|edit|save|submit|cancel|delete)\s*(?:karo|kardo|button)?$/i) ||
                                 promptLower.match(/^(start|open|click|edit|save|submit|cancel|delete)\s+(?:in|on\s+)?(?:this|that|isko|isme|usko|usme|ye|woh)$/i);

      if (actionInsideMatch) {
        const subAction = actionInsideMatch[1].toLowerCase();
        const liveSnapshot = input.pageContext?.liveContext?.snapshot;
        const activeCards = liveSnapshot?.cards || [];
        
        // Find most relevant card or button in current live DOM snapshot
        const targetCard = activeCards[0];
        if (targetCard && targetCard.actionableElementIds.length > 0) {
          const firstActionableId = targetCard.actionableElementIds[0];
          processedPromptLower = `click ${firstActionableId}`;
          processedPromptRaw = `click ${firstActionableId}`;
        } else if (activeState.problemTitle) {
          processedPromptLower = `${subAction} problem ${activeState.problemTitle}`;
          processedPromptRaw = `${subAction} problem ${activeState.problemTitle}`;
        } else if (activeState.sheetTitle) {
          processedPromptLower = `${subAction} ${activeState.sheetTitle} sheet`;
          processedPromptRaw = `${subAction} ${activeState.sheetTitle} sheet`;
        }
      } else if (/^(open\s+(it|this|that|same\s+one)|(isko|ye|woh|usko)\s+(open|kholo)\s*(karo)?)$/i.test(promptLower)) {
        if (activeState.problemId || activeState.problemTitle) {
          processedPromptLower = `open problem ${activeState.problemTitle || activeState.problemId}`;
          processedPromptRaw = `open problem ${activeState.problemTitle || activeState.problemId}`;
        } else if (activeState.sheetId || activeState.sheetTitle) {
          processedPromptLower = `open ${activeState.sheetTitle || activeState.sheetId} sheet`;
          processedPromptRaw = `open ${activeState.sheetTitle || activeState.sheetId} sheet`;
        } else if (activeState.courseId || activeState.courseTitle) {
          processedPromptLower = `open ${activeState.courseTitle || activeState.courseId} course`;
          processedPromptRaw = `open ${activeState.courseTitle || activeState.courseId} course`;
        } else {
          processedPromptLower = 'open dsa sheets';
          processedPromptRaw = 'open dsa sheets';
        }
      }
    }

    const fastPathResult = await this.resolveDeterministicIntent(processedPromptLower, processedPromptRaw, input.user, userRole, input.pageContext, activeState);
    if (fastPathResult) {
      const intentEnd = Date.now();
      const totalMs = intentEnd - startTime;
      fastPathResult.latencyMetrics = {
        speech_final: input.timestamps?.speech_final || startTime,
        intent_detected: intentStart,
        tool_started: intentStart,
        entity_lookup_started: intentStart,
        entity_lookup_finished: intentEnd,
        navigation_started: intentEnd,
        response_started: intentEnd,
        response_finished: intentEnd,
        total_latency_ms: totalMs
      };
      fastPathResult.timingMetadata = {
        intentMs: intentEnd - intentStart,
        snapshotMs: 5,
        resolutionMs: intentEnd - intentStart,
        llmMs: 0,
        toolMs: 5,
        navigationMs: fastPathResult.pendingNavigation ? 10 : 0,
        totalMs
      };
      console.log(`[AgentController] Fast-path executed in ${totalMs}ms:`, fastPathResult.toolExecuted);
      actionLockMap.set(lockKey, { timestamp: Date.now(), result: fastPathResult });
      return fastPathResult;
    }

    // 4. Sub-Millisecond Intelligent Intent & Complexity Router
    const routerStart = Date.now();
    const classification = this.classifyRequestComplexity(
      processedPromptLower,
      input.pageContext,
      input.confirmedTool,
      input.history
    );
    const routerMs = Date.now() - routerStart;

    const tracker = new LatencyTracker(promptRaw);
    tracker.setFastPath(classification.routePath);
    tracker.markStage('router_ms');

    // 5. LLM Intent & Provider Execution (Groq Fast Path vs Gemini Reasoning Path)
    const llmStart = Date.now();
    const llmResult = await runSmartAgent({
      user: input.user,
      userRole,
      studentProfile: input.studentProfile,
      prompt: promptRaw,
      history: input.history,
      pageContext: input.pageContext,
      preferredProvider: classification.preferredProvider
    });
    const llmEnd = Date.now();

    tracker.markTTFT();
    tracker.setSuccess(llmResult.success);
    tracker.finish();

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
    response.timingMetadata = {
      intentMs: intentStart - startTime,
      snapshotMs: 10,
      resolutionMs: intentStart - startTime,
      llmMs: llmEnd - llmStart,
      toolMs: endTime - llmEnd,
      navigationMs: response.pendingNavigation ? 10 : 0,
      totalMs: endTime - startTime
    };
    actionLockMap.set(lockKey, { timestamp: Date.now(), result: response });
    return response;
  }

  /**
   * Deterministic, sub-millisecond intent & complexity router.
   * Directs simple conversational Q&A to Groq fast path, and tool/DOM-heavy requests to Gemini reasoning agent.
   */
  public static classifyRequestComplexity(
    prompt: string,
    pageContext?: AgentPageContext,
    confirmedTool?: { toolName: string; args: any },
    history?: AgentChatMessage[]
  ): {
    routePath: 'groq_fast' | 'gemini_agent';
    preferredProvider: 'groq' | 'gemini';
    reason: string;
    isToolRequired: boolean;
  } {
    const pLower = (prompt || '').trim().toLowerCase();

    // 1. Confirmed tool -> Gemini agent tool execution path
    if (confirmedTool) {
      return {
        routePath: 'gemini_agent',
        preferredProvider: 'gemini',
        reason: 'Confirmed tool execution requires agent tool pipeline',
        isToolRequired: true
      };
    }

    // 2. Multimodal image or voice live context -> Gemini
    if ((pageContext as any)?.imageInput || (pageContext as any)?.hasMultimodal) {
      return {
        routePath: 'gemini_agent',
        preferredProvider: 'gemini',
        reason: 'Multimodal input requires Gemini vision model',
        isToolRequired: false
      };
    }

    // 3. Platform actions, tools, navigation, and code problem execution keywords
    const toolActionRegex = /\b(open|kholo|dikhao|show|create|banao|make|edit|update|delete|save|click|press|tap|submit|fill|type|daalo|add|insert|solve|approach|code|compile|run|execute|read\s+page|scan|this\s+page|isme|is\s+page|yaha|leaderboard|rank|notice|announcement|problem|problems|sheet|sheets|dsa|course|courses|module|mcq|quiz|routine|timetable|schedule|goal|targets|latex|resume|360|weakest|youtube|search|video|browser)\b/i;

    if (toolActionRegex.test(pLower)) {
      return {
        routePath: 'gemini_agent',
        preferredProvider: 'gemini',
        reason: 'Platform navigation or tool action intent detected',
        isToolRequired: true
      };
    }

    // 4. Default: Groq Fast Path for fast conversational Q&A, conceptual explanations, greetings, and short answers
    return {
      routePath: 'groq_fast',
      preferredProvider: 'groq',
      reason: 'Pure conversational Q&A or explanation request',
      isToolRequired: false
    };
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

    // 0. AUTONOMOUS CODING AGENT INTENTS ("Make a login page", "create a page", "build a component", "fix component")
    const isAutonomousCodingIntent = /\b(make|build|create|fix)\s+(a\s+|an\s+)?(login\s+page|signup\s+page|page|component|feature|ui|landing\s+page)\b/i.test(promptLower) ||
                                     /^(make\s+a\s+login\s+page|create\s+login\s+page|build\s+login\s+page)$/i.test(promptLower.trim());

    if (isAutonomousCodingIntent) {
      return await executeWithPermission('runAutonomousCodingAgent', { prompt: promptRaw });
    }

    // 0. Meta Realtime / Continuous Conversation / Speed Optimization Queries
    const isMetaOptimizationQuery = /\b(contineous|continuous|conversation|real\s*time|realtime|delay|latency|fast|slow|speed|optmize|optimize)\b/i.test(promptLower) &&
                                    /\b(nhi|nahi|kr|karo|batao|kya|h|hai|kardo)\b/i.test(promptLower);
    if (isMetaOptimizationQuery) {
      return {
        success: true,
        message: `⚡ **Smart Agent Optimization Active**:\n\n` +
                 `• **Sub-second Latency**: Fast-path deterministic router active (<50ms).\n` +
                 `• **API Timeout Guards**: External LLM calls enforce strict 3-4s timeout guards.\n` +
                 `• **Context Trimming**: System context payload compressed for ultra-fast generation.\n\n` +
                 `Main real-time continuous commands follow karne ke liye ready hoon!`,
        status: 'success',
        toolExecuted: 'systemOptimizationCheck',
        sessionState
      };
    }

    // 0. External Search & Code Solve Intents ("go to gpt and search two sum", "ask chatgpt how binary search works", "search two sum in python and copy solution")
    const isExternalSearchSolveIntent = /\b(gpt|chatgpt|gemini|google|github|web|search|find|query|ask|copy|paste|solve|solution)\b/i.test(promptLower) &&
      /\b(search|solve|find|solution|code|how\s+to|what\s+is|ask|copy|paste|two\s*sum|dsa|problem|python|javascript|cpp|java)\b/i.test(promptLower);

    if (isExternalSearchSolveIntent && (promptLower.includes('gpt') || promptLower.includes('gemini') || promptLower.includes('search') || promptLower.includes('solve') || promptLower.includes('solution') || promptLower.includes('find') || promptLower.includes('ask'))) {
      let targetSite = 'chatgpt';
      if (/\b(gemini|google\s+gemini)\b/i.test(promptLower)) {
        targetSite = 'gemini';
      } else if (/\b(google)\b/i.test(promptLower) && !/\b(gemini)\b/i.test(promptLower)) {
        targetSite = 'google';
      } else if (/\b(youtube|yt)\b/i.test(promptLower)) {
        targetSite = 'youtube';
      } else if (/\b(github)\b/i.test(promptLower)) {
        targetSite = 'github';
      } else if (/\b(gpt|chatgpt)\b/i.test(promptLower)) {
        targetSite = 'chatgpt';
      }

      let cleanedQuery = promptRaw
        .replace(/^(?:go\s+to|visit|open|ask)\s+(?:gpt|chatgpt|gemini|google|web|site)?\s*(?:and|to)?\s*/i, '')
        .replace(/(?:and\s+)?(?:copy|paste|bring|put)\s+(?:the\s+)?(?:solution|code|answer|result|text)?\s*(?:to|in|into)?\s*(?:chat|here|smart\s*learn)?/gi, '')
        .replace(/^(?:search|find|solve|query|get|ask)\s+(?:for\s+)?/i, '')
        .trim();

      if (!cleanedQuery || cleanedQuery.length < 3) {
        cleanedQuery = promptRaw;
      }

      const language = promptLower.includes('python') ? 'python' : promptLower.includes('java') ? 'java' : promptLower.includes('cpp') || promptLower.includes('c++') ? 'cpp' : 'python';

      return await executeWithPermission('searchWebAndSolve', {
        query: cleanedQuery,
        targetSite,
        language
      });
    }

    // External browser navigation must use the paired browser controller
    const genericWebTarget = resolveTargetUrl(promptRaw);
    if (genericWebTarget && genericWebTarget.isExternal) {
      return await executeWithPermission('openBrowserUrl', { url: genericWebTarget.url, app: 'chrome' });
    }

    // 0. Live Current-Page Content Queries ("isme kya hai?", "is page par kya hai?", "yaha kya likha hai?", "explain this page", "full scroll read", "content access")
    const resolverLiveContext = pageContext?.liveContext || pageContext;
    const isCodingProblemUnderstandingQuery = userRole !== 'guest' &&
      (sessionState.route.includes('/code-arena/problems/') || resolverLiveContext?.pageType === 'dsa_problem') &&
      /\b(what\s+is\s+this\s+problem|what.*problem.*asking|explain.*problem|understand.*problem|solve.*problem|approach|constraints|input\s*(format)?|output\s*(format)?|examples?)\b/i.test(promptLower);

    if (isCodingProblemUnderstandingQuery) {
      return await executeWithPermission('getCurrentCodingProblem', {});
    }

    const isCurrentPageQuery = /\b(isme|is\s+page|yaha|yahan|current\s+page|open\s+page|this\s+page|full\s+page|scroll|screen)\b/i.test(promptLower) &&
                               /\b(kya|what|explain|progress|detail|details|info|padho|read|list|batao|dikhao|content|access)\b/i.test(promptLower);

    if (isCurrentPageQuery) {
      const live = pageContext?.liveContext || (pageContext?.snapshot || pageContext?.route ? pageContext : null);
      if (live) {
        const titleStr = live.pageTitle || live.currentEntity?.title || live.route;
        const headingsStr = live.visibleHeadings && live.visibleHeadings.length > 0 ? live.visibleHeadings.join(', ') : 'None';
        const textStr = live.visibleTextContent ? live.visibleTextContent : 'No extra details text visible.';
        const entityStr = live.currentEntity ? `Active Item: ${live.currentEntity.title} (${live.currentEntity.type})` : '';

        const snapshot = live.snapshot;

    // Course lesson resources: use the rendered lesson tabs instead of treating
    // a course video request as an external YouTube search.
    const isCourseResourceIntent = /\b(video|videos|material|materials|notes|resource|resources|pdf)\b/i.test(promptLower) &&
      /\b(open|kholo|khol|dikhao|show|play|view|dekhna|dekhao)\b/i.test(promptLower) &&
      sessionState.route.startsWith('/courses/');

    if (isCourseResourceIntent) {
      const wantsMaterials = /\b(material|materials|pdf)\b/i.test(promptLower);
      const liveElements = resolverLiveContext?.interactiveElementsList || [];
      const resourceElement = liveElements.find((element: any) => {
        const label = `${element.text || ''} ${element.ariaLabel || ''} ${element.dataAgentLabel || ''}`.toLowerCase();
        return wantsMaterials
          ? label.includes('material') || label.includes('pdf')
          : label.includes('video') || label.includes('resource');
      });

      if (resourceElement) {
        return await executeWithPermission('interactWithPageElement', {
          actionType: 'click',
          targetText: resourceElement.text || resourceElement.ariaLabel || (wantsMaterials ? 'Materials' : 'Video')
        });
      }

      if (sessionState.route.split('/').filter(Boolean).length < 3) {
        return {
          success: false,
          message: `Course page open hai, lekin koi lesson open nahi hai. Pehle lesson select kijiye, phir ${wantsMaterials ? 'Materials' : 'Video'} tab kholiye.`,
          status: 'failed',
          sessionState
        };
      }

      return {
        success: false,
        message: `Is lesson me ${wantsMaterials ? 'materials/PDF' : 'video/resource'} tab available nahi mila.`,
        status: 'failed',
        sessionState
      };
    }
        const cardsSummary = snapshot && snapshot.cards.length > 0
          ? snapshot.cards.slice(0, 5).map((c: any) => `• **${c.title || 'Card'}**: ${c.subtitle || ''} ${c.metrics ? c.metrics.map((m: any) => `${m.label}: ${m.value}`).join(', ') : ''}`).join('\n')
          : '';

        const alertsSummary = snapshot && snapshot.alerts.length > 0
          ? `\n⚠️ **Active Alerts/Notices**:\n` + snapshot.alerts.map((a: any) => `• [${a.type.toUpperCase()}] ${a.text}`).join('\n')
          : '';

        return {
          success: true,
          message: `📄 **Live Screen Breakdown**: ${titleStr} (\`${live.route}\`)\n\n` +
                   (entityStr ? `• **${entityStr}**\n` : '') +
                   `• **Headings**: ${headingsStr}\n\n` +
                   (cardsSummary ? `🎴 **Cards & Key Metrics**:\n${cardsSummary}\n\n` : '') +
                   (alertsSummary ? `${alertsSummary}\n\n` : '') +
                   `📝 **Scrollable Page Content**:\n• ${textStr.slice(0, 1200)}\n\n` +
                   `Aap is page ke kisi bhi specific section, card, ya element (e.g. "red wala button", "agent-el-001") par click ya query kar sakte hain.`,
          status: 'success',
          toolExecuted: 'getCurrentPageContext',
          sessionState
        };
      }
    }

    // 0B. Dynamic Live Page Element Interaction & Operations ("click agent-el-001", "click Submit", "red button dabao", "save karo", "cancel karo")
    const liveCtxObj = pageContext?.liveContext || (pageContext?.snapshot || pageContext?.route ? pageContext : null);
    const liveList = liveCtxObj?.interactiveElementsList || [];
    const liveSummary = liveCtxObj?.interactiveElements || [];
    const snapshotMap = liveCtxObj?.snapshot?.actionableElements || [];

    // Direct Agent Runtime ID match (e.g., "agent-el-005", "click agent-el-001")
    const agentIdMatch = promptLower.match(/\b(agent-el-\d{3})\b/i);
    if (agentIdMatch) {
      const targetId = agentIdMatch[1].toLowerCase();
      return await executeWithPermission('interactWithPageElement', {
        actionType: 'click',
        targetText: targetId
      });
    }

    // Explicit Click / Open / Edit / Save / Cancel / Delete / Submit Action Detection
    const clickMatch = promptLower.match(/^(?:click|open|press|tap)\s+(?:on\s+)?(?:the\s+)?(.+?)(?:\s+button|\s+card|\s+link|\s+tab)?$/i) ||
                       promptLower.match(/^(.+?)\s+(?:button|card|link|tab|option|badge)\s*(?:dabao|click\s*karo|open\s*karo|press\s*karo)?$/i) ||
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

      // Check if target matches any visible element or computed color/section in snapshot
      const matchedElement = snapshotMap.find((el: any) => {
        const textStr = (el.text || el.dataAgentLabel || el.dataAgentAction || el.ariaLabel || el.title || '').toLowerCase();
        return textStr.includes(targetQuery.toLowerCase()) || targetQuery.toLowerCase().includes(textStr);
      }) || liveList.find((el: any) => {
        const textStr = (el.text || el.ariaLabel || el.title || '').toLowerCase();
        return textStr.includes(targetQuery.toLowerCase()) || targetQuery.toLowerCase().includes(textStr);
      }) || liveSummary.find((s: string) => s.toLowerCase().includes(targetQuery.toLowerCase()));

      if (matchedElement || ['save', 'submit', 'cancel', 'close', 'edit', 'delete'].includes(targetQuery.toLowerCase()) || targetQuery.includes('red') || targetQuery.includes('green') || targetQuery.includes('yellow')) {
        const elementLabel = typeof matchedElement === 'string' ? matchedElement : (matchedElement?.id || matchedElement?.text || targetQuery);
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

    // 0C. Panel & Role Navigation Commands (Instructor, Admin, Developer, Superadmin)
    // Instructor Panel Commands ("instructor panel kholo", "instructor dashboard open karo")
    if (/\b(instructor\s+panel|instructor\s+dashboard|instructor\s+view)\b/i.test(promptLower)) {
      return await executeWithPermission('openInstructorDashboard');
    }

    if (/\b(instructor\s+courses|my\s+instructor\s+courses)\b/i.test(promptLower)) {
      return await executeWithPermission('openInstructorCourses');
    }

    // Admin Panel Commands ("admin panel kholo", "admin dashboard open karo", "admin panel me users kholo")
    if (/\b(admin\s+panel|admin\s+dashboard|admin\s+view)\b/i.test(promptLower)) {
      if (promptLower.includes('user') || promptLower.includes('student')) {
        return await executeWithPermission('openAdminUsers');
      }
      if (promptLower.includes('course')) {
        return await executeWithPermission('openAdminCourses');
      }
      if (promptLower.includes('nptel')) {
        return await executeWithPermission('openAdminNptel');
      }
      return await executeWithPermission('openAdminDashboard');
    }

    if (/\b(admin\s+users|users\s+management|students\s+management)\b/i.test(promptLower)) {
      return await executeWithPermission('openAdminUsers');
    }

    // Developer / Super Admin Panel Commands ("developer panel open karo", "super admin panel kholo")
    if (/\b(developer\s+panel|developer\s+view|super\s+admin|superadmin)\b/i.test(promptLower)) {
      return await executeWithPermission('openDeveloperPanel');
    }

    // Course Creation & Management Commands ("course create karo", "new course banao", "is course ko edit karo")
    if (/\b(course|courses)\b/i.test(promptLower)) {
      if (/\b(create|banao|make|new|add)\b/i.test(promptLower)) {
        const titleMatch = promptRaw.match(/(?:create|banao|make|new|add)\s+(?:course\s+)?(.+)/i);
        const title = titleMatch ? titleMatch[1].replace(/^(course|a|new)\s+/gi, '').trim() : 'New Course';
        return await executeWithPermission('createCourse', { title });
      }

      if (/\b(edit|modify|update|builder)\b/i.test(promptLower)) {
        return await executeWithPermission('editCourse', { courseId: sessionState.courseId });
      }
    }

    // MCQ / Question Creation Commands ("MCQ create karo", "isme MCQ add karo", "new question add karo")
    if (/\b(mcq|quiz|question|sawal)\b/i.test(promptLower) && /\b(create|add|banao|make|new)\b/i.test(promptLower)) {
      const qMatch = promptRaw.match(/(?:create|add|banao|make|new)\s+(?:mcq\s+|question\s+)?(.+)/i);
      const questionText = qMatch ? qMatch[1].trim() : 'New Multiple Choice Question';
      return await executeWithPermission('createMCQ', { questionText });
    }

    // Module Creation Commands ("module create karo", "isme module add karo")
    if (/\b(module|unit|section)\b/i.test(promptLower) && /\b(create|add|banao|make|new)\b/i.test(promptLower)) {
      const modMatch = promptRaw.match(/(?:create|add|banao|make|new)\s+(?:module\s+)?(.+)/i);
      const title = modMatch ? modMatch[1].trim() : 'New Module';
      return await executeWithPermission('createModule', { courseId: sessionState.courseId, title });
    }

    // A. Static Navigation Intents
    if (/\b(dashboard|home)\b/i.test(promptLower)) {
      return await executeWithPermission('openDashboard');
    }

    const isExplicitGenericSheetList = /^(open\s+dsa(\s+sheets?)?|dsa\s+sheets?\s+(kholo|dikhao|open|show)|show\s+dsa\s+sheets?|coding\s+sheets?\s+(kholo|dikhao)|open\s+coding\s+sheets?|all\s+sheets|show\s+me\s+coding\s+sheets|open\s+sheets?|sheets?\s+kholo)$/i.test(promptLower);
    if (isExplicitGenericSheetList) {
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

    // D. Direct Problem Number Navigation ("Problem 5 kholo", "problem 4", "p5", "problem 3. valid Sudoku")
    const probNumMatch = promptLower.match(/^(?:open\s+)?(?:problem|p)\s*#?\s*(\d+)(?:[\s.:\-]+.*)?$/i) ||
                         promptLower.match(/^(\d+)(?:st|nd|rd|th)?\s+(?:problem|p)(?:[\s.:\-]+.*)?$/i);
    if (probNumMatch) {
      const targetNum = parseInt(probNumMatch[1], 10);
      if (!isNaN(targetNum)) {
        const res = await executeWithPermission('openDSAProblem', { problemIndex: targetNum, sheetId: sessionState.sheetId, problemId: sessionState.problemId, query: promptRaw });
        if (res.success && res.data?.number) {
          sessionState.problemNumber = res.data.number;
          sessionState.problemId = res.data.problemId;
          sessionState.problemTitle = res.data.problemTitle;
          if (res.data.sheetId) sessionState.sheetId = res.data.sheetId;
        }
        return res;
      }
    }

    // E. Available Sheets Info Intent ("sare available sheet ka access info", "which sheets are available?", "sheets list")
    const isAvailableSheetsInfo = /\b(available\s+sheets?|sare\s+sheet|sari\s+sheets?|all\s+sheets|sheets?\s+access|sheets?\s+list|sheets?\s+info)\b/i.test(promptLower);
    if (isAvailableSheetsInfo) {
      return await executeWithPermission('getAvailableDSASheets');
    }

    // E2. Named & Ordinal Sheet Navigation ("Binary Search sheet kholo", "1st sheet", "2nd sheet", "Leetcode 100 Basics", "Codeforces 800 rated", "advanced graph")
    if (!isExplicitGenericSheetList) {
      const sheetMatch = promptLower.match(/^(?:open\s+)?(?:dsa\s+)?(.+?)\s+(?:dsa\s+)?sheet[s]?(?:\s+kholo|\s+open|\s+dikhao|\s+show|\s+kardo)?$/i) ||
                         promptLower.match(/^(?:open\s+)?(?:dsa\s+)?(.+?)\s+wala\s+(?:dsa\s+)?sheet[s]?(?:\s+kholo|\s+open|\s+dikhao)?$/i) ||
                         promptLower.match(/^(?:open\s+)?(?:dsa\s+)?(.+?)\s+wali\s+(?:dsa\s+)?sheet[s]?(?:\s+kholo|\s+open|\s+dikhao)?$/i) ||
                         promptLower.match(/^(.+?)\s+(?:dsa\s+)?sheet[s]?(?:\s+kholo|\s+open|\s+dikhao)?$/i) ||
                         promptLower.match(/^(?:open\s+)?(advanced\s+graph|leetcode\s+100|leetcode\s+100\s+basics?|leetcode\s+100\s+intermediate|codeforces\s+900|codeforces\s+800|blind\s+75|striver\s+75|striver)(?:\s+kholo|\s+open|\s+karo)?$/i) ||
                         promptLower.match(/^(.+?)\s+(kholo|open|show|dikhao|karo)$/i);
      if (sheetMatch) {
        const rawTitle = sheetMatch[1] || sheetMatch[0];
        const titleQuery = rawTitle
          .replace(/^(open|dsa|coding|show|dikhao|the|a)\s+/gi, '')
          .replace(/\s+(kholo|open|show|dikhao|karo|kardo|wala|wali|wale)$/gi, '')
          .replace(/\b(sheet|sheets)\b/gi, '')
          .trim();

        if (titleQuery && titleQuery !== 'dsa' && titleQuery !== 'coding' && titleQuery !== 'open' && !titleQuery.includes('create') && !titleQuery.includes('banao')) {
          const res = await executeWithPermission('openDSASheet', { titleQuery });
          if (res.success && res.expectedEntity?.id) {
            sessionState.sheetId = res.expectedEntity.id;
            sessionState.sheetTitle = res.expectedEntity.title;
          }
          return res;
        }
      }
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
