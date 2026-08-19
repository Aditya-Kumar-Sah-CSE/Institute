import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { judgeService } from '@/features/code-arena/judge';
import type { CodeLanguage } from '@/features/code-arena/types';

export async function POST(request: Request) {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  const { checkRateLimit } = await import('@/lib/rate-limit');
  const rl = checkRateLimit(`submitCode:${user.id}`, 20, 60000);
  if (!rl.success) {
    return NextResponse.json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: rl.error } }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { problemId, battleId = null, language, sourceCode, isVirtualPractice = false } = body as {
      problemId?: string;
      battleId?: string | null;
      language?: CodeLanguage;
      sourceCode?: string;
      isVirtualPractice?: boolean;
    };

    if (!problemId || !language || !sourceCode?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Problem, language and source code are required.' } },
        { status: 400 }
      );
    }

    const { data: problem } = await supabase
      .from('coding_problems')
      .select('id, time_limit_ms, memory_limit_mb, supported_languages')
      .eq('id', problemId)
      .single();

    if (!problem || !problem.supported_languages.includes(language)) {
      return NextResponse.json(
        { success: false, error: { code: 'PROBLEM_UNAVAILABLE', message: 'Problem or language is not available.' } },
        { status: 400 }
      );
    }

    let finalBattleId = battleId;

    // SERVER-AUTHORITATIVE BATTLE EXPIRY GUARD
    if (battleId) {
      const { data: battle } = await supabase
        .from('coding_battles')
        .select('id, status, end_time')
        .eq('id', battleId)
        .single();

      if (!battle) {
        return NextResponse.json(
          { success: false, error: { code: 'BATTLE_NOT_FOUND', message: 'Battle not found.' } },
          { status: 404 }
        );
      }

      if (isVirtualPractice) {
        if (battle.status !== 'COMPLETED' && battle.status !== 'CANCELLED') {
          return NextResponse.json(
            { success: false, error: { code: 'BATTLE_ACTIVE', message: 'This battle is not completed yet.' } },
            { status: 400 }
          );
        }
        finalBattleId = null;
      } else {
        if (battle.status === 'COMPLETED' || battle.status === 'CANCELLED') {
          return NextResponse.json(
            { success: false, error: { code: 'BATTLE_ENDED', message: 'This battle has ended. Submissions are no longer accepted.' } },
            { status: 403 }
          );
        }

        if (battle.status !== 'LIVE') {
          return NextResponse.json(
            { success: false, error: { code: 'BATTLE_NOT_LIVE', message: 'Battle is not active.' } },
            { status: 409 }
          );
        }

        const now = new Date();
        if (!battle.end_time || now >= new Date(battle.end_time)) {
          // Automatically transition battle status to COMPLETED (lazy expiration)
          const { createAdminClient } = await import('@/lib/supabase/server');
          const adminClient = await createAdminClient();
          await adminClient
            .from('coding_battles')
            .update({ status: 'COMPLETED' })
            .eq('id', battleId);

          return NextResponse.json(
            { success: false, error: { code: 'BATTLE_ENDED', message: 'Battle time has expired. Submissions are closed.' } },
            { status: 403 }
          );
        }
      }
    }

    // Execute Judge Test Cases
    const { data: tests } = await supabase
      .from('coding_problem_test_cases')
      .select('input, expected_output')
      .eq('problem_id', problemId)
      .eq('is_hidden', false);

    const result = await judgeService.execute({
      problemId,
      language,
      sourceCode,
      testCases: (tests || []).map((testCase) => ({
        input: testCase.input,
        expectedOutput: testCase.expected_output,
      })),
      timeLimitMs: problem.time_limit_ms,
      memoryLimitMb: problem.memory_limit_mb,
    });

    const { data, error } = await supabase
      .from('coding_submissions')
      .insert({
        student_id: user.id,
        problem_id: problemId,
        battle_id: finalBattleId,
        language,
        source_code: sourceCode,
        status: result.status,
        passed_tests: result.passedTests,
        total_tests: result.totalTests,
        compiler_output: result.compilerOutput,
        runtime_output: result.runtimeOutput,
      })
      .select('id, status, passed_tests, total_tests, compiler_output, runtime_output, created_at')
      .single();

    if (!error && data && finalBattleId && data.status === 'ACCEPTED') {
      try {
        const { createAdminClient } = await import('@/lib/supabase/server');
        const adminClient = await createAdminClient();

        // 1. Fetch other accepted submissions by this student for this battle
        const { data: prevSolved } = await adminClient
          .from('coding_submissions')
          .select('problem_id')
          .eq('student_id', user.id)
          .eq('battle_id', finalBattleId)
          .eq('status', 'ACCEPTED');

        const solvedIds = Array.from(new Set([
          problemId,
          ...(prevSolved || []).map((s: any) => s.problem_id)
        ]));

        // 2. Fetch points per solved problem from coding_battle_problems
        const { data: battleProblems } = await adminClient
          .from('coding_battle_problems')
          .select('problem_id, points')
          .eq('battle_id', finalBattleId)
          .in('problem_id', solvedIds);

        const totalScore = (battleProblems || []).reduce((sum: number, bp: any) => sum + (bp.points || 0), 0);

        // 3. Update participant score/finished_at
        await adminClient
          .from('coding_battle_participants')
          .update({
            score: totalScore,
            finished_at: new Date(data.created_at).toISOString()
          })
          .eq('battle_id', finalBattleId)
          .eq('student_id', user.id);
      } catch (scoreErr) {
        console.error('Failed to update participant score:', scoreErr);
      }
    }

    return error
      ? NextResponse.json({ success: false, error: { code: 'DATABASE_ERROR', message: error.message } }, { status: 400 })
      : NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Submission failed' } },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const problemId = new URL(request.url).searchParams.get('problemId');
  let query = supabase
    .from('coding_submissions')
    .select('id, problem_id, battle_id, language, status, score, passed_tests, total_tests, execution_time_ms, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })
    .limit(25);

  if (problemId) query = query.eq('problem_id', problemId);
  const { data, error } = await query;

  return error
    ? NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 })
    : NextResponse.json({ success: true, data });
}
