import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: problem, error } = await supabase
      .from('coding_problems')
      .select('*, coding_problem_test_cases(id, input, expected_output, is_hidden, sample_name, order_index)')
      .eq('id', id)
      .single();

    if (error || !problem) {
      return NextResponse.json({ error: 'Problem not found.' }, { status: 404 });
    }

    // Filter hidden testcases for security so expected outputs of hidden tests are never leaked
    const allTestCases = problem.coding_problem_test_cases || [];
    const safeTestCases = allTestCases.map((tc: any) => {
      if (tc.is_hidden && problem.created_by !== user.id) {
        return {
          id: tc.id,
          is_hidden: true,
          sample_name: tc.sample_name,
          order_index: tc.order_index,
        };
      }
      return tc;
    });

    // Separate public samples into examples
    const examples = allTestCases
      .filter((tc: any) => !tc.is_hidden)
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((tc: any) => ({
        input: tc.input || '',
        output: tc.expected_output || '',
        explanation: tc.sample_name || undefined,
      }));

    const normalizedData = {
      ...problem,
      statement: problem.description,
      inputDescription: problem.input_format,
      outputDescription: problem.output_format,
      constraints: problem.constraints,
      sourceUrl: problem.external_url,
      platform: problem.source_type || problem.external_platform || 'INTERNAL',
      externalProblemId: problem.external_problem_id,
      examples,
      testCases: safeTestCases,
    };

    return NextResponse.json({ data: normalizedData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
