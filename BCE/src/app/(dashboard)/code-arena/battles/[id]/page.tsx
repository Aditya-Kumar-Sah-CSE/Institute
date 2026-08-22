import { notFound } from 'next/navigation';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { createAdminClient } from '@/lib/supabase/server';
import BattleArenaClient from '@/features/code-arena/components/BattleArenaClient';
import '@/features/code-arena/components/CodeArena.css';

export default async function BattleRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const battleId = resolvedParams.id;
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) return null;

  // 1. Fetch battle details
  const { data: battle } = await supabase
    .from('coding_battles')
    .select('id, title, description, status, start_time, end_time, duration_minutes, creator_role, join_code, visibility, created_by, created_at, profiles:created_by(full_name:name)')
    .eq('id', battleId)
    .maybeSingle();

  if (!battle) return notFound();

  // Create admin client to bypass RLS for fetching problems & testcases, 
  // since RLS on coding_battle_problems restricts standard students who are not active participants.
  // The primary authorization check is already done above via user's `supabase` client check on `coding_battles`.
  const adminClient = await createAdminClient();

  // 2. Fetch linked battle problems with platform badges (using admin client to support virtual practice participants)
  const { data: problemLinks } = await adminClient
    .from('coding_battle_problems')
    .select('points, order_index, coding_problems(id, title, slug, difficulty, tags, description, constraints, input_format, output_format, source_type, external_platform, external_problem_id, external_url, explanation)')
    .eq('battle_id', battleId)
    .order('order_index', { ascending: true });

  const problems = (problemLinks || []).map((link: any) => ({
    ...link.coding_problems,
    points: link.points,
    orderIndex: link.order_index,
  }));

  // Fetch sample test cases for ALL problems in the battle to render Examples & Notes
  let problemsWithSamples = problems;
  if (problems.length > 0) {
    const problemIds = problems.map((p: any) => p.id);
    const { data: allSamples } = await adminClient
      .from('coding_problem_test_cases')
      .select('id, problem_id, input, expected_output, sample_name, order_index')
      .in('problem_id', problemIds)
      .eq('is_hidden', false)
      .order('order_index', { ascending: true });

    problemsWithSamples = problems.map((p: any) => {
      const problemSamples = (allSamples || [])
        .filter((s: any) => s.problem_id === p.id)
        .map((s: any) => ({
          id: s.id,
          input: s.input,
          output: s.expected_output,
          expected_output: s.expected_output,
          sample_name: s.sample_name || `Sample #${s.order_index + 1}`,
          order_index: s.order_index,
        }));
      return {
        ...p,
        samples: problemSamples,
        examples: problemSamples,
      };
    });
  }

  // 3. Fetch participants roster
  const { data: participants } = await supabase
    .from('coding_battle_participants')
    .select('score, rank, joined_at, profiles(id, full_name:name, email, avatar_url)')
    .eq('battle_id', battleId)
    .order('score', { ascending: false });

  // 4. Set initial testcases for first problem from our fetched samples
  const initialTestCases = problemsWithSamples.length > 0 ? problemsWithSamples[0].samples : [];

  return (
    <BattleArenaClient
      battle={battle}
      problems={problemsWithSamples}
      participants={participants || []}
      initialTestCases={initialTestCases}
      currentUser={user}
      isInstructor={isInstructor}
    />
  );
}
