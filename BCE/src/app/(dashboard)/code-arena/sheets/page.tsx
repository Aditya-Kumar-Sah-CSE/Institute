import '@/features/code-arena/components/CodeArena.css';
import { getCodeArenaActor } from '@/features/code-arena/server';
import SheetsListClient from '@/features/code-arena/components/SheetsListClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CodingSheetsPage() {
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) return null;

  // Fetch all sheets (include enrollment_access and slug for enroll flow)
  const { data: sheets } = await supabase
    .from('coding_sheets')
    .select('id, slug, title, description, created_by, created_at, enrollment_access, sheet_type, metadata, coding_sheet_problems(problem_id)')
    .order('created_at', { ascending: false });

  // Fetch user's solved SQL, Roadmap, Aptitude & TCS Prep progress per sheet
  const fetchPaginatedUserSolved = async (table: 'coding_sheet_aptitude_progress' | 'coding_sheet_tcs_progress') => {
    const PAGE = 1000;
    const rows: Array<{ sheet_id: string }> = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await (supabase as any)
        .from(table)
        .select('sheet_id')
        .eq('user_id', user.id)
        .eq('is_solved', true)
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      rows.push(...data);
      if (data.length < PAGE) break;
    }
    return rows;
  };

  const [{ data: sqlSolvedRows }, { data: roadmapSolvedRows }, aptitudeSolvedRows, tcsSolvedRows] = await Promise.all([
    supabase
      .from('coding_sheet_sql_progress')
      .select('sheet_id, question_number')
      .eq('user_id', user.id)
      .eq('is_solved', true),
    supabase
      .from('coding_sheet_roadmap_progress')
      .select('sheet_id, problem_code')
      .eq('user_id', user.id)
      .eq('is_solved', true),
    fetchPaginatedUserSolved('coding_sheet_aptitude_progress'),
    fetchPaginatedUserSolved('coding_sheet_tcs_progress'),
  ]);

  const sqlSolvedCountBySheet: Record<string, number> = {};
  [...(sqlSolvedRows || []), ...(roadmapSolvedRows || []), ...aptitudeSolvedRows, ...tcsSolvedRows].forEach((r: any) => {
    sqlSolvedCountBySheet[r.sheet_id] = (sqlSolvedCountBySheet[r.sheet_id] || 0) + 1;
  });

  // Fetch solved status of problems for the current user to calculate progress bar
  const { data: submissions } = await supabase
    .from('coding_submissions')
    .select('problem_id')
    .eq('student_id', user.id)
    .eq('status', 'ACCEPTED');

  // Fetch user's enrolled sheet IDs
  const { data: enrollments } = await supabase
    .from('coding_sheet_enrollments')
    .select('sheet_id')
    .eq('user_id', user.id);

  const solvedProblemIds = Array.from(new Set((submissions || []).map(s => s.problem_id)));
  const enrolledSheetIds = (enrollments || []).map(e => e.sheet_id);

  return (
    <SheetsListClient 
      initialSheets={sheets || []} 
      isInstructor={isInstructor} 
      solvedProblemIds={solvedProblemIds}
      enrolledSheetIds={enrolledSheetIds}
      sqlSolvedCountBySheet={sqlSolvedCountBySheet}
    />
  );
}
