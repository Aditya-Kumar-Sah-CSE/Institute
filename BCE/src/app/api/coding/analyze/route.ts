import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { createAdminClient } from '@/lib/supabase/server';
import { decryptKey } from '@/lib/security/encryption';
import { GoogleGenAI } from '@google/genai';
import { analyzeCodeWithSmartAgent } from '@/features/code-arena/lib/smartCodeAnalyzer';

// In-memory cache for fast repeated analysis of the same code + problem
const analysisCache = new Map<string, any>();

async function getAvailableAiCredentials(userId?: string): Promise<{ provider: 'groq' | 'gemini'; apiKey: string } | null> {
  const admin = await createAdminClient();

  // 1. Try authenticated user's own connected key
  if (userId) {
    const { data: userKeys } = await admin
      .from('user_ai_providers')
      .select('provider, encrypted_api_key')
      .eq('user_id', userId);

    if (userKeys && userKeys.length > 0) {
      // Prioritize groq for ultra-fast response, then gemini
      const groqKey = userKeys.find(k => k.provider === 'groq');
      if (groqKey?.encrypted_api_key) {
        return { provider: 'groq', apiKey: decryptKey(groqKey.encrypted_api_key) };
      }
      const gemKey = userKeys.find(k => k.provider === 'gemini');
      if (gemKey?.encrypted_api_key) {
        return { provider: 'gemini', apiKey: decryptKey(gemKey.encrypted_api_key) };
      }
    }
  }

  // 2. Try platform connected key in user_ai_providers (e.g. admin or faculty key)
  const { data: allKeys } = await admin
    .from('user_ai_providers')
    .select('provider, encrypted_api_key')
    .order('created_at', { ascending: false });

  if (allKeys && allKeys.length > 0) {
    const groqKey = allKeys.find(k => k.provider === 'groq');
    if (groqKey?.encrypted_api_key) {
      return { provider: 'groq', apiKey: decryptKey(groqKey.encrypted_api_key) };
    }
    const gemKey = allKeys.find(k => k.provider === 'gemini');
    if (gemKey?.encrypted_api_key) {
      return { provider: 'gemini', apiKey: decryptKey(gemKey.encrypted_api_key) };
    }
  }

  // 3. Fallback to process.env
  if (process.env.GROQ_API_KEY) {
    return { provider: 'groq', apiKey: process.env.GROQ_API_KEY };
  }
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    return { provider: 'gemini', apiKey: (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)! };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      problemId,
      problemTitle = 'Coding Problem',
      language = 'cpp',
      code = '',
      runtimeMs = 12,
      memoryMb = 14.5,
      passedTests = 5,
      totalTests = 5,
      constraints = '',
      metadata,
    } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Cache key
    const cacheKey = `${problemId || problemTitle}:${language}:${code.trim().slice(0, 500)}`;
    if (analysisCache.has(cacheKey)) {
      return NextResponse.json({
        success: true,
        analysis: analysisCache.get(cacheKey),
        source: 'cache',
      });
    }

    // Fetch problem details if not supplied
    let desc = '';
    let constr = constraints;
    if (problemId) {
      const { data: prob } = await supabase
        .from('coding_problems')
        .select('title, description, constraints')
        .eq('id', problemId)
        .maybeSingle();

      if (prob) {
        desc = prob.description || '';
        constr = constr || prob.constraints || '';
      }
    }

    const aiCreds = await getAvailableAiCredentials(user.id);
    if (!aiCreds) {
      // Fallback to smart heuristic analyzer
      const fallback = analyzeCodeWithSmartAgent(
        code,
        language,
        metadata,
        problemTitle,
        passedTests,
        totalTests,
        runtimeMs,
        memoryMb
      );
      return NextResponse.json({
        success: true,
        analysis: fallback,
        source: 'heuristic',
      });
    }

    const systemInstruction = `You are an elite competitive programming and algorithmic code judge.
Analyze the student's exact code implementation for the given problem.
Evaluate:
1. Exact Time Complexity Big-O (e.g. "O(N)", "O(N log N)", "O(1)", etc.) with 1 crisp sentence explaining their exact loops/recursion logic.
2. Exact Space Complexity Big-O (e.g. "O(1)", "O(N)", etc.) with 1 crisp sentence explaining their exact memory allocations.
3. Realistic score between 1.0 and 10.0 (overallRating) and label ("Optimal Solution" | "High Efficiency" | "Needs Optimization").
4. 3 crisp Key Algorithmic Logic bullets specifically describing what this student's code does:
   - "Approach: <specific algorithm or technique used in their code>"
   - "Iteration: <how their loops/traversals behave>"
   - "Memory: <how their memory/variables are allocated>"
5. Specific Code Optimization Advice (strictly <= 80 words) pointing to their specific variables/functions/loops. Do not write generic boilerplate!

Output MUST be valid JSON matching this exact structure:
{
  "analyzedTime": "O(N)",
  "timeExplanation": "...",
  "analyzedSpace": "O(1)",
  "spaceExplanation": "...",
  "overallRating": 9.5,
  "ratingLabel": "Optimal Solution",
  "keyLogic": [
    "Approach: ...",
    "Iteration: ...",
    "Memory: ..."
  ],
  "optimizationTip": "..."
}`;

    const userPrompt = `Problem Title: ${problemTitle}
${desc ? `Description:\n${desc.slice(0, 1000)}\n` : ''}
${constr ? `Constraints:\n${constr}\n` : ''}
Language: ${language}
Execution Stats: ${runtimeMs}ms, ${memoryMb}MB memory, passed ${passedTests}/${totalTests} tests.

Student's Written Code:
\`\`\`${language}
${code}
\`\`\``;

    let aiResultText = '';

    if (aiCreds.provider === 'groq') {
      const groqModels = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
      for (const m of groqModels) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${aiCreds.apiKey}`,
            },
            body: JSON.stringify({
              model: m,
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: userPrompt },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.2,
            }),
          });
          const data = await res.json();
          if (data.choices?.[0]?.message?.content) {
            aiResultText = data.choices[0].message.content;
            break;
          }
        } catch {
          // Try next model
        }
      }
    }

    if (!aiResultText && aiCreds.provider === 'gemini') {
      const client = new GoogleGenAI({ apiKey: aiCreds.apiKey });
      const geminiModels = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite'];
      for (const m of geminiModels) {
        try {
          const res = await client.models.generateContent({
            model: m,
            contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
            config: { responseMimeType: 'application/json' },
          });
          if (res.text) {
            aiResultText = res.text;
            break;
          }
        } catch {
          // Try next
        }
      }
    }

    if (aiResultText) {
      try {
        const parsed = JSON.parse(aiResultText);
        const analysis = {
          analyzedTime: parsed.analyzedTime || 'O(N)',
          timeExplanation: parsed.timeExplanation || 'Linear iteration over input elements',
          analyzedSpace: parsed.analyzedSpace || 'O(1)',
          spaceExplanation: parsed.spaceExplanation || 'Constant auxiliary memory usage',
          overallRating: Number(parsed.overallRating || 9.0),
          ratingLabel: parsed.ratingLabel || 'Optimal Solution',
          keyLogic: Array.isArray(parsed.keyLogic) && parsed.keyLogic.length > 0 ? parsed.keyLogic : [
            'Approach: Problem-specific algorithmic solution',
            'Iteration: Elements processed in sequence',
            'Memory: In-place scalar variables',
          ],
          optimizationTip: parsed.optimizationTip || 'Optimal implementation!',
          isOptimal: Number(parsed.overallRating || 9.0) >= 8.5,
          isRealAi: true,
        };

        // Cache result (limit cache to 200 items)
        if (analysisCache.size > 200) analysisCache.clear();
        analysisCache.set(cacheKey, analysis);

        return NextResponse.json({
          success: true,
          analysis,
          source: 'real_ai',
        });
      } catch (parseErr) {
        console.error('[AI_ANALYZE_PARSE_ERROR]', parseErr);
      }
    }

    // Fallback if AI call failed
    const fallback = analyzeCodeWithSmartAgent(
      code,
      language,
      metadata,
      problemTitle,
      passedTests,
      totalTests,
      runtimeMs,
      memoryMb
    );
    return NextResponse.json({
      success: true,
      analysis: fallback,
      source: 'heuristic_fallback',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

