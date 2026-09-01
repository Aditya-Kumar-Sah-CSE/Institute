import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { judgeService, getCachedHiddenTests, setCachedHiddenTests } from '@/features/code-arena/judge';
import type { CodeLanguage } from '@/features/code-arena/types';
import { createHash } from 'crypto';

// Short 5-second submission deduplication cache (userId + problemId + language + codeHash)
const submissionDedupeMap = new Map<string, number>();

function isDuplicateSubmission(userId: string, problemId: string, language: string, sourceCode: string): boolean {
  const hash = createHash('md5').update(sourceCode.trim()).digest('hex');
  const key = `${userId}:${problemId}:${language}:${hash}`;
  const now = Date.now();
  const lastTime = submissionDedupeMap.get(key);

  if (lastTime && now - lastTime < 5000) {
    return true;
  }
  submissionDedupeMap.set(key, now);
  // Cleanup old dedupe entries periodically
  if (submissionDedupeMap.size > 500) {
    for (const [k, time] of submissionDedupeMap.entries()) {
      if (now - time > 10000) submissionDedupeMap.delete(k);
    }
  }
  return false;
}

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

    // Submission Deduplication Check
    if (isDuplicateSubmission(user.id, problemId, language, sourceCode)) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE_SUBMISSION', message: 'Identical solution was submitted seconds ago. Please wait before re-submitting.' } },
        { status: 429 }
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

    // Execute Judge Test Cases (using server testcases cache)
    let tests = getCachedHiddenTests(problemId);
    if (!tests) {
      const { data: dbTests } = await supabase
        .from('coding_problem_test_cases')
        .select('input, expected_output')
        .eq('problem_id', problemId)
        .eq('is_hidden', false);

      tests = dbTests || [];
      setCachedHiddenTests(problemId, tests);
    }

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

    if (!error && data && data.status === 'ACCEPTED') {
      try {
        const { createAdminClient } = await import('@/lib/supabase/server');
        const adminClient = await createAdminClient();

        // 1. Check if already solved
        const { data: alreadySolved } = await adminClient
          .from('student_completed_problems')
          .select('id')
          .eq('student_id', user.id)
          .eq('platform', 'SMART_LEARN')
          .eq('problem_id', problemId)
          .maybeSingle();

        const isNewSolve = !alreadySolved;

        // 2. Perform parallelized activity & completion updates
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const today = formatter.format(new Date());

        const tasks: Promise<any>[] = [];

        if (isNewSolve) {
          const updateActivityTask = (async () => {
            const { data: profile } = await adminClient.from('profiles').select('institution_id').eq('id', user.id).single();
            const { data: currentActivity } = await adminClient
              .from('daily_coding_activity')
              .select('problems_solved')
              .eq('user_id', user.id)
              .eq('date', today)
              .maybeSingle();

            if (currentActivity) {
              await adminClient.from('daily_coding_activity')
                .update({ problems_solved: currentActivity.problems_solved + 1, updated_at: new Date().toISOString() })
                .eq('user_id', user.id).eq('date', today);
            } else {
              await adminClient.from('daily_coding_activity')
                .insert({ user_id: user.id, institution_id: profile?.institution_id || null, date: today, problems_solved: 1 });
            }
          })();
          tasks.push(updateActivityTask);

          const awardXpTask = (async () => {
             const { awardXP } = await import('@/features/auth/actions/auth');
             await awardXP(user.id, 20, 'Solved Coding Problem', 'code_arena', problemId);
          })();
          tasks.push(awardXpTask);
        }

        const updateSolvedTask = (async () => {
          await adminClient
            .from('student_completed_problems')
            .upsert({
              student_id: user.id,
              platform: 'SMART_LEARN',
              problem_id: problemId,
              solved_at: new Date().toISOString(),
            }, { onConflict: 'student_id,platform,problem_id' });
        })();
        tasks.push(updateSolvedTask);

        const triggerBadgesTask = (async () => {
          try {
            const { checkBadges } = await import('@/features/gamification/actions/gamification');
            await checkBadges(user.id);
          } catch (badgeErr) {
            console.error('[BADGES] Failed to trigger checkBadges:', badgeErr);
          }
        })();
        tasks.push(triggerBadgesTask);

        await Promise.allSettled(tasks);

        // Targeted Revalidation
        if (isNewSolve) {
          const { revalidatePath } = await import('next/cache');
          revalidatePath('/leaderboard');
          revalidatePath('/code-arena/profile');
          revalidatePath('/code-arena');
        }

        // Handle battle score if applicable
        if (finalBattleId) {
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

          const { data: battleProblems } = await adminClient
            .from('coding_battle_problems')
            .select('problem_id, points')
            .eq('battle_id', finalBattleId)
            .in('problem_id', solvedIds);

          const totalScore = (battleProblems || []).reduce((sum: number, bp: any) => sum + (bp.points || 0), 0);

          await adminClient
            .from('coding_battle_participants')
            .update({
              score: totalScore,
              finished_at: new Date(data.created_at).toISOString()
            })
            .eq('battle_id', finalBattleId)
            .eq('student_id', user.id);
        }
      } catch (postErr) {
        console.error('Failed to update activity/score:', postErr);
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

  const url = new URL(request.url);
  const problemId = url.searchParams.get('problemId');
  const battleId = url.searchParams.get('battleId');

  let query = supabase
    .from('coding_submissions')
    .select('id, student_id, problem_id, battle_id, language, status, score, passed_tests, total_tests, execution_time_ms, created_at');

  let isHostOrInstructor = false;
  if (battleId) {
    const { data: battle } = await supabase
      .from('coding_battles')
      .select('created_by')
      .eq('id', battleId)
      .maybeSingle();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    isHostOrInstructor =
      battle?.created_by === user.id ||
      ['admin', 'instructor', 'developer'].includes(profile?.role || '');
  }

  if (!isHostOrInstructor) {
    query = query.eq('student_id', user.id);
  }

  if (problemId) {
    query = query.eq('problem_id', problemId);
  }

  if (battleId) {
    query = query.eq('battle_id', battleId);
  }

  query = query.order('created_at', { ascending: false }).limit(100);
  const { data, error } = await query;

  return error
    ? NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 })
    : NextResponse.json({ success: true, data });
}
