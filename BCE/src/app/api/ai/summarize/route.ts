import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { previousSummary, recentMessages, activeContext } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        summary: previousSummary || 'Student is actively using Smart Learn for placement preparation.'
      });
    }

    const clientAi = new GoogleGenAI({ apiKey });

    const formattedMsgs = Array.isArray(recentMessages) 
      ? recentMessages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')
      : '';

    const prompt = `You are a memory compaction engine for an AI student learning coach.
Summarize the student's conversation history into a clean, high-density rolling summary of approximately 150 to 220 words.

Target Constraints:
1. Length: 150-220 words.
2. Content to preserve:
   - Student's stated goals (placements vs academics, target topics).
   - Important preferences, corrections, or decisions (e.g. if student changed goal from Java to Python, prioritize Python).
   - Weak areas, ongoing learning plans, courses or DSA sheets discussed.
   - Unresolved questions or recent agent actions.
3. Content to OMIT:
   - Greetings, filler, verbal confirmations, long code snippets, duplicate info.
4. LATEST USER INFORMATION OVERRIDES OLD CONTEXT:
   - If new messages contradict previous summary, update the summary to reflect the latest truth.

PREVIOUS SUMMARY:
${previousSummary || 'None (New Conversation)'}

RECENT CONVERSATION TURNS:
${formattedMsgs || 'None'}

ACTIVE CONTEXT:
${JSON.stringify(activeContext || {})}

Write ONLY the 150-220 word summary text in natural language:`;

    const response = await clientAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 400,
        temperature: 0.2
      }
    });

    const summaryText = response.text ? response.text.trim() : previousSummary;

    return NextResponse.json({
      success: true,
      summary: summaryText
    });
  } catch (err: any) {
    console.error('[API Summarize Error]:', err);
    return NextResponse.json(
      {
        success: false,
        message: 'Summary generation failed, preserving previous memory.',
        summary: null
      },
      { status: 500 }
    );
  }
}
