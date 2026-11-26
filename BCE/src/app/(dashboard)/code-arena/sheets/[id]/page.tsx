import '@/features/code-arena/components/CodeArena.css';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { canManageSheet, getCodeArenaActor } from '@/features/code-arena/server';
import SheetDetailClient from '@/features/code-arena/components/SheetDetailClient';
import SqlSheetDetailClient from '@/features/code-arena/components/sql-sheet/SqlSheetDetailClient';
import RoadmapSheetDetailClient from '@/features/code-arena/components/roadmap/RoadmapSheetDetailClient';
import AptitudeSheetDetailClient from '@/features/code-arena/components/aptitude-sheet/AptitudeSheetDetailClient';
import {
  fetchAllAptitudeQuestions,
  fetchAllSolvedAptitudeProgress,
  fetchAptitudeChaptersAndProgress,
} from '@/features/code-arena/data/aptitudeSheetTypes';
import TcsPrepSheetDetailClient from '@/features/code-arena/components/tcs-prep/TcsPrepSheetDetailClient';
import {
  fetchAllTcsQuestions,
  fetchAllSolvedTcsProgress,
  fetchTcsPrepCoreData,
} from '@/features/code-arena/data/tcsPrepTypes';
import { createClient as createRawClient } from '@supabase/supabase-js';
import { getSolvedStatusMap } from '@/lib/coding-platforms/solved-matcher';
import { getSheetReviewsData } from '@/features/code-arena/actions/sheet-reviews';

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
    .select('id, slug, title, description, created_by, created_at, enrollment_access, attachment_url, attachment_type, youtube_url, sheet_type, metadata');

  if (isUUID) {
    query = query.eq('id', id);
  } else {
    query = query.eq('slug', id);
  }

  const { data: sheet, error: sheetError } = await query.maybeSingle();

  if (sheetError || !sheet) {
    notFound();
  }

  const canEditSheet = canManageSheet({ user, isInstructor }, sheet.created_by);

  // Dedicated rich view when this sheet is an SQL + MCQ Mastery sheet
  if ((sheet as any).sheet_type === 'SQL') {
    const [
      { data: sqlQuestions },
      { data: sqlProgress },
      { data: enrollmentsData, count: enrollmentsCount },
      { data: allSqlProgress },
      { data: existingCert },
      sheetReviewsData,
    ] = await Promise.all([
      supabase
        .from('coding_sheet_sql_questions')
        .select('id, question_number, type, section, difficulty, question, options, correct_option, correct_answer, solution_sql, basic_concepts, explanation_points, incorrect_options, step_by_step, clause_breakdown')
        .eq('sheet_id', sheet.id)
        .order('question_number', { ascending: true }),
      supabase
        .from('coding_sheet_sql_progress')
        .select('question_number, question_type, is_solved, is_bookmarked, selected_option, submitted_sql, attempts, xp_awarded, solved_at')
        .eq('sheet_id', sheet.id)
        .eq('user_id', user.id),
      serviceRoleClient
        .from('coding_sheet_enrollments')
        .select('user_id, enrolled_at, profiles(id, name, avatar_url)', { count: 'exact' })
        .eq('sheet_id', sheet.id)
        .order('enrolled_at', { ascending: false }),
      serviceRoleClient
        .from('coding_sheet_sql_progress')
        .select('user_id, question_number, profiles!coding_sheet_sql_progress_user_id_fkey(name, avatar_url)')
        .eq('sheet_id', sheet.id)
        .eq('is_solved', true),
      supabase
        .from('certificates')
        .select('*, profiles(name, role)')
        .eq('user_id', user.id)
        .eq('sheet_id', sheet.id)
        .maybeSingle(),
      getSheetReviewsData(sheet.id, user.id),
    ]);

    const enrolledUsersList = (enrollmentsData || []).map((e: any) => ({
      user_id: e.user_id,
      enrolled_at: e.enrolled_at,
      name: e.profiles?.name || 'Learner',
      avatar_url: e.profiles?.avatar_url || null,
    }));

    const solverMap = new Map<string, { userId: string; name: string; avatar_url: string | null; qSet: Set<number> }>();
    (allSqlProgress || []).forEach((row: any) => {
      if (!solverMap.has(row.user_id)) {
        solverMap.set(row.user_id, {
          userId: row.user_id,
          name: row.profiles?.name || 'SQL Learner',
          avatar_url: row.profiles?.avatar_url || null,
          qSet: new Set(),
        });
      }
      solverMap.get(row.user_id)!.qSet.add(row.question_number);
    });

    const leaderboardList = Array.from(solverMap.values())
      .map((s) => ({
        userId: s.userId,
        name: s.name,
        avatar_url: s.avatar_url,
        solvedCount: s.qSet.size,
        isCurrentUser: s.userId === user.id,
      }))
      .sort((a, b) => b.solvedCount - a.solvedCount)
      .slice(0, 30);

    return (
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading TCS SQL Mastery Sheet…</div>}>
        <SqlSheetDetailClient
          sheet={sheet as any}
          questions={(sqlQuestions || []) as any}
          initialProgress={(sqlProgress || []) as any}
          totalEnrolledCount={Math.max(enrollmentsCount || 0, leaderboardList.length)}
          enrolledUsersList={enrolledUsersList}
          totalSolversCount={solverMap.size}
          leaderboardList={leaderboardList}
          initialCertificate={existingCert || null}
          reviewsData={sheetReviewsData as any}
          currentUserId={user.id}
          isInstructor={canEditSheet}
          isPublicPreview={false}
        />
      </Suspense>
    );
  }

  // Dedicated rich view when this sheet is a Placement Aptitude Mastery sheet
  if ((sheet as any).sheet_type === 'APTITUDE') {
    const [
      aptitudeQuestions,
      { chapters: aptitudeChapters, progress: aptitudeProgress },
      { data: enrollmentsData, count: enrollmentsCount },
      allAptitudeProgress,
      { data: existingCert },
      sheetReviewsData,
    ] = await Promise.all([
      fetchAllAptitudeQuestions(supabase, sheet.id),
      fetchAptitudeChaptersAndProgress(supabase, sheet.id, user.id),
      serviceRoleClient
        .from('coding_sheet_enrollments')
        .select('user_id, enrolled_at, profiles(id, name, avatar_url)', { count: 'exact' })
        .eq('sheet_id', sheet.id)
        .order('enrolled_at', { ascending: false }),
      fetchAllSolvedAptitudeProgress(serviceRoleClient, sheet.id, true),
      supabase
        .from('certificates')
        .select('*, profiles(name, role)')
        .eq('user_id', user.id)
        .eq('sheet_id', sheet.id)
        .maybeSingle(),
      getSheetReviewsData(sheet.id, user.id),
    ]);

    const enrolledUsersList = (enrollmentsData || []).map((e: any) => ({
      user_id: e.user_id,
      enrolled_at: e.enrolled_at,
      name: e.profiles?.name || 'Learner',
      avatar_url: e.profiles?.avatar_url || null,
    }));

    const solverMap = new Map<string, { userId: string; name: string; avatar_url: string | null; qSet: Set<number> }>();
    allAptitudeProgress.forEach((row: any) => {
      if (!solverMap.has(row.user_id)) {
        solverMap.set(row.user_id, {
          userId: row.user_id,
          name: row.profiles?.name || 'Aptitude Learner',
          avatar_url: row.profiles?.avatar_url || null,
          qSet: new Set(),
        });
      }
      solverMap.get(row.user_id)!.qSet.add(row.question_number);
    });

    const leaderboardList = Array.from(solverMap.values())
      .map((s) => ({
        userId: s.userId,
        name: s.name,
        avatar_url: s.avatar_url,
        solvedCount: s.qSet.size,
        isCurrentUser: s.userId === user.id,
      }))
      .sort((a, b) => b.solvedCount - a.solvedCount)
      .slice(0, 30);

    return (
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Placement Aptitude Mastery Sheet…</div>}>
        <AptitudeSheetDetailClient
          sheet={sheet as any}
          chapters={aptitudeChapters}
          questions={aptitudeQuestions}
          initialProgress={aptitudeProgress}
          totalEnrolledCount={Math.max(enrollmentsCount || 0, leaderboardList.length)}
          enrolledUsersList={enrolledUsersList}
          totalSolversCount={solverMap.size}
          leaderboardList={leaderboardList}
          initialCertificate={existingCert || null}
          reviewsData={sheetReviewsData as any}
          currentUserId={user.id}
          isInstructor={canEditSheet}
          isPublicPreview={false}
        />
      </Suspense>
    );
  }

  // Dedicated rich view for Complete TCS NQT Prep & 13 Mock Papers sheet
  if ((sheet as any).sheet_type === 'TCS_PREP') {
    const [
      tcsQuestions,
      { chapters: tcsChapters, drills: tcsDrills, mockHeaders: tcsMockHeaders, progress: tcsProgress, mockAttempts: tcsMockAttempts },
      { data: enrollmentsData, count: enrollmentsCount },
      allTcsProgress,
      { data: existingCert },
      sheetReviewsData,
    ] = await Promise.all([
      fetchAllTcsQuestions(supabase, sheet.id),
      fetchTcsPrepCoreData(supabase, sheet.id, user.id),
      serviceRoleClient
        .from('coding_sheet_enrollments')
        .select('user_id, enrolled_at, profiles(id, name, avatar_url)', { count: 'exact' })
        .eq('sheet_id', sheet.id)
        .order('enrolled_at', { ascending: false }),
      fetchAllSolvedTcsProgress(serviceRoleClient, sheet.id, true),
      supabase
        .from('certificates')
        .select('*, profiles(name, role)')
        .eq('user_id', user.id)
        .eq('sheet_id', sheet.id)
        .maybeSingle(),
      getSheetReviewsData(sheet.id, user.id),
    ]);

    const enrolledUsersList = (enrollmentsData || []).map((e: any) => ({
      user_id: e.user_id,
      enrolled_at: e.enrolled_at,
      name: e.profiles?.name || 'Learner',
      avatar_url: e.profiles?.avatar_url || null,
    }));

    const solverMap = new Map<string, { userId: string; name: string; avatar_url: string | null; itemSet: Set<string> }>();
    allTcsProgress.forEach((row: any) => {
      if (!solverMap.has(row.user_id)) {
        solverMap.set(row.user_id, {
          userId: row.user_id,
          name: row.profiles?.name || 'TCS Prep Learner',
          avatar_url: row.profiles?.avatar_url || null,
          itemSet: new Set(),
        });
      }
      solverMap.get(row.user_id)!.itemSet.add(row.item_key);
    });

    const leaderboardList = Array.from(solverMap.values())
      .map((s) => ({
        userId: s.userId,
        name: s.name,
        avatar_url: s.avatar_url,
        solvedCount: s.itemSet.size,
        isCurrentUser: s.userId === user.id,
      }))
      .sort((a, b) => b.solvedCount - a.solvedCount)
      .slice(0, 30);

    return (
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading TCS Complete Prep &amp; Mock Sheet…</div>}>
        <TcsPrepSheetDetailClient
          sheet={sheet as any}
          chapters={tcsChapters}
          questions={tcsQuestions}
          drills={tcsDrills}
          mockHeaders={tcsMockHeaders}
          initialProgress={tcsProgress}
          initialMockAttempts={tcsMockAttempts}
          totalEnrolledCount={Math.max(enrollmentsCount || 0, leaderboardList.length)}
          enrolledUsersList={enrolledUsersList}
          totalSolversCount={solverMap.size}
          leaderboardList={leaderboardList}
          initialCertificate={existingCert || null}
          reviewsData={sheetReviewsData as any}
          currentUserId={user.id}
          isInstructor={canEditSheet}
          isPublicPreview={false}
        />
      </Suspense>
    );
  }

  // Dedicated rich view when this sheet is an extensible Levels 1-5 DSA Roadmap sheet
  if ((sheet as any).sheet_type === 'ROADMAP') {
    const [
      { data: roadmapLevels },
      { data: roadmapProblems },
      { data: roadmapProgress },
      { data: enrollmentsData, count: enrollmentsCount },
      { data: allRoadmapProgress },
      { data: existingCert },
      sheetReviewsData,
    ] = await Promise.all([
      supabase
        .from('coding_sheet_roadmap_levels')
        .select('id, level_number, title, subtitle, description, target_problem_count, is_unlocked, theory_modules, revision_data, meta')
        .eq('sheet_id', sheet.id)
        .order('level_number', { ascending: true }),
      supabase
        .from('coding_sheet_roadmap_problems')
        .select('id, problem_code, order_index, level_number, batch_name, topic, title, difficulty, company_tags, problem_statement, description, constraints, test_cases, theory, brute_force, optimized, explanation, edge_cases')
        .eq('sheet_id', sheet.id)
        .order('order_index', { ascending: true }),
      supabase
        .from('coding_sheet_roadmap_progress')
        .select('problem_code, level_number, is_solved, is_revised, is_bookmarked, submitted_code, language, attempts, xp_awarded, solved_at')
        .eq('sheet_id', sheet.id)
        .eq('user_id', user.id),
      serviceRoleClient
        .from('coding_sheet_enrollments')
        .select('user_id, enrolled_at, profiles(id, name, avatar_url)', { count: 'exact' })
        .eq('sheet_id', sheet.id)
        .order('enrolled_at', { ascending: false }),
      serviceRoleClient
        .from('coding_sheet_roadmap_progress')
        .select('user_id, problem_code, profiles(name, avatar_url)')
        .eq('sheet_id', sheet.id)
        .eq('is_solved', true),
      supabase
        .from('certificates')
        .select('*, profiles(name, role)')
        .eq('user_id', user.id)
        .eq('sheet_id', sheet.id)
        .maybeSingle(),
      getSheetReviewsData(sheet.id, user.id),
    ]);

    const enrolledUsersList = (enrollmentsData || []).map((e: any) => ({
      user_id: e.user_id,
      enrolled_at: e.enrolled_at,
      name: e.profiles?.name || 'Learner',
      avatar_url: e.profiles?.avatar_url || null,
    }));

    const solverMap = new Map<string, { userId: string; name: string; avatar_url: string | null; pSet: Set<string> }>();
    (allRoadmapProgress || []).forEach((row: any) => {
      if (!solverMap.has(row.user_id)) {
        solverMap.set(row.user_id, {
          userId: row.user_id,
          name: row.profiles?.name || 'Roadmap Learner',
          avatar_url: row.profiles?.avatar_url || null,
          pSet: new Set(),
        });
      }
      solverMap.get(row.user_id)!.pSet.add(row.problem_code);
    });

    const leaderboardList = Array.from(solverMap.values())
      .map((s) => ({
        userId: s.userId,
        name: s.name,
        avatar_url: s.avatar_url,
        solvedCount: s.pSet.size,
        isCurrentUser: s.userId === user.id,
      }))
      .sort((a, b) => b.solvedCount - a.solvedCount)
      .slice(0, 30);

    return (
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading DSA Roadmap Sheet…</div>}>
        <RoadmapSheetDetailClient
          sheet={sheet as any}
          levels={(roadmapLevels || []) as any}
          problems={(roadmapProblems || []) as any}
          initialProgress={(roadmapProgress || []) as any}
          totalEnrolledCount={Math.max(enrollmentsCount || 0, leaderboardList.length)}
          enrolledUsersList={enrolledUsersList}
          totalSolversCount={solverMap.size}
          leaderboardList={leaderboardList}
          initialCertificate={existingCert || null}
          reviewsData={sheetReviewsData as any}
          currentUserId={user.id}
          isInstructor={canEditSheet}
          isPublicPreview={false}
        />
      </Suspense>
    );
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

  // 5b. Merge current user's external solved count into leaderboard
  const currentUserSolvedCount = solvedProblemIds.length;
  const existingEntry = solversLeaderboard.find(s => s.id === user.id);
  if (existingEntry) {
    // Update if external solves added more
    if (currentUserSolvedCount > existingEntry.solvedCount) {
      totalSolvedSum += (currentUserSolvedCount - existingEntry.solvedCount);
      existingEntry.solvedCount = currentUserSolvedCount;
    }
  } else if (currentUserSolvedCount > 0) {
    // User not in leaderboard yet but has external solves
    const { data: profile } = await serviceRoleClient
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    solversLeaderboard.push({
      id: user.id,
      name: profile?.name || 'You',
      avatar_url: profile?.avatar_url,
      solvedCount: currentUserSolvedCount,
    });
    uniqueSolversCount += 1;
    totalSolvedSum += currentUserSolvedCount;
  }
  solversLeaderboard.sort((a, b) => b.solvedCount - a.solvedCount);

  const totalEnrolledSolvers = Math.max(enrollmentsCount || 0, uniqueSolversCount);
  const avgQuestionsSolved = uniqueSolversCount > 0 ? (totalSolvedSum / uniqueSolversCount).toFixed(1) : '0';

  // Check if this DSA sheet has supplemental Roadmap theory & revision modules (e.g., Levels 1-5)
  const { data: roadmapLevels } = await supabase
    .from('coding_sheet_roadmap_levels')
    .select('id, level_number, title, subtitle, description, target_problem_count, is_unlocked, theory_modules, revision_data, meta')
    .eq('sheet_id', sheet.id)
    .order('level_number', { ascending: true });

  const sheetReviewsData = await getSheetReviewsData(sheet.id, user.id);

  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Sheet Details…</div>}>
      <SheetDetailClient
        sheet={{ ...sheet, problems }}
        solvedProblemIds={solvedProblemIds}
        solvedStatusMap={solvedStatusMap}
        isInstructor={canEditSheet}
        currentUser={user}
        totalStudentsSolving={uniqueSolversCount}
        totalEnrolledSolvers={totalEnrolledSolvers}
        totalEnrolled={enrollmentsCount || 0}
        avgQuestionsSolved={avgQuestionsSolved}
        solversLeaderboard={solversLeaderboard}
        enrolledStudents={enrolledStudents}
        enrollmentAccess={sheet.enrollment_access || 'public'}
        isEnrolled={isEnrolled}
        reviewsData={sheetReviewsData}
        roadmapLevels={(roadmapLevels || []) as any}
      />
    </Suspense>
  );
}
