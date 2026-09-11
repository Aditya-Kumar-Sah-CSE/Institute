import { AGENT_TOOLS, AgentToolResult, selectRelevantTools } from './agent-tools-server';
import { buildAgentContext, AgentPageContext } from './agent-context';
import { Student360Profile } from '@/features/analytics/services/student-intelligence';
import { GoogleGenAI } from '@google/genai';
import { normalizeAgentRole, requireAgentPermission, canAccessPage, canUseTool } from '@/lib/auth/agent-permissions';
import { safeStringify } from './safe-stringify';
import { getUserAIProvider } from './providers/factory';
import { GroqProvider } from './providers/GroqProvider';
import { GeminiProvider } from './providers/GeminiProvider';

export interface AgentChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentResponse {
  success: boolean;
  message: string;
  actions?: Array<{ label: string; url: string; isExternal?: boolean }>;
  requiresConfirmation?: {
    toolName: string;
    args: any;
    promptMessage: string;
  };
  toolExecuted?: string;
  error?: string;
  pendingNavigation?: boolean;
  navigationId?: string;
  expectedRoute?: string;
  expectedEntity?: {
    type: 'sheet' | 'problem' | 'course' | 'certificate';
    id: string;
    title?: string;
    number?: number;
  };
  successMessage?: string;
  data?: any;
}

export async function runSmartAgent(params: {
  user: { id: string } | null;
  userRole?: string | null;
  studentProfile?: Student360Profile | null;
  prompt: string;
  history?: AgentChatMessage[];
  pageContext?: AgentPageContext;
  preferredProvider?: 'groq' | 'gemini' | 'grok';
}): Promise<AgentResponse> {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  const { user, studentProfile, prompt, history = [], pageContext, preferredProvider } = params;
  const userRole = normalizeAgentRole(params.userRole);
  const userPrompt = prompt.trim();
  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'qwen/qwen3.6-27b';

  // Authentication Gate Check for unauthenticated guests
  const isGuest = !user || userRole === 'guest';

  // Compact Context payload optimization with Full Scrollable Screen Text Access
  const liveCtx = pageContext?.liveContext || (pageContext?.snapshot || pageContext?.route ? pageContext : null);
  const compactLiveContext = liveCtx ? {
    route: liveCtx.route || pageContext?.route || '/',
    pageTitle: liveCtx.pageTitle,
    currentEntity: liveCtx.currentEntity ? {
      type: liveCtx.currentEntity.type,
      id: liveCtx.currentEntity.id,
      title: liveCtx.currentEntity.title
    } : null,
    problemContext: liveCtx.problemContext || null,
    visibleHeadings: liveCtx.visibleHeadings?.slice(0, 10) || [],
    fullPageText: liveCtx.visibleTextContent ? liveCtx.visibleTextContent.slice(0, 2000) : ''
  } : { route: pageContext?.route || '/' };

  const agentContext = isGuest
    ? { role: 'guest', authenticated: false, activeRoute: pageContext?.route || '/' }
    : {
        role: userRole,
        authenticated: true,
        userId: user?.id,
        liveContext: compactLiveContext
      };

  // 1. DYNAMIC TOOL FILTERING: Select only intent-relevant tools for this user role
  const relevantToolsList = selectRelevantTools(userPrompt, pageContext, userRole);

  if (process.env.NODE_ENV === 'development') {
    console.log('[SMART AGENT DEBUG - START]', {
      requestId,
      userRole,
      isGuest,
      userMessage: userPrompt,
      route: pageContext?.route,
      selectedToolsCount: relevantToolsList.length,
      tools: relevantToolsList.map(t => t.name)
    });
  }

  // 2. USER / SYSTEM AI PROVIDER PIPELINE (Groq / Gemini / Grok)
  let activeProviderInstance = null;
  let activeProviderName = 'groq';

  if (user && user.id) {
    const userBYOK = await getUserAIProvider(user.id, preferredProvider);
    if (userBYOK) {
      activeProviderInstance = userBYOK.provider;
      activeProviderName = userBYOK.activeProvider;
    }
  }

  // System API key fallback (Groq / Gemini) if user has no BYOK connected
  if (!activeProviderInstance) {
    if (groqApiKey) {
      activeProviderInstance = new GroqProvider(groqApiKey);
      activeProviderName = 'groq';
    } else if (geminiApiKey) {
      activeProviderInstance = new GeminiProvider(geminiApiKey);
      activeProviderName = 'gemini';
    }
  }

  if (activeProviderInstance) {
    try {
      const systemPrompt = `You are "Smart Learn Personal Assistant", a fast, natural, friendly personal learning guide on Smart Learn.
User Authentication Status: ${isGuest ? 'GUEST' : 'AUTHENTICATED'} (User Role: ${userRole}, Provider: ${activeProviderName.toUpperCase()})
LIVE PAGE CONTEXT: ${safeStringify(agentContext)}

RULES:
1. User Role: "${userRole}".
   - PERMISSION HIERARCHY RULE: Role "superadmin" (and "admin") has SUPERIOR HIERARCHY ACCESS to ALL tools and features across the platform, including ALL Instructor tools (createCourse, editCourse, createModule, createLesson, createMCQ, course builder, etc.), Admin tools (user management, NPTEL sync, etc.), Developer tools, and Student tools.
2. If user asks about a coding problem, use getCurrentCodingProblem before solving, explaining, generating code, or executing an action. Use only the returned rendered problem context; do not invent missing fields.
3. If user asks "isme kya hai?", "explain this page", inspect liveContext first.
4. Be concise (1-3 sentences). Match user language (Hinglish/English).`;

      const toolDeclarations = relevantToolsList.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }));

      const providerRes = await activeProviderInstance.generateResponse({
        systemInstruction: systemPrompt,
        history,
        prompt: userPrompt,
        tools: toolDeclarations
      });

      if (providerRes.success) {
        if (providerRes.toolCalls && providerRes.toolCalls.length > 0) {
          const accumulatedActions: Array<{ label: string; url: string; isExternal?: boolean }> = [];
          let lastExecutedTool: string | undefined = undefined;

          for (const call of providerRes.toolCalls) {
            const toolName = call.name;
            const parsedArgs = call.args || {};

            const permCheck = requireAgentPermission(user, userRole, 'tool', toolName);
            if (!permCheck.allowed) {
              return {
                success: false,
                message: permCheck.reason || 'Please log in first. This section is available to authenticated users.',
                toolExecuted: toolName
              };
            }

            if (AGENT_TOOLS[toolName]) {
              lastExecutedTool = toolName;
              const result: AgentToolResult = await AGENT_TOOLS[toolName].execute(parsedArgs, user || { id: 'guest' }, pageContext);

              if (result.url && canAccessPage(userRole, result.url)) {
                accumulatedActions.push({ label: 'Open Page', url: result.url });
              }
              if (result.externalUrl) {
                accumulatedActions.push({ label: 'View External Link', url: result.externalUrl, isExternal: true });
              }

              return {
                success: result.success,
                message: result.message,
                actions: accumulatedActions.length > 0 ? accumulatedActions : undefined,
                requiresConfirmation: result.requiresConfirmation,
                toolExecuted: lastExecutedTool,
                pendingNavigation: result.pendingNavigation,
                navigationId: result.navigationId,
                expectedRoute: result.expectedRoute,
                expectedEntity: result.expectedEntity,
                successMessage: result.successMessage,
                data: result.data
              };
            }
          }
        } else if (providerRes.text) {
          return {
            success: true,
            message: providerRes.text
          };
        }
      }
    } catch (llmErr) {
      console.warn('[SmartAgent LLM Provider Error]:', llmErr);
    }
  }

  // 3. DETERMINISTIC RULE-BASED FALLBACK ENGINE
  return await resolveFallbackAgentCommand(userPrompt, user, userRole, studentProfile, pageContext, requestId, startTime);
}

async function resolveFallbackAgentCommand(
  prompt: string,
  user: { id: string } | null,
  userRole: string,
  profile?: Student360Profile | null,
  pageContext?: AgentPageContext,
  requestId?: string,
  startTime: number = Date.now()
): Promise<AgentResponse> {
  const p = prompt.toLowerCase();
  const isHinglish = /bhai|kholo|karo|dikhao|kr|mera|meri|tumhari|par|pe|kya|h|sawal|banao/i.test(prompt);

  // Authentication Gate check for guest users requesting protected actions
  if (!user || userRole === 'guest') {
    const isProtectedIntent = /\b(dashboard|profile|dsa|sheet|routine|goal|timetable|my courses|enrolled|progress|weakest|latex)\b/i.test(p);
    if (isProtectedIntent) {
      return {
        success: false,
        message: 'Please log in first. This section is available to authenticated users.'
      };
    }
  }

  // Live Screen Queries
  if (p.includes('kaunsi sheet') || p.includes('kitni sheet') || p.includes('kitne problem') || p.includes('yahan kya')) {
    const liveRes = await AGENT_TOOLS.queryLivePage.execute({ question: prompt }, user || { id: 'guest' }, pageContext);
    return {
      success: liveRes.success,
      message: liveRes.message,
      actions: liveRes.url && canAccessPage(userRole, liveRes.url) ? [{ label: 'View Page', url: liveRes.url }] : undefined,
      toolExecuted: 'queryLivePage'
    };
  }

  // YouTube / Search
  if (p.includes('youtube') || p.includes('video') || p.includes('yt') || p.includes('search')) {
    const q = pageContext?.problemTitle || prompt.replace(/youtube|search|video|yt|pe|par|khoro|kholo|kr|kar|isko/gi, '').trim() || 'DSA problem solution';
    const res = await AGENT_TOOLS.searchYouTube.execute({ query: q }, user || { id: 'guest' }, pageContext);
    return {
      success: true,
      message: isHinglish ? `Isi problem (${q}) ko YouTube par search kar raha hoon.` : `Searching YouTube for "${q}".`,
      actions: [{ label: 'Watch on YouTube', url: res.externalUrl!, isExternal: true }],
      toolExecuted: 'searchYouTube'
    };
  }

  // Protected actions require user login
  if (!user) {
    return {
      success: true,
      message: isHinglish
        ? 'Namaste! Main aapka Smart Learn AI Assistant hoon. Padhai shuru karne ke liye please login kijiye.'
        : 'Hello! I am your Smart Learn AI Assistant. Please log in to access your learning dashboard.'
    };
  }

  // Specific Smart Learn Tool Commands (DSA Sheets / Courses / Routine)
  const isExplicitSheetCommand = /\b(open|kholo|show|dikhao)\b/i.test(p) && /\b(dsa|sheet|sheets|coding)\b/i.test(p);
  if (isExplicitSheetCommand) {
    if (!canUseTool(userRole, 'openDSASheets')) {
      return { success: false, message: `Access denied. Using this section requires student permissions.` };
    }
    const res = await AGENT_TOOLS.openDSASheets.execute({}, user, pageContext);
    return {
      success: true,
      message: res.message,
      actions: [{ label: 'Open DSA Sheets', url: res.url! }],
      toolExecuted: 'openDSASheets',
      pendingNavigation: res.pendingNavigation,
      navigationId: res.navigationId,
      expectedRoute: res.expectedRoute,
      expectedEntity: res.expectedEntity,
      successMessage: res.successMessage || res.message
    };
  }

  // Default Conversational Fallback for Normal Chat (No tool executed)
  return {
    success: true,
    message: isHinglish
      ? 'Namaste! Main aapka Smart Learn AI Assistant hoon. Main aapki DSA questions, courses, routine, aur learning score me kaise madad kar sakta hoon?'
      : 'Hello! I am your Smart Learn AI Assistant. How can I help you with your DSA problems, courses, routine, or learning progress today?'
  };
}
