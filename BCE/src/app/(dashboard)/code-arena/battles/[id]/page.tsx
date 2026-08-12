import { notFound } from 'next/navigation';
import { getCodeArenaActor } from '@/features/code-arena/server';
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
    .select('id, title, description, status, start_time, end_time, duration_minutes, creator_role, join_code, visibility, created_by, created_at')
    .eq('id', battleId)
    .maybeSingle();

  if (!battle) return notFound();

  // 2. Fetch linked battle problems with platform badges
  const { data: problemLinks } = await supabase
    .from('coding_battle_problems')
    .select('points, order_index, coding_problems(id, title, slug, difficulty, tags, description, constraints, input_format, output_format, source_type, external_platform, external_problem_id, external_url)')
    .eq('battle_id', battleId)
    .order('order_index', { ascending: true });

  const problems = (problemLinks || []).map((link: any) => ({
    ...link.coding_problems,
    points: link.points,
    orderIndex: link.order_index,
  }));

  // 3. Fetch participants roster
  const { data: participants } = await supabase
    .from('coding_battle_participants')
    .select('score, rank, joined_at, profiles(id, full_name, email, avatar_url)')
    .eq('battle_id', battleId)
    .order('score', { ascending: false });

  // 4. Fetch testcases for first problem
  let initialTestCases: any[] = [];
  if (problems.length > 0) {
    const { data: tcData } = await supabase
      .from('coding_problem_test_cases')
      .select('id, input, expected_output, is_hidden, sample_name, order_index')
      .eq('problem_id', problems[0].id)
      .eq('is_hidden', false)
      .order('order_index', { ascending: true });
    initialTestCases = tcData || [];
  }

  return (
    <BattleArenaClient
      battle={battle}
      problems={problems}
      participants={participants || []}
      initialTestCases={initialTestCases}
      currentUser={user}
      isInstructor={isInstructor}
    />
  );
}
