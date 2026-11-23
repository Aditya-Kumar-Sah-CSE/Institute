import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { executeCodeResiliently } from '@/features/code-arena/execution-engine';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { problemId, input } = await request.json();
    if (!problemId || input === undefined || input === null) {
      return NextResponse.json({ error: 'problemId and input are required' }, { status: 400 });
    }

    const trimmedInput = String(input).trim();

    // 1. Check coding_problem_test_cases for an exact input match
    const { data: dbCases } = await supabase
      .from('coding_problem_test_cases')
      .select('input, expected_output, is_hidden')
      .eq('problem_id', problemId)
      .order('order_index', { ascending: true });

    if (dbCases && dbCases.length > 0) {
      const match = dbCases.find(c => String(c.input).trim() === trimmedInput);
      if (match && match.expected_output) {
        return NextResponse.json({ success: true, expectedOutput: match.expected_output, source: 'database' });
      }
    }

    // 2. Query problem details & text_solution
    const { data: problem } = await supabase
      .from('coding_problems')
      .select('id, title, description, input_format, output_format, constraints, signature')
      .eq('id', problemId)
      .single();

    let textSolution = null;
    const { data: sheetProblem } = await supabase
      .from('coding_sheet_problems')
      .select('text_solution')
      .eq('problem_id', problemId)
      .limit(1)
      .maybeSingle();

    if (sheetProblem?.text_solution) {
      textSolution = sheetProblem.text_solution;
    }

    // 3. If text_solution has an executable code block (C++ or Python), execute it on input
    if (textSolution) {
      const cppMatch = textSolution.match(/```(?:cpp|c\+\+)\r?\n([\s\S]*?)```/i);
      const pyMatch = textSolution.match(/```(?:python|py)\r?\n([\s\S]*?)```/i);
      if (cppMatch || pyMatch) {
        const lang = cppMatch ? 'cpp' : 'python';
        const rawCode = (cppMatch ? cppMatch[1] : pyMatch![1]).trim();
        try {
          const execRes = await executeCodeResiliently({
            language: lang,
            code: rawCode,
            stdin: trimmedInput,
          });
          if (execRes.status === 'SUCCESS' && execRes.stdout !== undefined && execRes.stdout !== null) {
            return NextResponse.json({
              success: true,
              expectedOutput: execRes.stdout.trim(),
              source: 'reference_solution',
            });
          }
        } catch {
          // Fall through to AI solver
        }
      }
    }

    // 4. AI solver fallback using Gemini
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey && problem) {
      try {
        const client = new GoogleGenAI({ apiKey });
        const systemInstruction = `You are an automated competitive programming judge.
Given a problem description, constraints, and standard input (stdin), calculate and output ONLY the exact raw standard output (stdout) that the problem expects.
Do NOT include markdown formatting, backticks, comments, or explanations. Only the raw output string.`;

        const userPrompt = `Problem: ${problem.title}
Description:
${problem.description || ''}

Input Format:
${problem.input_format || ''}

Output Format:
${problem.output_format || ''}

Constraints:
${problem.constraints || ''}

Input to solve:
${trimmedInput}`;

        const aiResponse = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
        });

        const outputText = aiResponse.text?.trim() || '';
        if (outputText) {
          const cleanOutput = outputText.replace(/^```[a-z]*\r?\n?/i, '').replace(/\r?\n?```$/i, '').trim();
          return NextResponse.json({
            success: true,
            expectedOutput: cleanOutput,
            source: 'ai_evaluator',
          });
        }
      } catch (aiErr) {
        console.error('[EXPECTED_OUTPUT_API] AI solver failed:', aiErr);
      }
    }

    // 5. If everything else fails, but we have a boundary hidden testcase in DB, return that as closest reference
    if (dbCases && dbCases.length > 0) {
      const lastHidden = dbCases.filter(c => c.is_hidden).pop() || dbCases[dbCases.length - 1];
      if (lastHidden?.expected_output) {
        return NextResponse.json({
          success: true,
          expectedOutput: lastHidden.expected_output,
          source: 'boundary_fallback',
        });
      }
    }

    return NextResponse.json({ success: false, expectedOutput: '' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

