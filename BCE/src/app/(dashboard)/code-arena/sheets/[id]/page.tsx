import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getCodeArenaActor } from '@/features/code-arena/server';
import SheetDetailClient from '@/features/code-arena/components/SheetDetailClient';
import { createClient as createRawClient } from '@supabase/supabase-js';
import { getSolvedStatusMap } from '@/lib/coding-platforms/solved-matcher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SheetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) return null;

  const serviceRoleClient = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // 1. Fetch sheet details supporting both UUID id and slug parameter
  let query = supabase
    .from('coding_sheets')
    .select('id, slug, title, description, created_by, created_at, enrollment_access, attachment_url, attachment_type, youtube_url');

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

  // 3. Fetch user solved status across Arena and connected external profiles
  const solvedStatusMap = await getSolvedStatusMap(supabase, user.id, problems);
  const solvedProblemIds = Object.keys(solvedStatusMap).filter(id => solvedStatusMap[id].isSolved);

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

  const { data: enrollmentsData, count: enrollmentsCount } = await serviceRoleClient
    .from('coding_sheet_enrollments')
    .select('user_id, enrolled_at, profiles(id, name, avatar_url, email)', { count: 'exact' })
    .eq('sheet_id', sheet.id)
    .order('enrolled_at', { ascending: false });

  const enrolledStudents = (enrollmentsData || []).map((e: any) => ({
    id: e.profiles?.id || e.user_id,
    name: e.profiles?.name || 'Anonymous Student',
    avatar_url: e.profiles?.avatar_url || null,
    email: e.profiles?.email || '',
    enrolled_at: e.enrolled_at
  }));

  let solversLeaderboard: { id: string; name: string; avatar_url?: string; solvedCount: number }[] = [];
  let totalSolvedSum = 0;
  let uniqueSolversCount = 0;

  if (problemIds.length > 0) {
    const { data: acceptedSubmissions } = await serviceRoleClient
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
        solvedStatusMap={solvedStatusMap}
        isInstructor={isInstructor}
        currentUser={user}
        totalStudentsSolving={uniqueSolversCount}
        totalEnrolledSolvers={totalEnrolledSolvers}
        totalEnrolled={enrollmentsCount || 0}
        avgQuestionsSolved={avgQuestionsSolved}
        solversLeaderboard={solversLeaderboard}
        enrolledStudents={enrolledStudents}
        enrollmentAccess={sheet.enrollment_access || 'public'}
        isEnrolled={isEnrolled}
      />
    </Suspense>
  );
}
