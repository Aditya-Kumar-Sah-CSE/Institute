import { AGENT_TOOLS, AgentToolResult } from './agent-tools';
import { buildAgentContext, AgentPageContext } from './agent-context';
import { Student360Profile } from '@/features/analytics/services/student-intelligence';

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
}

export async function runSmartAgent(params: {
  user: { id: string };
  studentProfile: Student360Profile;
  prompt: string;
  history?: AgentChatMessage[];
  pageContext?: AgentPageContext;
}): Promise<AgentResponse> {
  const { user, studentProfile, prompt, history = [], pageContext } = params;
  const userPrompt = prompt.trim();
  const groqApiKey = process.env.GROQ_API_KEY;

  const agentContext = buildAgentContext(studentProfile, pageContext);

  // Attempt Groq LLM tool calling if key available
  if (groqApiKey) {
    try {
      const toolDefs = Object.values(AGENT_TOOLS).map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));

      const systemPrompt = `You are "Smart Learn AI Agent", an intelligent, helpful personal assistant for Smart Learn.
You control application actions by executing tools from your central tool registry.

Context JSON:
${JSON.stringify(agentContext, null, 2)}

STRICT RULES:
1. ALWAYS select the appropriate tool when user asks to open, search, navigate, view, or modify routine/goals.
2. For YouTube / web / GPT searches, use searchYouTube, searchWeb, or searchGPT tool with query or current page context.
3. NEVER invent raw URLs. Use registered tools to navigate.
4. Keep responses concise, friendly, and helpful (max 2-3 sentences).
5. For "30 day plan" or roadmap requests, analyze the routine and goals in context, and if routine/goals missing output: "I don't have enough routine or goal data yet. Add your routine/goals first."`;

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
          model: 'llama-3.3-70b-versatile',
          messages,
          tools: toolDefs,
          tool_choice: 'auto',
          temperature: 0.3,
          max_tokens: 600
        })
      });

      if (groqResponse.ok) {
        const data = await groqResponse.json();
        const choice = data.choices?.[0]?.message;

        if (choice?.tool_calls && choice.tool_calls.length > 0) {
          const toolCall = choice.tool_calls[0];
          const toolName = toolCall.function.name;
          const rawArgs = toolCall.function.arguments || '{}';
          
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(rawArgs);
          } catch (e) {
            console.warn('Failed to parse tool arguments:', e);
          }

          if (AGENT_TOOLS[toolName]) {
            const tool = AGENT_TOOLS[toolName];
            const result: AgentToolResult = await tool.execute(parsedArgs, user, pageContext);

            if (result.requiresConfirmation) {
              return {
                success: true,
                message: result.message || 'Confirmation required for this action.',
                requiresConfirmation: result.requiresConfirmation,
                toolExecuted: toolName
              };
            }

            const actions: Array<{ label: string; url: string; isExternal?: boolean }> = [];
            if (result.url) {
              actions.push({ label: 'Open Page', url: result.url });
            }
            if (result.externalUrl) {
              actions.push({ label: 'View External Search', url: result.externalUrl, isExternal: true });
            }

            return {
              success: true,
              message: choice.content || result.message,
              actions: actions.length > 0 ? actions : undefined,
              toolExecuted: toolName
            };
          }
        } else if (choice?.content) {
          return {
            success: true,
            message: choice.content
          };
        }
      }
    } catch (err) {
      console.warn('Groq Agent API error, using rule-based tool fallback:', err);
    }
  }

  // Deterministic Rule-Based Fallback Engine
  return await resolveFallbackAgentCommand(userPrompt, user, studentProfile, pageContext);
}

async function resolveFallbackAgentCommand(
  prompt: string,
  user: { id: string },
  profile: Student360Profile,
  pageContext?: AgentPageContext
): Promise<AgentResponse> {
  const p = prompt.toLowerCase();

  // 1. YouTube / Web / GPT Search
  if (p.includes('youtube') || p.includes('video')) {
    const q = pageContext?.problemTitle || prompt.replace(/youtube|search|video|pe|par|khoro|kholo/gi, '').trim() || 'DSA problem solution';
    const res = await AGENT_TOOLS.searchYouTube.execute({ query: q }, user, pageContext);
    return {
      success: true,
      message: res.message,
      actions: [{ label: 'Watch on YouTube', url: res.externalUrl!, isExternal: true }],
      toolExecuted: 'searchYouTube'
    };
  }

  if (p.includes('gpt') || p.includes('chatgpt')) {
    const q = pageContext?.problemTitle || prompt.replace(/gpt|chatgpt|search|pe|par|khoro|kholo/gi, '').trim() || 'Explain solution';
    const res = await AGENT_TOOLS.searchGPT.execute({ query: q }, user, pageContext);
    return {
      success: true,
      message: res.message,
      actions: [{ label: 'Open ChatGPT', url: res.externalUrl!, isExternal: true }],
      toolExecuted: 'searchGPT'
    };
  }

  // 2. LaTeX Editor
  if (p.includes('latex') || p.includes('equation') || p.includes('formula')) {
    const res = await AGENT_TOOLS.openLatexEditor.execute({ problemId: pageContext?.problemId }, user);
    return {
      success: true,
      message: res.message,
      actions: [{ label: 'Open LaTeX Editor', url: res.url! }],
      toolExecuted: 'openLatexEditor'
    };
  }

  // 3. Problem / DSA Sheet Commands
  if (p.includes('weakest problem') || p.includes('weakest dsa') || p.includes('weak topic problem')) {
    const res = await AGENT_TOOLS.openWeakestDSAProblem.execute({}, user);
    return {
      success: true,
      message: res.message,
      actions: [{ label: 'Open Problem', url: res.url! }],
      toolExecuted: 'openWeakestDSAProblem'
    };
  }

  if (p.includes('problem') || p.includes('question') || p.includes('sawal')) {
    const matchNum = p.match(/\b\d+\b/);
    const queryStr = matchNum ? `Problem ${matchNum[0]}` : prompt.replace(/open|kholo|problem|question|sawal/gi, '').trim();
    const res = await AGENT_TOOLS.openDSAProblem.execute({ query: queryStr }, user);
    return {
      success: true,
      message: res.message,
      actions: [{ label: 'Open Problem', url: res.url! }],
      toolExecuted: 'openDSAProblem'
    };
  }

  if (p.includes('dsa') || p.includes('sheet') || p.includes('coding')) {
    const res = await AGENT_TOOLS.openDSASheets.execute({}, user);
    return {
      success: true,
      message: res.message,
      actions: [{ label: 'Open DSA Sheets', url: res.url! }],
      toolExecuted: 'openDSASheets'
    };
  }

  // 4. Courses
  if (p.includes('course') || p.includes('subject') || p.includes('itw') || p.includes('dbms')) {
    const courseQuery = p.includes('itw') ? 'ITW' : p.includes('dbms') ? 'DBMS' : '';
    const res = await AGENT_TOOLS.openCourse.execute({ courseName: courseQuery }, user);
    return {
      success: true,
      message: res.message,
      actions: [{ label: 'Open Course', url: res.url! }],
      toolExecuted: 'openCourse'
    };
  }

  // 5. 30-Day Plan / Roadmap
  if (p.includes('30 day') || p.includes('30-day') || p.includes('plan') || p.includes('roadmap')) {
    const hasRoutines = profile.dailyRoutines && profile.dailyRoutines.length > 0;
    const hasGoals = profile.activeGoals && profile.activeGoals.length > 0;

    if (!hasRoutines && !hasGoals) {
      return {
        success: true,
        message: "I don't have enough routine or goal data yet. Add your routine/goals first.",
        actions: [{ label: 'Set Goals & Routine', url: '/dashboard' }]
      };
    }

    const mainWeakness = profile.weakAreas[0] || 'Core Skills';
    const currentCourse = profile.enrolledCoursesData[0]?.title || 'Enrolled Course';
    const currentProgress = profile.enrolledCoursesData[0]?.progress || 0;

    return {
      success: true,
      message: `30-Day Plan

Week 1
• Focus: ${mainWeakness} basics (${currentCourse})
• Daily: 1 study session + 20 MCQs
• Goal: complete ${Math.min(100, currentProgress + 20)}% of current course

Week 2
• Focus: ${mainWeakness} Practice
• Daily: 30 min practice
• Goal: finish selected modules

Week 3
• Focus: DSA weak topic
• Daily: 2 problems
• Goal: improve accuracy

Week 4
• Focus: Revision + assessment
• Goal: reassess weak areas

Today's Task:
Complete 20 MCQs and study 30 mins of ${mainWeakness}.

Why:
Based on your current ${currentCourse} progress of ${currentProgress}% and recorded gap in ${mainWeakness}.`,
      actions: [{ label: 'Explore Courses', url: '/courses' }, { label: 'Solve DSA Sheets', url: '/code-arena/sheets' }]
    };
  }

  // 6. Routine & Goals
  if (p.includes('routine') || p.includes('schedule') || p.includes('timetable')) {
    const res = await AGENT_TOOLS.getMyRoutine.execute({}, user);
    return {
      success: true,
      message: res.message,
      actions: [{ label: 'View Routine', url: '/dashboard' }],
      toolExecuted: 'getMyRoutine'
    };
  }

  if (p.includes('goal') || p.includes('target')) {
    const res = await AGENT_TOOLS.getMyGoals.execute({}, user);
    return {
      success: true,
      message: res.message,
      actions: [{ label: 'View Goals', url: '/dashboard' }],
      toolExecuted: 'getMyGoals'
    };
  }

  // 7. Profile / Certificates / Dashboard
  if (p.includes('certificate') || p.includes('degree')) {
    const res = await AGENT_TOOLS.openCertificate.execute({}, user);
    return {
      success: true,
      message: res.message,
      actions: [{ label: 'View Certificates', url: res.url! }],
      toolExecuted: 'openCertificate'
    };
  }

  if (p.includes('profile')) {
    const res = await AGENT_TOOLS.openProfile.execute({}, user);
    return {
      success: true,
      message: res.message,
      actions: [{ label: 'Open Profile', url: res.url! }],
      toolExecuted: 'openProfile'
    };
  }

  // Fallback default
  return {
    success: true,
    message: `Smart Learn Agent active! I can open DSA sheets, search YouTube/GPT, launch LaTeX editor, manage routine/goals, or generate a 30-day plan.`,
    actions: [
      { label: 'Open DSA Sheets', url: '/code-arena/sheets' },
      { label: 'Explore Courses', url: '/courses' }
    ]
  };
}
