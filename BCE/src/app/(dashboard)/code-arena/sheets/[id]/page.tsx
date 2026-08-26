import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getCodeArenaActor } from '@/features/code-arena/server';
import SheetDetailClient from '@/features/code-arena/components/SheetDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SheetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) return null;

  // 1. Fetch sheet details including enrollment settings
  const { data: sheet, error: sheetError } = await supabase
    .from('coding_sheets')
    .select('id, title, description, created_by, created_at, enrollment_access')
    .eq('id', id)
    .maybeSingle();

  if (sheetError || !sheet) {
    notFound();
  }

  // 2. Fetch linked problems with metadata
  const { data: problemsData, error: problemsError } = await supabase
    .from('coding_sheet_problems')
    .select('order_index, text_solution, youtube_url, coding_problems(id, title, difficulty, source_type, external_platform, external_problem_id, external_url, tags)')
    .eq('sheet_id', id)
    .order('order_index', { ascending: true });

  if (problemsError) {
    notFound();
  }

  const problems = (problemsData || []).map((p: any) => ({
    ...p.coding_problems,
    order_index: p.order_index,
    text_solution: p.text_solution,
    youtube_url: p.youtube_url,
  }));

  // 3. Fetch user solved status
  const { data: submissions } = await supabase
    .from('coding_submissions')
    .select('problem_id')
    .eq('student_id', user.id)
    .eq('status', 'ACCEPTED');

  const solvedProblemIds = Array.from(new Set((submissions || []).map(s => s.problem_id)));

  // 4. Check if user is enrolled in this sheet
  const { data: enrollment } = await supabase
    .from('coding_sheet_enrollments')
    .select('id')
    .eq('sheet_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const isEnrolled = Boolean(enrollment);

  // 5. Creator analytics: unique students solving
  const problemIds = problems.map((p: any) => p.id);
  let totalStudentsSolving = 0;
  if (problemIds.length > 0) {
    const { data: submissionStudents } = await supabase
      .from('coding_submissions')
      .select('student_id')
      .in('problem_id', problemIds);

    const uniqueIds = new Set((submissionStudents || []).map((s: any) => s.student_id));
    totalStudentsSolving = uniqueIds.size;
  }

  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Sheet Details…</div>}>
      <SheetDetailClient
        sheet={{ ...sheet, problems }}
        solvedProblemIds={solvedProblemIds}
        isInstructor={isInstructor}
        currentUser={user}
        totalStudentsSolving={totalStudentsSolving}
        enrollmentAccess={sheet.enrollment_access || 'public'}
        isEnrolled={isEnrolled}
      />
    </Suspense>
  );
}
