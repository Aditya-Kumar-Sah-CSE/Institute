import { getCodeArenaActor } from '@/features/code-arena/server';
import SheetsListClient from '@/features/code-arena/components/SheetsListClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CodingSheetsPage() {
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) return null;

  // Fetch all sheets
  const { data: sheets } = await supabase
    .from('coding_sheets')
    .select('id, title, description, created_by, created_at, coding_sheet_problems(problem_id)')
    .order('created_at', { ascending: false });

  // Fetch solved status of problems for the current user to calculate progress bar
  const { data: submissions } = await supabase
    .from('coding_submissions')
    .select('problem_id')
    .eq('student_id', user.id)
    .eq('status', 'ACCEPTED');

  const solvedProblemIds = Array.from(new Set((submissions || []).map(s => s.problem_id)));

  return (
    <SheetsListClient 
      initialSheets={sheets || []} 
      isInstructor={isInstructor} 
      solvedProblemIds={solvedProblemIds}
    />
  );
}
