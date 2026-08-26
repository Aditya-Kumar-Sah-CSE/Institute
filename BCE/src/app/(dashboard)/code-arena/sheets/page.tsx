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
    .select('id, slug, title, description, created_by, created_at, enrollment_access, coding_sheet_problems(problem_id)')
    .order('created_at', { ascending: false });

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
    />
  );
}
