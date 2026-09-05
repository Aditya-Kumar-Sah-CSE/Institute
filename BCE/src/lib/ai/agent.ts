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

  // Groq LLM Multi-Turn & Multi-Tool Loop
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

      const systemPrompt = `You are "Smart Learn Personal Assistant", a natural, friendly, human personal learning guide on Smart Learn.
You pair-learn with the logged-in student and help them control Smart Learn using natural language and voice.

Here is the student's REAL 360° Learning Profile & Page Context JSON:
${JSON.stringify(agentContext, null, 2)}

HUMAN CONVERSATION PERSONA & RULES:
1. TALK LIKE A HELPFUL HUMAN ASSISTANT:
   - Use short, natural, friendly replies (1-3 sentences max).
   - Match the student's language naturally (Hinglish if user speaks Hinglish/Hindi like "bhai meri dsa kholo", English if English like "open my dsa").
   - Conversational Examples:
     * User: "bhai meri dsa kholo" -> "Bilkul! Tumhari DSA sheet khol raha hoon."
     * User: "problem 4" -> "Problem 4 open kar raha hoon."
     * User: "isko youtube pe search kr" -> "Sure, isi problem ko YouTube par search kar raha hoon."
     * User: "latex me kholo" -> "LaTeX editor open kar diya."
   - NEVER use robotic phrases like "I will now attempt to execute..." or mention internal function names.

2. CONTEXT & FOLLOW-UP MEMORY:
   - Remember previous turns in conversation history and current page context.
   - Understand pronouns and implicit references ("isko", "this", "yt", "latex", "problem 4") refer to the currently active problem or course.

3. ACTION EXECUTION & TOOL SELECTION:
   - Execute tools from registry to perform actions (navigate, search, view, create/update routine/goals).
   - Never invent internal URLs. Use only trusted routes from tools.

4. REAL EVIDENCE & PERSONALIZATION:
   - For recommendations, use actual Student360 metrics (e.g. "DBMS score 58% hai, isliye SQL Advanced recommend kar raha hoon").
   - For 30-day plans, analyze routine, goals, courses, and weak areas. If routine/goals missing, output: "I don't have enough routine or goal data yet. Add your routine/goals first."
   - Never invent marks, CGPA, courses, or progress.`;

      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: userPrompt }
      ];

      let loopCount = 0;
      let lastExecutedTool: string | undefined = undefined;
      let accumulatedActions: Array<{ label: string; url: string; isExternal?: boolean }> = [];
      let requiresConfirmation: any = undefined;

      while (loopCount < 3) {
        loopCount++;
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

        if (!groqResponse.ok) break;

        const data = await groqResponse.json();
        const choiceMessage = data.choices?.[0]?.message;
        if (!choiceMessage) break;

        if (choiceMessage.tool_calls && choiceMessage.tool_calls.length > 0) {
          messages.push(choiceMessage);

          for (const toolCall of choiceMessage.tool_calls) {
            const toolName = toolCall.function.name;
            const rawArgs = toolCall.function.arguments || '{}';
            let parsedArgs = {};
            try { parsedArgs = JSON.parse(rawArgs); } catch (e) {}

            if (AGENT_TOOLS[toolName]) {
              lastExecutedTool = toolName;
              const result: AgentToolResult = await AGENT_TOOLS[toolName].execute(parsedArgs, user, pageContext);

              if (result.requiresConfirmation) {
                requiresConfirmation = result.requiresConfirmation;
              }

              if (result.url) {
                accumulatedActions.push({ label: 'Open Page', url: result.url });
              }
              if (result.externalUrl) {
                accumulatedActions.push({ label: 'View External Link', url: result.externalUrl, isExternal: true });
              }

              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
              });
            }
          }

          if (requiresConfirmation) {
            return {
              success: true,
              message: requiresConfirmation.promptMessage,
              requiresConfirmation,
              toolExecuted: lastExecutedTool
            };
          }
        } else if (choiceMessage.content) {
          return {
            success: true,
            message: choiceMessage.content,
            actions: accumulatedActions.length > 0 ? accumulatedActions : undefined,
            toolExecuted: lastExecutedTool
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
  const isHinglish = /bhai|kholo|karo|dikhao|kr|mera|meri|tumhari|par|pe|kya|h|sawal|banao/i.test(prompt);

  // 1. YouTube / Web / GPT Search
  if (p.includes('youtube') || p.includes('video') || p.includes('yt')) {
    const q = pageContext?.problemTitle || prompt.replace(/youtube|search|video|yt|pe|par|khoro|kholo|kr|kar/gi, '').trim() || 'DSA problem solution';
    const res = await AGENT_TOOLS.searchYouTube.execute({ query: q }, user, pageContext);
    return {
      success: true,
      message: isHinglish ? `Sure! "${q}" ko YouTube par search kar raha hoon.` : `Searching YouTube for "${q}".`,
      actions: [{ label: 'Watch on YouTube', url: res.externalUrl!, isExternal: true }],
      toolExecuted: 'searchYouTube'
    };
  }

  if (p.includes('gpt') || p.includes('chatgpt')) {
    const q = pageContext?.problemTitle || prompt.replace(/gpt|chatgpt|search|pe|par|khoro|kholo|kr|kar/gi, '').trim() || 'Explain solution';
    const res = await AGENT_TOOLS.searchGPT.execute({ query: q }, user, pageContext);
    return {
      success: true,
      message: isHinglish ? `ChatGPT par "${q}" open kar raha hoon.` : `Opening ChatGPT for "${q}".`,
      actions: [{ label: 'Open ChatGPT', url: res.externalUrl!, isExternal: true }],
      toolExecuted: 'searchGPT'
    };
  }

  // 2. LaTeX Editor
  if (p.includes('latex') || p.includes('equation') || p.includes('formula')) {
    const res = await AGENT_TOOLS.openLatexEditor.execute({ problemId: pageContext?.problemId }, user);
    return {
      success: true,
      message: isHinglish ? 'Bilkul, LaTeX editor open kar raha hoon.' : 'Opening LaTeX Editor.',
      actions: [{ label: 'Open LaTeX Editor', url: res.url! }],
      toolExecuted: 'openLatexEditor'
    };
  }

  // 3. Problem / DSA Sheet Commands
  if (p.includes('weakest problem') || p.includes('weakest dsa') || p.includes('weak topic problem')) {
    const res = await AGENT_TOOLS.openWeakestDSAProblem.execute({}, user);
    return {
      success: true,
      message: isHinglish ? `Tumhara weak topic ${profile.weakAreas[0] || 'DSA'} hai. Matching problem open kar raha hoon.` : res.message,
      actions: [{ label: 'Open Problem', url: res.url! }],
      toolExecuted: 'openWeakestDSAProblem'
    };
  }

  if (p.includes('problem') || p.includes('question') || p.includes('sawal') || /^\s*problem\s*\d+\s*$/i.test(prompt)) {
    const matchNum = p.match(/\b\d+\b/);
    const queryStr = matchNum ? `Problem ${matchNum[0]}` : prompt.replace(/open|kholo|problem|question|sawal/gi, '').trim();
    const res = await AGENT_TOOLS.openDSAProblem.execute({ query: queryStr }, user);
    return {
      success: true,
      message: isHinglish ? `${queryStr || 'Problem'} open kar raha hoon.` : `Opening ${queryStr || 'problem'}.`,
      actions: [{ label: 'Open Problem', url: res.url! }],
      toolExecuted: 'openDSAProblem'
    };
  }

  if (p.includes('dsa') || p.includes('sheet') || p.includes('coding')) {
    const res = await AGENT_TOOLS.openDSASheets.execute({}, user);
    return {
      success: true,
      message: isHinglish ? 'Bilkul, tumhari DSA sheet khol raha hoon.' : 'Opening your DSA sheets.',
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
      message: isHinglish ? `Tumhara ${courseQuery || 'enrolled'} course open kar raha hoon.` : res.message,
      actions: [{ label: 'Open Course', url: res.url! }],
      toolExecuted: 'openCourse'
    };
  }

  // 5. Guidance / Recommendations ("main kya karu?", "next kya padhna chahiye?")
  if (p.includes('kya karu') || p.includes('next') || p.includes('recommend') || p.includes('weakest skill')) {
    const topRec = profile.recommendations[0];
    const weak = profile.weakAreas[0] || 'DBMS';
    return {
      success: true,
      message: isHinglish 
        ? `Tumhara ${weak} accuracy low hai. Main ${topRec ? topRec.title : 'courses'} recommend kar raha hoon.`
        : `Based on your profile, your main focus area is ${weak}. I recommend ${topRec ? topRec.title : 'exploring courses'}.`,
      actions: [{ label: topRec ? topRec.actionText : 'Explore Courses', url: topRec ? topRec.actionUrl : '/courses' }]
    };
  }

  // 6. 30-Day Plan / Roadmap
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

Week 1: ${mainWeakness} basics (${currentCourse}) - Daily 1 session + 20 MCQs
Week 2: ${mainWeakness} practice - Daily 30 min practice
Week 3: DSA weak topic - Daily 2 problems
Week 4: Revision + assessment

Today's Task:
Complete 20 MCQs and study 30 mins of ${mainWeakness}.

Why:
Based on your current ${currentCourse} progress of ${currentProgress}% and gap in ${mainWeakness}.`,
      actions: [{ label: 'Explore Courses', url: '/courses' }, { label: 'Solve DSA Sheets', url: '/code-arena/sheets' }]
    };
  }

  // 7. Routine & Goals
  if (p.includes('routine') || p.includes('schedule') || p.includes('timetable')) {
    const res = await AGENT_TOOLS.getMyRoutine.execute({}, user);
    return {
      success: true,
      message: isHinglish ? `Tumhari daily routine schedule open kar raha hoon.` : res.message,
      actions: [{ label: 'View Routine', url: '/dashboard' }],
      toolExecuted: 'getMyRoutine'
    };
  }

  if (p.includes('goal') || p.includes('target')) {
    const res = await AGENT_TOOLS.getMyGoals.execute({}, user);
    return {
      success: true,
      message: isHinglish ? `Tumhare active goals open kar raha hoon.` : res.message,
      actions: [{ label: 'View Goals', url: '/dashboard' }],
      toolExecuted: 'getMyGoals'
    };
  }

  // 8. Program / Seat / Admission queries
  if (p.includes('seat') || p.includes('bsc') || p.includes('b.sc') || p.includes('admission')) {
    const prog = (p.includes('bsc') || p.includes('b.sc')) ? 'B.Sc' : '';
    const res = await AGENT_TOOLS.searchProgramSeats.execute({ programName: prog }, user);
    return {
      success: true,
      message: res.message,
      actions: [{ label: 'Explore Courses', url: '/courses' }],
      toolExecuted: 'searchProgramSeats'
    };
  }

  // 9. Notifications / Leaderboard / Doubts
  if (p.includes('notice') || p.includes('notification')) {
    const res = await AGENT_TOOLS.openNotifications.execute({}, user);
    return { success: true, message: isHinglish ? 'Notices section open kar raha hoon.' : res.message, actions: [{ label: 'View Notices', url: res.url! }], toolExecuted: 'openNotifications' };
  }

  if (p.includes('leaderboard') || p.includes('rank')) {
    const res = await AGENT_TOOLS.openLeaderboard.execute({}, user);
    return { success: true, message: isHinglish ? 'Leaderboard open kar raha hoon.' : res.message, actions: [{ label: 'View Leaderboard', url: res.url! }], toolExecuted: 'openLeaderboard' };
  }

  if (p.includes('doubt')) {
    const res = await AGENT_TOOLS.openDoubts.execute({}, user);
    return { success: true, message: isHinglish ? 'Doubts section open kar raha hoon.' : res.message, actions: [{ label: 'View Doubts', url: res.url! }], toolExecuted: 'openDoubts' };
  }

  // 10. Profile / Certificates
  if (p.includes('certificate') || p.includes('degree')) {
    const res = await AGENT_TOOLS.openCertificate.execute({}, user);
    return {
      success: true,
      message: isHinglish ? `Tumhare certificates open kar raha hoon.` : res.message,
      actions: [{ label: 'View Certificates', url: res.url! }],
      toolExecuted: 'openCertificate'
    };
  }

  if (p.includes('profile')) {
    const res = await AGENT_TOOLS.openProfile.execute({}, user);
    return {
      success: true,
      message: isHinglish ? `Tumhari profile open kar raha hoon.` : res.message,
      actions: [{ label: 'Open Profile', url: res.url! }],
      toolExecuted: 'openProfile'
    };
  }

  // Direct factual response for unknown queries (NEVER return generic welcome greeting)
  return {
    success: true,
    message: isHinglish 
      ? `Smart Learn database me abhi is query ka specific data recorded nahi hai. Aap active courses ya DSA section check kar sakte hain.`
      : `I don't have specific recorded data for that query in Smart Learn. You can explore the active courses or DSA section.`
  };
}
