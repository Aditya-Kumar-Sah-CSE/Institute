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

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // 1. Fetch sheet details supporting both UUID id and slug parameter
  let query = supabase
    .from('coding_sheets')
    .select('id, slug, title, description, created_by, created_at, enrollment_access');

  if (isUUID) {
    query = query.eq('id', id);
  } else {
    query = query.eq('slug', id);
  }

  const { data: sheet, error: sheetError } = await query.maybeSingle();

  if (sheetError || !sheet) {
    notFound();
  }

  // 2. Fetch linked problems with metadata using sheet.id (UUID)
  const { data: problemsData, error: problemsError } = await supabase
    .from('coding_sheet_problems')
    .select('order_index, text_solution, youtube_url, coding_problems(id, title, difficulty, source_type, external_platform, external_problem_id, external_url, tags)')
    .eq('sheet_id', sheet.id)
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
    .eq('sheet_id', sheet.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const isEnrolled = Boolean(enrollment);

  // 5. Community Solver Analytics for ALL users:
  const problemIds = problems.map((p: any) => p.id);

  const { count: enrollmentsCount } = await supabase
    .from('coding_sheet_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('sheet_id', sheet.id);

  let solversLeaderboard: { id: string; name: string; avatar_url?: string; solvedCount: number }[] = [];
  let totalSolvedSum = 0;
  let uniqueSolversCount = 0;

  if (problemIds.length > 0) {
    const { data: acceptedSubmissions } = await supabase
      .from('coding_submissions')
      .select('student_id, problem_id, profiles!coding_submissions_student_id_fkey(name, avatar_url)')
      .in('problem_id', problemIds)
      .eq('status', 'ACCEPTED');

    if (acceptedSubmissions && acceptedSubmissions.length > 0) {
      const userSolvedMap = new Map<string, { name: string; avatar_url?: string; solvedProblems: Set<string> }>();

      for (const sub of acceptedSubmissions) {
        if (!sub.student_id) continue;
        const profile = (sub as any).profiles;
        const name = profile?.name || 'Anonymous Solver';
        const avatar_url = profile?.avatar_url;

        if (!userSolvedMap.has(sub.student_id)) {
          userSolvedMap.set(sub.student_id, { name, avatar_url, solvedProblems: new Set() });
        }
        userSolvedMap.get(sub.student_id)!.solvedProblems.add(sub.problem_id);
      }

      uniqueSolversCount = userSolvedMap.size;

      userSolvedMap.forEach((val, userId) => {
        const solvedCount = val.solvedProblems.size;
        totalSolvedSum += solvedCount;
        solversLeaderboard.push({
          id: userId,
          name: val.name,
          avatar_url: val.avatar_url,
          solvedCount,
        });
      });

      solversLeaderboard.sort((a, b) => b.solvedCount - a.solvedCount);
    }
  }

  const totalEnrolledSolvers = Math.max(enrollmentsCount || 0, uniqueSolversCount);
  const avgQuestionsSolved = uniqueSolversCount > 0 ? (totalSolvedSum / uniqueSolversCount).toFixed(1) : '0';

  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Sheet Details…</div>}>
      <SheetDetailClient
        sheet={{ ...sheet, problems }}
        solvedProblemIds={solvedProblemIds}
        isInstructor={isInstructor}
        currentUser={user}
        totalStudentsSolving={uniqueSolversCount}
        totalEnrolledSolvers={totalEnrolledSolvers}
        avgQuestionsSolved={avgQuestionsSolved}
        solversLeaderboard={solversLeaderboard}
        enrollmentAccess={sheet.enrollment_access || 'public'}
        isEnrolled={isEnrolled}
      />
    </Suspense>
  );
}
