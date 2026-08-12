import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { getCodeArenaActor } from '@/features/code-arena/server';
import CodeArenaClientHome from '@/features/code-arena/components/CodeArenaClientHome';
import '@/features/code-arena/components/CodeArena.css';

export default async function CodeArenaPage() {
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) return null;

  // 1. Fetch Battles
  let battleQuery = supabase
    .from('coding_battles')
    .select('id, title, description, status, start_time, end_time, duration_minutes, creator_role, join_code, visibility, created_by, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: battles } = await battleQuery;

  // 2. Fetch Curated Practice Problems
  const { data: problems } = await supabase
    .from('coding_problems')
    .select('id, title, slug, difficulty, tags, source_type, external_platform, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(30);

  // 3. Fetch batches if instructor
  let batches: any[] = [];
  if (isInstructor) {
    const { data: bData } = await supabase.from('batches').select('id, name').limit(50);
    batches = bData || [];
  }

  return (
    <CodeArenaClientHome
      user={user}
      isInstructor={isInstructor}
      initialBattles={battles || []}
      initialProblems={problems || []}
      batches={batches}
    />
  );
}
