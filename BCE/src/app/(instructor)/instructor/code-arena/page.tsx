import { getCodeArenaActor } from '@/features/code-arena/server';
import { isFeatureAllowed } from '@/lib/feature-flags';
import LockedFeatureScreen from '@/components/ui/LockedFeatureScreen';
import InstructorCodeArenaClient from '@/features/code-arena/components/InstructorCodeArenaClient';
import '@/features/code-arena/components/CodeArena.css';

export default async function InstructorCodeArenaPage() {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return null;

  // Check Feature Flag / Emergency Kill Switch
  const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isAllowed = isFeatureAllowed('coding_arena', null, null, null, user.email, userProfile?.role);
  if (!isAllowed) {
    return <LockedFeatureScreen featureName="Coding Arena" />;
  }

  // 1. Fetch Instructor Created Problems
  const { data: problems } = await supabase
    .from('coding_problems')
    .select('id, title, difficulty, source_type, is_published, created_at, coding_problem_test_cases(count), coding_submissions(count)')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  // 2. Fetch Battles
  const { data: battles } = await supabase
    .from('coding_battles')
    .select('id, title, description, status, start_time, end_time, duration_minutes, batch_id, creator_role, join_code, visibility, created_by, created_at, coding_battle_problems(count, coding_problems(*)), coding_battle_participants(count)')
    .order('created_at', { ascending: false });

  // 3. Fetch Batches
  const { data: batches } = await supabase
    .from('batches')
    .select('id, name')
    .limit(50);

  return (
    <InstructorCodeArenaClient
      user={user}
      initialBattles={battles || []}
      initialProblems={problems || []}
      batches={batches || []}
    />
  );
}
