import '@/features/code-arena/components/CodeArena.css';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { canManageSheet, getCodeArenaActor } from '@/features/code-arena/server';
import SheetDetailClient from '@/features/code-arena/components/SheetDetailClient';
import SqlSheetDetailClient from '@/features/code-arena/components/sql-sheet/SqlSheetDetailClient';
import RoadmapSheetDetailClient from '@/features/code-arena/components/roadmap/RoadmapSheetDetailClient';
import AptitudeSheetDetailClient from '@/features/code-arena/components/aptitude-sheet/AptitudeSheetDetailClient';
import { fetchAptitudeUserProgress } from '@/features/code-arena/data/aptitudeSheetTypes';
import TcsPrepSheetDetailClient from '@/features/code-arena/components/tcs-prep/TcsPrepSheetDetailClient';
import { fetchTcsUserProgressAndAttempts } from '@/features/code-arena/data/tcsPrepTypes';
import { getSolvedStatusMap } from '@/lib/coding-platforms/solved-matcher';
import { getSheetReviewsData } from '@/features/code-arena/actions/sheet-reviews';
import {
  getCachedAuthenticatedSheetCurriculum,
  getCachedSheetCommunityData,
  getSheetServiceClient,
} from '@/lib/sheet-cache';

function mapCommunityStats(rawStats: any, currentUserId: string) {
  const totalSolversCount = Number(rawStats?.total_solvers || 0);
  const totalSolvedSum = Number(rawStats?.total_solved_sum || 0);
  const topSolvers = Array.isArray(rawStats?.top_solvers) ? rawStats.top_solvers : [];
  const leaderboardList = topSolvers.map((s: any) => ({
    id: s.user_id,
    userId: s.user_id,
    name: s.name || 'Learner',
    avatar_url: s.avatar_url || null,
    solvedCount: Number(s.solved_count || 0),
    isCurrentUser: s.user_id === currentUserId,
  }));
  return { totalSolversCount, totalSolvedSum, leaderboardList };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SheetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) return null;

  const serviceRoleClient = getSheetServiceClient();

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
      curriculum,
      { data: sqlProgress },
      { enrollmentsData, enrollmentsCount, statsRaw },
      { data: existingCert },
      sheetReviewsData,
    ] = await Promise.all([
      getCachedAuthenticatedSheetCurriculum(sheet.id, 'SQL'),
      supabase
        .from('coding_sheet_sql_progress')
        .select('question_number, question_type, is_solved, is_bookmarked, selected_option, submitted_sql, attempts, xp_awarded, solved_at')
        .eq('sheet_id', sheet.id)
        .eq('user_id', user.id),
      getCachedSheetCommunityData(sheet.id, 'SQL', false),
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

    const { totalSolversCount, leaderboardList } = mapCommunityStats(statsRaw, user.id);

    return (
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading TCS SQL Mastery Sheet…</div>}>
        <SqlSheetDetailClient
          sheet={sheet as any}
          questions={(curriculum.sqlQuestions || []) as any}
          initialProgress={(sqlProgress || []) as any}
          totalEnrolledCount={Math.max(enrollmentsCount || 0, totalSolversCount)}
          enrolledUsersList={enrolledUsersList}
          totalSolversCount={totalSolversCount}
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
      curriculum,
      aptitudeProgress,
      { enrollmentsData, enrollmentsCount, statsRaw },
      { data: existingCert },
      sheetReviewsData,
    ] = await Promise.all([
      getCachedAuthenticatedSheetCurriculum(sheet.id, 'APTITUDE'),
      fetchAptitudeUserProgress(supabase, sheet.id, user.id),
      getCachedSheetCommunityData(sheet.id, 'APTITUDE', false),
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

    const { totalSolversCount, leaderboardList } = mapCommunityStats(statsRaw, user.id);

    return (
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Placement Aptitude Mastery Sheet…</div>}>
        <AptitudeSheetDetailClient
          sheet={sheet as any}
          chapters={curriculum.aptitudeChapters}
          questions={curriculum.aptitudeQuestions}
          initialProgress={aptitudeProgress}
          totalEnrolledCount={Math.max(enrollmentsCount || 0, totalSolversCount)}
          enrolledUsersList={enrolledUsersList}
          totalSolversCount={totalSolversCount}
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
      curriculum,
      { progress: tcsProgress, mockAttempts: tcsMockAttempts },
      { enrollmentsData, enrollmentsCount, statsRaw },
      { data: existingCert },
      sheetReviewsData,
    ] = await Promise.all([
      getCachedAuthenticatedSheetCurriculum(sheet.id, 'TCS_PREP'),
      fetchTcsUserProgressAndAttempts(supabase, sheet.id, user.id),
      getCachedSheetCommunityData(sheet.id, 'TCS_PREP', false),
      supabase
        .from('certificates')
        .select('*, profiles(name, role)')
        .eq('user_id', user.id)
        .eq('sheet_id', sheet.id)
        .maybeSingle(),
      getSheetReviewsData(sheet.id, user.id),
    ]);

    const tcsCore = curriculum.tcsPayload || { chapters: [], questions: [], drills: [], mockHeaders: [] };

    const enrolledUsersList = (enrollmentsData || []).map((e: any) => ({
      user_id: e.user_id,
      enrolled_at: e.enrolled_at,
      name: e.profiles?.name || 'Learner',
      avatar_url: e.profiles?.avatar_url || null,
    }));

    const { totalSolversCount, leaderboardList } = mapCommunityStats(statsRaw, user.id);

    return (
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading TCS Complete Prep &amp; Mock Sheet…</div>}>
        <TcsPrepSheetDetailClient
          sheet={sheet as any}
          chapters={tcsCore.chapters}
          questions={tcsCore.questions}
          drills={tcsCore.drills}
          mockHeaders={tcsCore.mockHeaders}
          initialProgress={tcsProgress}
          initialMockAttempts={tcsMockAttempts}
          totalEnrolledCount={Math.max(enrollmentsCount || 0, totalSolversCount)}
          enrolledUsersList={enrolledUsersList}
          totalSolversCount={totalSolversCount}
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
      curriculum,
      { data: roadmapProgress },
      { enrollmentsData, enrollmentsCount, statsRaw },
      { data: existingCert },
      sheetReviewsData,
    ] = await Promise.all([
      getCachedAuthenticatedSheetCurriculum(sheet.id, 'ROADMAP'),
      supabase
        .from('coding_sheet_roadmap_progress')
        .select('problem_code, level_number, is_solved, is_revised, is_bookmarked, submitted_code, language, attempts, xp_awarded, solved_at')
        .eq('sheet_id', sheet.id)
        .eq('user_id', user.id),
      getCachedSheetCommunityData(sheet.id, 'ROADMAP', false),
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

    const { totalSolversCount, leaderboardList } = mapCommunityStats(statsRaw, user.id);

    return (
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading DSA Roadmap Sheet…</div>}>
        <RoadmapSheetDetailClient
          sheet={sheet as any}
          levels={(curriculum.roadmapLevels || []) as any}
          problems={(curriculum.roadmapProblems || []) as any}
          initialProgress={(roadmapProgress || []) as any}
          totalEnrolledCount={Math.max(enrollmentsCount || 0, totalSolversCount)}
          enrolledUsersList={enrolledUsersList}
          totalSolversCount={totalSolversCount}
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

  // 2. Fetch linked problems + supplemental roadmap levels + user enrollment + community stats in parallel
  const [
    curriculum,
    { data: enrollment },
    { enrollmentsData, enrollmentsCount, statsRaw },
    sheetReviewsData,
  ] = await Promise.all([
    getCachedAuthenticatedSheetCurriculum(sheet.id, 'DSA'),
    supabase
      .from('coding_sheet_enrollments')
      .select('id')
      .eq('sheet_id', sheet.id)
      .eq('user_id', user.id)
      .maybeSingle(),
    getCachedSheetCommunityData(sheet.id, 'DSA', canEditSheet),
    getSheetReviewsData(sheet.id, user.id),
  ]);

  const problems = curriculum.problems || [];
  const roadmapLevels = curriculum.roadmapLevels || [];

  const solvedStatusMap = await getSolvedStatusMap(supabase, user.id, problems);
  const solvedProblemIds = Object.keys(solvedStatusMap).filter(id => solvedStatusMap[id].isSolved);
  const isEnrolled = Boolean(enrollment);

  const enrolledStudents = (enrollmentsData || []).map((e: any) => ({
    id: e.profiles?.id || e.user_id,
    name: e.profiles?.name || 'Anonymous Student',
    avatar_url: e.profiles?.avatar_url || null,
    email: canEditSheet ? (e.profiles?.email || '') : '',
    enrolled_at: e.enrolled_at
  }));

  let { totalSolversCount: uniqueSolversCount, totalSolvedSum, leaderboardList: solversLeaderboard } = mapCommunityStats(statsRaw, user.id);

  // Merge current user's external solved count into leaderboard
  const currentUserSolvedCount = solvedProblemIds.length;
  const existingEntry = solversLeaderboard.find((s: any) => s.id === user.id);
  if (existingEntry) {
    if (currentUserSolvedCount > existingEntry.solvedCount) {
      totalSolvedSum += (currentUserSolvedCount - existingEntry.solvedCount);
      existingEntry.solvedCount = currentUserSolvedCount;
    }
  } else if (currentUserSolvedCount > 0) {
    const { data: profileData } = await serviceRoleClient
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    const userProfile = profileData as { name?: string | null; avatar_url?: string | null } | null;
    solversLeaderboard.push({
      id: user.id,
      userId: user.id,
      name: userProfile?.name || 'You',
      avatar_url: userProfile?.avatar_url || null,
      solvedCount: currentUserSolvedCount,
      isCurrentUser: true,
    });
    uniqueSolversCount += 1;
    totalSolvedSum += currentUserSolvedCount;
  }
  solversLeaderboard.sort((a: any, b: any) => b.solvedCount - a.solvedCount);

  const totalEnrolledSolvers = Math.max(enrollmentsCount || 0, uniqueSolversCount);
  const avgQuestionsSolved = uniqueSolversCount > 0 ? (totalSolvedSum / uniqueSolversCount).toFixed(1) : '0';

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
