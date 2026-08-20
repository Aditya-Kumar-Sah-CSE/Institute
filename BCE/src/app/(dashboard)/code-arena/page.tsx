import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { isFeatureAllowed } from '@/lib/feature-flags';
import LockedFeatureScreen from '@/components/ui/LockedFeatureScreen';
import CodeArenaClientHome from '@/features/code-arena/components/CodeArenaClientHome';
import '@/features/code-arena/components/CodeArena.css';

export default async function CodeArenaPage() {
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) return null;

  // Check Feature Flag / Emergency Kill Switch
  const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isAllowed = isFeatureAllowed('coding_arena', null, null, null, user.email, userProfile?.role);
  if (!isAllowed) {
    return <LockedFeatureScreen featureName="Coding Arena" />;
  }

  // 1. Fetch Battles, Problems, Profiles, Submissions, and Accounts in parallel
  const [
    { data: battles },
    { data: problems },
    { data: profile },
    { count: bceSolved },
    { data: solvedSubmissions },
    { data: accounts },
    batchesData
  ] = await Promise.all([
    supabase
      .from('coding_battles')
      .select('id, title, description, status, start_time, end_time, duration_minutes, creator_role, join_code, visibility, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('coding_problems')
      .select('id, title, slug, difficulty, tags, source_type, external_platform, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('coding_submissions')
      .select('problem_id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('status', 'ACCEPTED'),
    supabase
      .from('coding_submissions')
      .select('problem_id')
      .eq('student_id', user.id)
      .eq('status', 'ACCEPTED'),
    supabase
      .from('student_external_accounts')
      .select('*')
      .eq('student_id', user.id),
    isInstructor
      ? supabase.from('batches').select('id, name').limit(50)
      : Promise.resolve({ data: [] })
  ]);

  const solvedProblemIds = new Set(solvedSubmissions?.map(s => s.problem_id) || []);
  const problemsWithSolved = (problems || []).map(p => ({
    ...p,
    solved: solvedProblemIds.has(p.id)
  }));

  const battlesList = battles || [];
  const batches = batchesData?.data || [];

  return (
    <CodeArenaClientHome
      user={user}
      isInstructor={isInstructor}
      initialBattles={battlesList}
      initialProblems={problemsWithSolved}
      batches={batches}
      profile={profile}
      bceSolved={bceSolved || 0}
      externalAccounts={accounts || []}
    />
  );
}
