import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: problemId } = await params;
    const { supabase, user } = await getCodeArenaActor();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Query latest ACCEPTED submission for this student and problem
    const { data: submission, error } = await supabase
      .from('coding_submissions')
      .select('id, source_code, language, status, execution_time_ms, created_at')
      .eq('student_id', user.id)
      .eq('problem_id', problemId)
      .eq('status', 'ACCEPTED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[LAST SUBMISSION GET] DB Query Error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch submission.' }, { status: 500 });
    }

    if (!submission) {
      // Check if problem info exists to return external info if available
      const { data: problem } = await supabase
        .from('coding_problems')
        .select('id, title, external_platform, external_url')
        .eq('id', problemId)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        data: null,
        externalInfo: problem
          ? {
              platform: problem.external_platform,
              externalUrl: problem.external_url,
              title: problem.title,
            }
          : null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: submission.id,
        code: submission.source_code,
        language: submission.language,
        status: submission.status,
        runtime: submission.execution_time_ms,
        memory: null,
        createdAt: submission.created_at,
      },
    });
  } catch (err: any) {
    console.error('[LAST SUBMISSION GET] Unhandled Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
