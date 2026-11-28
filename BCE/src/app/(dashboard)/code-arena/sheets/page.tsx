import '@/features/code-arena/components/CodeArena.css';
import { getCodeArenaActor } from '@/features/code-arena/server';
import SheetsListClient from '@/features/code-arena/components/SheetsListClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CodingSheetsPage() {
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) return null;

  const [
    { data: sheets },
    { data: rpcSolvedRows },
    { data: submissions },
    { data: enrollments },
  ] = await Promise.all([
    supabase
      .from('coding_sheets')
      .select('id, slug, title, description, created_by, created_at, enrollment_access, sheet_type, metadata, coding_sheet_problems(problem_id)')
      .order('created_at', { ascending: false }),
    supabase.rpc('get_user_sheet_solved_counts', { p_user_id: user.id } as any),
    supabase
      .from('coding_submissions')
      .select('problem_id')
      .eq('student_id', user.id)
      .eq('status', 'ACCEPTED'),
    supabase
      .from('coding_sheet_enrollments')
      .select('sheet_id')
      .eq('user_id', user.id),
  ]);

  const sqlSolvedCountBySheet: Record<string, number> = {};
  ((rpcSolvedRows as any[]) || []).forEach((r: any) => {
    sqlSolvedCountBySheet[r.sheet_id] = (sqlSolvedCountBySheet[r.sheet_id] || 0) + Number(r.solved_count || 0);
  });

  const solvedProblemIds = Array.from(new Set((submissions || []).map(s => s.problem_id)));
  const enrolledSheetIds = (enrollments || []).map(e => e.sheet_id);

  return (
    <SheetsListClient 
      initialSheets={sheets || []} 
      isInstructor={isInstructor} 
      currentUserId={user.id}
      solvedProblemIds={solvedProblemIds}
      enrolledSheetIds={enrolledSheetIds}
      sqlSolvedCountBySheet={sqlSolvedCountBySheet}
    />
  );
}
