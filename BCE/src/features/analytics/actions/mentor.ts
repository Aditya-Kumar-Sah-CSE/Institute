'use server';

import { getUser } from '@/lib/supabase/server';
import { getStudent360Profile, Student360Profile } from '../services/student-intelligence';

export interface MentorChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actionButtons?: Array<{ label: string; url: string }>;
  timestamp?: string;
}

export async function askSmartMentorAction(input: {
  prompt: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{
  success: boolean;
  reply?: string;
  actionButtons?: Array<{ label: string; url: string }>;
  error?: string;
}> {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Authentication required. Please log in.' };
    }

    const studentProfile = await getStudent360Profile(user.id);
    const userPrompt = input.prompt.trim();

    const groqApiKey = process.env.GROQ_API_KEY;

    if (groqApiKey) {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: buildSystemPrompt(studentProfile)
              },
              ...(input.history || []).slice(-6).map(h => ({
                role: h.role,
                content: h.content
              })),
              {
                role: 'user',
                content: userPrompt
              }
            ],
            temperature: 0.4,
            max_tokens: 800
          })
        });

        if (groqResponse.ok) {
          const data = await groqResponse.json();
          const rawReply = data.choices?.[0]?.message?.content || '';
          if (rawReply) {
            const { reply, actionButtons } = parseMentorReply(rawReply, studentProfile);
            return { success: true, reply, actionButtons };
          }
        }
      } catch (err) {
        console.warn('Groq API call failed, using rule-based mentor fallback:', err);
      }
    }

    // Rule-Based Fallback Engine (Used if GROQ_API_KEY is unconfigured or request fails)
    const fallback = generateRuleBasedMentorReply(userPrompt, studentProfile);
    return {
      success: true,
      reply: fallback.reply,
      actionButtons: fallback.actionButtons
    };

  } catch (error: any) {
    console.error('Error in askSmartMentorAction:', error);
    return {
      success: false,
      error: 'Smart Mentor is temporarily unavailable. Please try again in a moment.'
    };
  }
}

function buildSystemPrompt(profile: Student360Profile): string {
  const compactContext = {
    hasSufficientData: profile.hasSufficientData,
    overallLearningScore: profile.overallLearningScore,
    academicScore: profile.academicScore,
    skillScore: profile.skillScore,
    codingScore: profile.codingScore,
    learningScore: profile.learningScore,
    assessmentScore: profile.assessmentScore,
    confidenceLevel: profile.confidenceLevel,
    coverage: profile.dataCoverage,
    strengths: profile.strengths,
    weakAreas: profile.weakAreas,
    skillGaps: profile.skillGaps,
    nextBestAction: profile.nextBestAction,
    recommendations: profile.recommendations.map(r => ({
      title: r.title,
      type: r.type,
      evidenceWhy: r.evidenceWhy,
      actionUrl: r.actionUrl
    }))
  };

  return `You are "Smart Mentor", the official personal AI learning guide on the Smart Learn platform.
You are pair-learning with the logged-in student.

Here is the student's REAL 360° Learning Profile JSON computed from Smart Learn database data:
${JSON.stringify(compactContext, null, 2)}

STRICT RULES & CONSTRAINTS:
1. You MUST NEVER calculate, guess, or invent marks, CGPA, DSA counts, course completion %, test scores, or certificates. Use ONLY the facts provided in the profile JSON above.
2. If data is missing or user has insufficient data, explicitly state: "I don't have enough data recorded yet for that area."
3. When providing learning recommendations or answering questions, structure your answers clearly with these 3 sections when applicable:
   - **WHY?** (Explain evidence from profile JSON)
   - **WHAT TO DO?** (Actionable advice)
   - **NEXT STEP?** (Single clear next action)
4. Format valid action buttons at the VERY END of your message using this exact syntax:
   [ACTION_BUTTONS: [{"label": "Explore Course", "url": "/courses"}, {"label": "Solve DSA Sheet", "url": "/code-arena/sheets"}]]
   ONLY use valid existing Smart Learn routes: /courses, /courses/[id], /code-arena/sheets, /code-arena/sheets/[id], /profile, /certificates.
5. Provide helpful, encouraging, concise responses in friendly Hinglish/English. Keep answers crisp and focused.`;
}

function parseMentorReply(rawReply: string, profile: Student360Profile) {
  let reply = rawReply;
  let actionButtons: Array<{ label: string; url: string }> | undefined = undefined;

  const actionMatch = rawReply.match(/\[ACTION_BUTTONS:\s*(\[[\s\S]*?\])\]/);
  if (actionMatch) {
    try {
      actionButtons = JSON.parse(actionMatch[1]);
      reply = rawReply.replace(/\[ACTION_BUTTONS:\s*(\[[\s\S]*?\])\]/, '').trim();
    } catch (e) {
      console.warn('Failed to parse action buttons JSON:', e);
    }
  }

  // Fallback default action button if none parsed but profile has next action
  if (!actionButtons && profile.nextBestAction) {
    actionButtons = [{
      label: profile.nextBestAction.actionText,
      url: profile.nextBestAction.actionUrl
    }];
  }

  return { reply, actionButtons };
}

function generateRuleBasedMentorReply(prompt: string, profile: Student360Profile) {
  const p = prompt.toLowerCase();
  const { dataCoverage, overallLearningScore, strengths, weakAreas, skillGaps, nextBestAction, recommendations } = profile;

  // 1. 30-Day Plan Request
  if (p.includes('30 day') || p.includes('30-day') || p.includes('plan') || p.includes('roadmap')) {
    const mainWeakness = weakAreas[0] || 'Core Skills';
    const topRec = recommendations[0];
    const recUrl = topRec ? topRec.actionUrl : '/courses';

    return {
      reply: `Here is your **Personalized 30-Day Learning Plan** based on your Smart Learn profile gaps:

**Week 1: Focus & Foundation**
- Complete your current enrolled course modules in **${mainWeakness}**.
- Aim for 1 hour of focused daily reading/videos.

**Week 2: Targeted Practice**
- Solve 5 problem sets in DSA / Code Arena.
- Target topic accuracy of 75%+.

**Week 3: Assessment & Evaluation**
- Attempt course MCQ tests to test concept retention.
- Review weak questions immediately after submission.

**Week 4: Revision & Benchmark**
- Re-attempt quizzes and complete your milestone project/certificate.

**WHY?**
Based on your current Learning Readiness score of **${overallLearningScore}/100** and identified gap in **${mainWeakness}**.

**WHAT TO DO?**
Follow the weekly plan consistently to boost your Readiness score by 15+ points.

**NEXT STEP?**
Start with your top recommended item below:`,
      actionButtons: [
        { label: topRec ? topRec.actionText : 'Explore Courses', url: recUrl },
        { label: 'Solve DSA Sheets', url: '/code-arena/sheets' }
      ]
    };
  }

  // 2. DSA Analysis Request
  if (p.includes('dsa') || p.includes('coding') || p.includes('problem')) {
    return {
      reply: `Here is your **DSA & Coding Performance Breakdown**:

- **Problems Solved:** ${dataCoverage.dsaSolvedCount} problems
- **Coding Score:** ${profile.codingScore}/100
- **Status:** ${dataCoverage.dsaSolvedCount >= 10 ? 'Strong consistency in solving DSA sheets.' : 'Needs more practice. Solving 10+ problems unlocks advanced readiness.'}

**WHY?**
Calculated from your active DSA sheet enrollments and submitted problem solutions in Code Arena.

**WHAT TO DO?**
Pick a structured DSA sheet (such as Striver/Blind 75) and solve 2 problems daily.

**NEXT STEP?**
Head to Code Arena to solve your next problem:`,
      actionButtons: [
        { label: 'View DSA Sheets', url: '/code-arena/sheets' }
      ]
    };
  }

  // 3. Weakest Skill / Improvement Request
  if (p.includes('weak') || p.includes('improve') || p.includes('gap')) {
    const mainWeak = weakAreas[0] || 'Course Completion Progress';
    const gapInfo = skillGaps[0];

    return {
      reply: `Based on your Smart Learn activity, your primary area needing improvement is **${mainWeak}**.

- **Current Readiness Score:** ${overallLearningScore}/100
- **Assessment Accuracy:** ${profile.assessmentScore}% (${dataCoverage.assessmentsCount} tests attempted)
${gapInfo ? `- **Target Gap:** Current ${gapInfo.currentCapability}% vs Target ${gapInfo.targetCapability}% (Gap: -${gapInfo.gap}%)` : ''}

**WHY?**
${gapInfo ? gapInfo.evidence : `Based on your course progress of ${profile.learningScore}% across ${dataCoverage.coursesCount} enrolled courses.`}

**WHAT TO DO?**
Focus on completing course lessons and re-attempting quizzes to improve accuracy above 80%.

**NEXT STEP?**
Take action on your top priority task below:`,
      actionButtons: [
        { label: nextBestAction ? nextBestAction.actionText : 'View Courses', url: nextBestAction ? nextBestAction.actionUrl : '/courses' }
      ]
    };
  }

  // 4. Default General Next Step / Recommendation Query
  const topRec = recommendations[0];
  return {
    reply: `Hi! Based on your Smart Learn 360° Profile:

- **Overall Readiness:** ${overallLearningScore}/100
- **Key Strengths:** ${strengths.slice(0, 2).join(', ') || 'Active Learner'}
- **Current Focus:** ${weakAreas[0] || 'Course Completion'}

**WHY?**
${topRec ? topRec.evidenceWhy : `Calculated from your ${dataCoverage.coursesCount} courses and ${dataCoverage.assessmentsCount} assessments.`}

**WHAT TO DO?**
${topRec ? topRec.description : 'Explore Smart Learn courses and DSA sheets to boost your profile scores.'}

**NEXT STEP?**
${topRec ? `Start ${topRec.title} now.` : 'Explore recommended courses below.'}`,
    actionButtons: [
      { label: topRec ? topRec.actionText : 'Explore Courses', url: topRec ? topRec.actionUrl : '/courses' }
    ]
  };
}
