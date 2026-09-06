import { AGENT_TOOLS, AgentToolResult, selectRelevantTools } from './agent-tools';
import { buildAgentContext, AgentPageContext } from './agent-context';
import { Student360Profile } from '@/features/analytics/services/student-intelligence';
import { GoogleGenAI } from '@google/genai';
import { normalizeAgentRole, requireAgentPermission, canAccessPage, canUseTool } from '@/lib/auth/agent-permissions';
import { safeStringify } from './safe-stringify';

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
}): Promise<AgentResponse> {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  const { user, studentProfile, prompt, history = [], pageContext } = params;
  const userRole = normalizeAgentRole(params.userRole);
  const userPrompt = prompt.trim();
  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'qwen/qwen3.6-27b';

  // Authentication Gate Check for unauthenticated guests
  const isGuest = !user || userRole === 'guest';

  // Compact Context payload optimization with Full Scrollable Screen Text Access
  const compactLiveContext = pageContext?.liveContext ? {
    route: pageContext.liveContext.route || pageContext.route,
    pageTitle: pageContext.liveContext.pageTitle,
    currentEntity: pageContext.liveContext.currentEntity ? {
      type: pageContext.liveContext.currentEntity.type,
      id: pageContext.liveContext.currentEntity.id,
      title: pageContext.liveContext.currentEntity.title
    } : null,
    visibleHeadings: pageContext.liveContext.visibleHeadings?.slice(0, 10) || [],
    fullPageText: pageContext.liveContext.visibleTextContent ? pageContext.liveContext.visibleTextContent.slice(0, 2000) : ''
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

  // 2. GROQ LLM TOOL CALLING PIPELINE (Strict 3-second AbortSignal timeout for instant failover)
  if (groqApiKey) {
    try {
      const toolDefs = relevantToolsList.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));

      const systemPrompt = `You are "Smart Learn Personal Assistant", a fast, natural, friendly personal learning guide on Smart Learn.
User Authentication Status: ${isGuest ? 'GUEST (Unauthenticated User)' : `AUTHENTICATED (User Role: ${userRole})`}
LIVE PAGE CONTEXT: ${JSON.stringify(agentContext)}

RULES:
1. User Role: "${userRole}". ONLY select tools allowed for this role.
2. If user asks "isme kya hai?", "explain this page", inspect liveContext first.
3. Be concise (1-3 sentences). Match user language (Hinglish/English).`;

      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: userPrompt }
      ];

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: groqModel,
          messages,
          tools: toolDefs.length > 0 ? toolDefs : undefined,
          tool_choice: toolDefs.length > 0 ? 'auto' : undefined,
          temperature: 0.2,
          max_tokens: 400
        }),
        signal: AbortSignal.timeout(3000)
      });

      if (groqResponse.ok) {
        const data = await groqResponse.json();
        const choiceMessage = data.choices?.[0]?.message;

        if (choiceMessage?.tool_calls && choiceMessage.tool_calls.length > 0) {
          const accumulatedActions: Array<{ label: string; url: string; isExternal?: boolean }> = [];
          let lastExecutedTool: string | undefined = undefined;

          for (const toolCall of choiceMessage.tool_calls) {
            const toolName = toolCall.function.name;
            const rawArgs = toolCall.function.arguments || '{}';
            let parsedArgs = {};
            try { parsedArgs = JSON.parse(rawArgs); } catch (e) {}

            // Permission Check Before Execution
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
        } else if (choiceMessage?.content) {
          return {
            success: true,
            message: choiceMessage.content
          };
        }
      }
    } catch (err) {
      console.warn('Groq Agent API call timed out or failed (<3s), trying Gemini fallback:', err);
    }
  }

  // 3. GEMINI 3.6 FLASH LLM FALLBACK PIPELINE (Strict 4-second timeout guard)
  if (geminiApiKey) {
    try {
      const serverAi = new GoogleGenAI({ apiKey: geminiApiKey });
      const functionDeclarations = relevantToolsList.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }));

      const systemPrompt = `You are "Smart Learn Personal Assistant", a fast, natural personal learning guide.
User Auth: ${isGuest ? 'GUEST' : `AUTHENTICATED (${userRole})`}
LIVE PAGE CONTEXT: ${safeStringify(agentContext)}
RULES: Keep answers under 3 sentences. Only use allowed tools. Avoid hallucinations.`;

      const contents: any[] = [
        ...history.slice(-4).map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        })),
        { role: 'user', parts: [{ text: userPrompt }] }
      ];

      const geminiPromise = serverAi.models.generateContent({
        model: 'gemini-3.6-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          tools: functionDeclarations.length > 0 ? [{ functionDeclarations: functionDeclarations as any }] : undefined
        }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout after 4000ms')), 4000)
      );

      const geminiRes: any = await Promise.race([geminiPromise, timeoutPromise]);

      if (geminiRes.functionCalls && geminiRes.functionCalls.length > 0) {
        const accumulatedActions: Array<{ label: string; url: string; isExternal?: boolean }> = [];
        let lastExecutedTool: string | undefined = undefined;

        for (const call of geminiRes.functionCalls) {
          const toolName = call.name || '';
          const parsedArgs = call.args || {};

          // Permission Check Before Execution
          const permCheck = requireAgentPermission(user, userRole, 'tool', toolName);
          if (!permCheck.allowed) {
            return {
              success: false,
              message: permCheck.reason || 'Please log in first. This section is available to authenticated users.',
              toolExecuted: toolName
            };
          }

          if (toolName && AGENT_TOOLS[toolName]) {
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
              successMessage: result.successMessage
            };
          }
        }
      } else if (geminiRes.text) {
        return {
          success: true,
          message: geminiRes.text
        };
      }
    } catch (geminiErr) {
      console.warn('Gemini Agent API call failed, falling back to deterministic classifier:', geminiErr);
    }
  }

  // 4. DETERMINISTIC RULE-BASED FALLBACK ENGINE
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
        ? 'Please log in first. This section is available to authenticated users.'
        : 'Please log in first. This section is available to authenticated users.'
    };
  }

  // DSA Problem / Sheets
  if (p.includes('dsa') || p.includes('sheet') || p.includes('coding')) {
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

  // Default Fallback
  return {
    success: true,
    message: isHinglish
      ? `Main is command ko samajh nahi paaya. Aap mujhse DSA sheet, courses, routine, goals, latex editor open karne ya Student360 analytics pooch sakte hain.`
      : `I couldn't understand that request. You can ask me to open courses, DSA sheets, routine, goals, LaTeX editor, or analyze your learning score.`
  };
}
