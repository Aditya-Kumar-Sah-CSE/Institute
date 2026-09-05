import { AGENT_TOOLS, AgentToolResult, selectRelevantTools } from './agent-tools';
import { buildAgentContext, AgentPageContext } from './agent-context';
import { Student360Profile } from '@/features/analytics/services/student-intelligence';
import { GoogleGenAI } from '@google/genai';

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
  user: { id: string };
  studentProfile: Student360Profile;
  prompt: string;
  history?: AgentChatMessage[];
  pageContext?: AgentPageContext;
}): Promise<AgentResponse> {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  const { user, studentProfile, prompt, history = [], pageContext } = params;
  const userPrompt = prompt.trim();
  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'qwen/qwen3.6-27b';

  const agentContext = buildAgentContext(studentProfile, pageContext);

  // 1. DYNAMIC TOOL FILTERING: Select only intent-relevant tools for low latency & high accuracy
  const relevantToolsList = selectRelevantTools(userPrompt, pageContext);

  if (process.env.NODE_ENV === 'development') {
    console.log('[SMART AGENT DEBUG - START]', {
      requestId,
      userMessage: userPrompt,
      route: pageContext?.route,
      problemTitle: pageContext?.problemTitle,
      selectedToolsCount: relevantToolsList.length,
      tools: relevantToolsList.map(t => t.name)
    });
  }

  // 2. GROQ LLM TOOL CALLING PIPELINE
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

      const systemPrompt = `You are "Smart Learn Personal Assistant", a natural, friendly, human personal learning guide on Smart Learn.
You pair-learn with the logged-in student and help them control Smart Learn using natural language and voice.

REAL STUDENT 360° PROFILE & PAGE CONTEXT JSON:
${JSON.stringify(agentContext, null, 2)}

HUMAN CONVERSATION PERSONA & RULES:
1. TALK LIKE A HELPFUL HUMAN ASSISTANT:
   - Use short, natural, friendly replies (1-3 sentences max).
   - Match the student's language naturally (Hinglish if user speaks Hinglish/Hindi like "bhai meri dsa kholo", English if English like "open my dsa").
   - Examples:
     * User: "bhai meri dsa kholo" -> "Bilkul! Tumhari DSA sheet khol raha hoon."
     * User: "problem 4" -> "Problem 4 open kar raha hoon."
     * User: "isko youtube pe search kr" -> "Sure, isi problem ko YouTube par search kar raha hoon."
     * User: "kal meri routine bana do" -> "Kal ki personalized routine schedule set kar di hai."
   - NEVER use robotic phrases like "I will now attempt to execute..." or mention internal function names.

2. CONTEXT & FOLLOW-UP MEMORY:
   - Remember previous turns in conversation history and current page context.
   - Understand pronouns and implicit references ("isko", "this", "yt", "latex", "problem 4") refer to the currently active problem (${pageContext?.problemTitle || 'none'}) or course (${pageContext?.courseTitle || 'none'}).

3. ACTION EXECUTION & TOOL SELECTION:
   - Select the most appropriate tool function from the provided list.
   - Never invent internal URLs. Use only trusted routes returned by tools.

4. REAL EVIDENCE & PERSONALIZATION:
   - For recommendations, use actual Student360 metrics (e.g. "DBMS score 58% hai, isliye SQL Advanced recommend kar raha hoon").
   - For routine/goals, generate personalized items using weak areas.`;

      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
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
          tools: toolDefs,
          tool_choice: 'auto',
          temperature: 0.2,
          max_tokens: 600
        })
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

            if (AGENT_TOOLS[toolName]) {
              lastExecutedTool = toolName;
              const result: AgentToolResult = await AGENT_TOOLS[toolName].execute(parsedArgs, user, pageContext);

              if (result.url) {
                accumulatedActions.push({ label: 'Open Page', url: result.url });
              }
              if (result.externalUrl) {
                accumulatedActions.push({ label: 'View External Link', url: result.externalUrl, isExternal: true });
              }

              if (process.env.NODE_ENV === 'development') {
                console.log('[SMART AGENT DEBUG - EXECUTE]', {
                  requestId,
                  toolName,
                  parsedArgs,
                  resultSuccess: result.success,
                  pendingNavigation: result.pendingNavigation,
                  expectedEntity: result.expectedEntity,
                  executionTimeMs: Date.now() - startTime
                });
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
      console.warn('Groq Agent API call failed, trying Gemini fallback:', err);
    }
  }

  // 3. GEMINI 3.6 FLASH LLM FALLBACK PIPELINE
  if (geminiApiKey) {
    try {
      const serverAi = new GoogleGenAI({ apiKey: geminiApiKey });
      const functionDeclarations = relevantToolsList.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }));

      const systemPrompt = `You are "Smart Learn Personal Assistant", a natural, friendly, human personal learning guide on Smart Learn.
You pair-learn with the logged-in student and help them control Smart Learn using natural language and voice.

REAL STUDENT 360° PROFILE & PAGE CONTEXT JSON:
${JSON.stringify(agentContext, null, 2)}

HUMAN CONVERSATION PERSONA & RULES:
1. TALK LIKE A HELPFUL HUMAN ASSISTANT:
   - Use short, natural, friendly replies (1-3 sentences max).
   - Match the student's language naturally (Hinglish if user speaks Hinglish/Hindi like "bhai meri dsa kholo", English if English like "open my dsa").
   - NEVER use robotic phrases or internal tool names in user conversation.

2. CONTEXT & FOLLOW-UP MEMORY:
   - Understand active problem (${pageContext?.problemTitle || 'none'}) and active route (${pageContext?.route || 'none'}).`;

      const contents: any[] = [
        ...history.slice(-6).map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        })),
        { role: 'user', parts: [{ text: userPrompt }] }
      ];

      const geminiRes = await serverAi.models.generateContent({
        model: 'gemini-3.6-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations: functionDeclarations as any }]
        }
      });

      if (geminiRes.functionCalls && geminiRes.functionCalls.length > 0) {
        const accumulatedActions: Array<{ label: string; url: string; isExternal?: boolean }> = [];
        let lastExecutedTool: string | undefined = undefined;

        for (const call of geminiRes.functionCalls) {
          const toolName = call.name;
          const parsedArgs = call.args || {};

          if (toolName && AGENT_TOOLS[toolName]) {
            lastExecutedTool = toolName;
            const result: AgentToolResult = await AGENT_TOOLS[toolName].execute(parsedArgs, user, pageContext);

            if (result.url) {
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

  // 4. DETERMINISTIC RULE-BASED FALLBACK ENGINE (For offline / backup execution)
  return await resolveFallbackAgentCommand(userPrompt, user, studentProfile, pageContext, requestId, startTime);
}

async function resolveFallbackAgentCommand(
  prompt: string,
  user: { id: string },
  profile: Student360Profile,
  pageContext?: AgentPageContext,
  requestId?: string,
  startTime: number = Date.now()
): Promise<AgentResponse> {
  const p = prompt.toLowerCase();
  const isHinglish = /bhai|kholo|karo|dikhao|kr|mera|meri|tumhari|par|pe|kya|h|sawal|banao/i.test(prompt);

  // A0. LIVE SCREEN QUERIES e.g. "Kaunsi sheets available hain?", "Is sheet me kitne problems hain?"
  if (p.includes('kaunsi sheet') || p.includes('kitni sheet') || p.includes('kitne problem') || p.includes('yahan kya')) {
    const liveRes = await AGENT_TOOLS.queryLivePage.execute({ question: prompt }, user, pageContext);
    return {
      success: liveRes.success,
      message: liveRes.message,
      actions: liveRes.url ? [{ label: 'View Page', url: liveRes.url }] : undefined,
      toolExecuted: 'queryLivePage'
    };
  }

  // A. MULTI-STEP COMPOUND COMMANDS e.g. "weakest problem kholo aur youtube pe search karo"
  if ((p.includes('weakest') || p.includes('problem')) && (p.includes('youtube') || p.includes('yt') || p.includes('search'))) {
    const probRes = await AGENT_TOOLS.openWeakestDSAProblem.execute({}, user);
    if (!probRes.success) {
      return {
        success: false,
        message: 'Weakest DSA problem resolve nahi ho paaya.',
        toolExecuted: 'openWeakestDSAProblem'
      };
    }

    const probTitle = probRes.data?.problemTitle || 'DSA problem';
    const ytRes = await AGENT_TOOLS.searchYouTube.execute({ query: probTitle }, user, pageContext);

    return {
      success: true,
      message: isHinglish
        ? `Tumhari weakest topic wali problem (${probTitle}) open kar di aur YouTube search bhi kar diya.`
        : `Opened your weakest area problem (${probTitle}) and searched on YouTube.`,
      actions: [
        { label: 'Open Problem', url: probRes.url! },
        { label: 'Watch on YouTube', url: ytRes.externalUrl!, isExternal: true }
      ],
      toolExecuted: 'openWeakestDSAProblem,searchYouTube'
    };
  }

  // B. DYNAMIC ROUTINE GENERATION e.g. "kal meri routine bana do"
  if (p.includes('kal') && (p.includes('routine') || p.includes('timetable') || p.includes('schedule') || p.includes('bana'))) {
    const res = await AGENT_TOOLS.generateTomorrowRoutine.execute({}, user);
    return {
      success: res.success,
      message: isHinglish ? res.message : `Generated tomorrow's routine based on your goals and weak areas.`,
      actions: [{ label: 'View Routine', url: res.url || '/dashboard' }],
      toolExecuted: 'generateTomorrowRoutine'
    };
  }

  // C. WEAKEST SKILL / ANALYTICS e.g. "meri weakest skill kya hai?"
  if (p.includes('weakest skill') || p.includes('weak area') || p.includes('kamzori') || p.includes('skill gap')) {
    const res = await AGENT_TOOLS.getWeakAreas.execute({}, user);
    return {
      success: true,
      message: res.message,
      actions: [{ label: 'Explore Courses', url: '/courses' }, { label: 'Practice DSA', url: '/code-arena/sheets' }],
      toolExecuted: 'getWeakAreas'
    };
  }

  // D. RECOMMENDATIONS e.g. "main next kya karun?"
  if (p.includes('next kya') || p.includes('kya karu') || p.includes('what should i learn')) {
    const res = await AGENT_TOOLS.getRecommendations.execute({}, user);
    return {
      success: true,
      message: res.message,
      actions: [{ label: 'Explore Recommendations', url: res.url || '/courses' }],
      toolExecuted: 'getRecommendations'
    };
  }

  // E. 30-DAY PLAN ROADMAP
  if (p.includes('30 day') || p.includes('30-day') || p.includes('plan') || p.includes('roadmap')) {
    const mainWeakness = profile.weakAreas[0] || 'Core Skills';
    const currentCourse = profile.enrolledCoursesData[0]?.title || 'Enrolled Course';

    return {
      success: true,
      message: `30-Day Plan

Week 1: ${mainWeakness} basics (${currentCourse}) - Daily 1 session + 20 MCQs
Week 2: ${mainWeakness} practice - Daily 30 min practice
Week 3: DSA weak topic - Daily 2 problems
Week 4: Revision + assessment

Today's Focus:
Complete 20 MCQs and study 30 mins of ${mainWeakness}.`,
      actions: [{ label: 'Explore Courses', url: '/courses' }, { label: 'Solve DSA Sheets', url: '/code-arena/sheets' }]
    };
  }

  // F. YOUTUBE / SEARCH
  if (p.includes('youtube') || p.includes('video') || p.includes('yt') || p.includes('search')) {
    const q = pageContext?.problemTitle || prompt.replace(/youtube|search|video|yt|pe|par|khoro|kholo|kr|kar|isko/gi, '').trim() || 'DSA problem solution';
    const res = await AGENT_TOOLS.searchYouTube.execute({ query: q }, user, pageContext);
    return {
      success: true,
      message: isHinglish ? `Isi problem (${q}) ko YouTube par search kar raha hoon.` : `Searching YouTube for "${q}".`,
      actions: [{ label: 'Watch on YouTube', url: res.externalUrl!, isExternal: true }],
      toolExecuted: 'searchYouTube'
    };
  }

  // G. LATEX EDITOR
  if (p.includes('latex') || p.includes('equation') || p.includes('formula')) {
    const res = await AGENT_TOOLS.openLatexEditor.execute({ problemId: pageContext?.problemId }, user);
    return {
      success: true,
      message: isHinglish ? 'Bilkul, LaTeX editor open kar diya.' : 'Opening LaTeX Editor.',
      actions: [{ label: 'Open LaTeX Editor', url: res.url! }],
      toolExecuted: 'openLatexEditor'
    };
  }

  // H. DSA PROBLEM
  if (p.includes('problem') || p.includes('question') || p.includes('sawal') || /^\s*problem\s*\d+\s*$/i.test(prompt)) {
    const matchNum = p.match(/\b\d+\b/);
    const queryStr = matchNum ? `Problem ${matchNum[0]}` : prompt.replace(/open|kholo|problem|question|sawal/gi, '').trim();
    const res = await AGENT_TOOLS.openDSAProblem.execute({ query: queryStr }, user, pageContext);

    if (!res.success) {
      return {
        success: false,
        message: isHinglish ? `Mujhe ${queryStr || 'problem'} nahi mila.` : res.message,
        toolExecuted: 'openDSAProblem'
      };
    }

    return {
      success: true,
      message: res.message,
      actions: [{ label: 'Open Problem', url: res.url! }],
      toolExecuted: 'openDSAProblem',
      pendingNavigation: res.pendingNavigation,
      navigationId: res.navigationId,
      expectedRoute: res.expectedRoute,
      expectedEntity: res.expectedEntity,
      successMessage: res.successMessage || res.message
    };
  }

  // I. DSA SHEETS
  if (p.includes('dsa') || p.includes('sheet') || p.includes('coding')) {
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

  // J. COURSES
  if (p.includes('course') || p.includes('subject') || p.includes('itw') || p.includes('dbms')) {
    const courseQuery = p.includes('itw') ? 'ITW' : p.includes('dbms') ? 'DBMS' : '';
    const res = await AGENT_TOOLS.openCourse.execute({ courseName: courseQuery }, user, pageContext);

    if (!res.success) {
      return {
        success: false,
        message: isHinglish ? `Mujhe "${courseQuery}" course nahi mila.` : res.message,
        toolExecuted: 'openCourse'
      };
    }

    return {
      success: true,
      message: res.message,
      actions: [{ label: 'Open Course', url: res.url! }],
      toolExecuted: 'openCourse',
      pendingNavigation: res.pendingNavigation,
      navigationId: res.navigationId,
      expectedRoute: res.expectedRoute,
      expectedEntity: res.expectedEntity,
      successMessage: res.successMessage || res.message
    };
  }

  // K. CERTIFICATES & PROFILE
  if (p.includes('certificate') || p.includes('degree')) {
    const res = await AGENT_TOOLS.openCertificate.execute({}, user);
    return {
      success: true,
      message: isHinglish ? `Tumhare certificates open kar raha hoon.` : res.message,
      actions: [{ label: 'View Certificates', url: res.url! }],
      toolExecuted: 'openCertificate'
    };
  }

  if (p.includes('routine') || p.includes('schedule') || p.includes('timetable')) {
    const res = await AGENT_TOOLS.getMyRoutine.execute({}, user);
    return {
      success: true,
      message: isHinglish ? `Tumhari daily routine schedule open kar raha hoon.` : res.message,
      actions: [{ label: 'View Routine', url: '/dashboard' }],
      toolExecuted: 'getMyRoutine'
    };
  }

  // L. HELPFUL DISCOVERY FALLBACK FOR UNKNOWN QUERIES (Never repeat generic welcome greetings)
  return {
    success: true,
    message: isHinglish
      ? `Main is command ko samajh nahi paaya. Aap mujhse DSA sheet, courses, routine, goals, latex editor open karne ya Student360 analytics pooch sakte hain.`
      : `I couldn't understand that request. You can ask me to open courses, DSA sheets, routine, goals, LaTeX editor, or analyze your learning score.`
  };
}
