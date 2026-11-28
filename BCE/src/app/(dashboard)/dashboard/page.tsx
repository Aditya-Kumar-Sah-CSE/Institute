import { createClient, getUser } from '@/lib/supabase/server';
import Link from 'next/link';
import { getNotices } from '@/features/notices/actions';
import type { Notice } from '@/features/notices/components/NoticeBoard';
import { getDashboardPolls } from '@/features/courses/actions/polls';
import { getGlobalPolls } from '@/features/polls/actions';
import DashboardGlobalPolls from './components/DashboardGlobalPolls';
import dynamic from 'next/dynamic';
import AddGoalDashboardCard from '@/features/goals/components/AddGoalDashboardCard';
import DashboardContestCard from './components/DashboardContestCard';
import DashboardSheetsCard from '@/features/code-arena/components/DashboardSheetsCard';
import DashboardCourseCard, { type DashboardCourseSummary } from '@/features/courses/components/DashboardCourseCard';
import { Suspense } from 'react';

const NoticeBoard = dynamic(() => import('@/features/notices/components/NoticeBoard'), { loading: () => <div className="skeleton-dash" style={{ height: '300px', borderRadius: '12px' }}></div> });
const DashboardPolls = dynamic(() => import('./components/DashboardPolls'), { loading: () => <div className="skeleton-dash" style={{ height: '200px', borderRadius: '12px' }}></div> });

export default async function DashboardPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return null;

  const { getOrCreateProfile } = await import('@/lib/profile');
  const profilePromise = getOrCreateProfile(user);
  
  const activeGoalPromise = supabase
    .from('student_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const enrollmentsPromise = supabase
    .from('enrollments')
    .select('course_id, progress, courses(id, title, lesson_count)')
    .eq('user_id', user.id)
    .eq('status', 'approved');

  const [
    profile,
    { data: activeGoal },
    { data: approvedEnrollments }
  ] = await Promise.all([
    profilePromise,
    activeGoalPromise,
    enrollmentsPromise
  ]);

  if (!profile) return null;

  let courseSummary: DashboardCourseSummary | null = null;
  const validEnrollments = (approvedEnrollments || []).filter((e: any) => e.courses);
  const enrolledCourseIds = validEnrollments.map((e: any) => e.course_id);
  if (validEnrollments.length > 0) {
    const [{ data: courseLessons }, { data: completedProgress }] = await Promise.all([
      supabase
        .from('lessons')
        .select('id, course_id, title, sort_order, week_number')
        .in('course_id', enrolledCourseIds)
        .order('sort_order', { ascending: true }),
      supabase
        .from('lesson_progress')
        .select('lesson_id, completed_at')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('completed_at', { ascending: false }),
    ]);

    const completedSet = new Set((completedProgress || []).map((p: any) => p.lesson_id));
    const lessonsByCourse = new Map<string, any[]>();
    (courseLessons || []).forEach((l: any) => {
      if (!lessonsByCourse.has(l.course_id)) lessonsByCourse.set(l.course_id, []);
      lessonsByCourse.get(l.course_id)!.push(l);
    });

    const latestCompletedLessonId = completedProgress?.[0]?.lesson_id;
    const picked =
      validEnrollments.find((e: any) =>
        latestCompletedLessonId &&
        (lessonsByCourse.get(e.course_id) || []).some((l) => l.id === latestCompletedLessonId)
      ) ||
      validEnrollments.find((e: any) => {
        const ls = lessonsByCourse.get(e.course_id) || [];
        return ls.length > 0 && ls.some((l) => !completedSet.has(l.id));
      }) ||
      validEnrollments.find((e: any) => (lessonsByCourse.get(e.course_id) || []).length > 0) ||
      validEnrollments[0];

    const cObj = Array.isArray(picked.courses) ? picked.courses[0] : picked.courses;
    const ls = lessonsByCourse.get(picked.course_id) || [];
    const doneInCourse = ls.filter((l) => completedSet.has(l.id)).length;
    const totalInCourse = Math.max(ls.length, Number(cObj?.lesson_count) || 0);
    const pct = totalInCourse > 0 ? Math.min(100, Math.round((doneInCourse / totalInCourse) * 100)) : Math.round((picked.progress || 0) * 100);
    const nextLesson = ls.find((l) => !completedSet.has(l.id)) || ls[ls.length - 1] || null;

    courseSummary = {
      enrolledCount: validEnrollments.length,
      courseId: picked.course_id,
      courseTitle: cObj?.title || 'My Courses',
      completedLessons: doneInCourse,
      totalLessons: totalInCourse,
      progressPct: pct,
      nextLessonId: nextLesson?.id || null,
      nextLessonTitle: nextLesson?.title || null,
    };
  }

  return (
    <div className="dashboard-main-container">
      {searchParams?.error === 'FileTooLarge' && (
        <div style={{ background: 'rgba(255, 0, 0, 0.1)', border: '1px solid var(--neon-red)', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <strong style={{ color: 'var(--neon-red)', fontSize: 'var(--text-lg)' }}>
            Upload Failed: File Too Large
          </strong>
          <p style={{ color: 'var(--text-primary)', margin: 0 }}>The file you tried to share exceeds the 15MB server limit. Please share a smaller file.</p>
        </div>
      )}

      <div className="dashboard-stats-grid">
        <DashboardCourseCard initialSummary={courseSummary} />

        <DashboardSheetsCard />

        <DashboardContestCard />

        <AddGoalDashboardCard initialGoal={activeGoal} />
      </div>

      <div className="dashboard-bottom-row">
        <Suspense fallback={<div className="skeleton-dash" style={{ height: '220px', borderRadius: '12px' }}></div>}>
          <DeferredGlobalPolls userId={user.id} role={profile?.role || 'student'} email={profile?.email} />
        </Suspense>
        <Suspense fallback={<div className="skeleton-dash" style={{ height: '220px', borderRadius: '12px' }}></div>}>
          <DeferredDashboardPolls userId={user.id} courseIds={enrolledCourseIds} />
        </Suspense>
        <Suspense fallback={<div className="skeleton-dash" style={{ height: '300px', borderRadius: '12px' }}></div>}>
          <DeferredNotices userId={user.id} userRole={profile?.role} courseIds={enrolledCourseIds} />
        </Suspense>
      </div>
    </div>
  );
}

// ── DEFERRED ASYNC COMPONENTS FOR FAST FIRST-SCREEN LOADING ──

async function DeferredGlobalPolls({ userId, role, email }: { userId: string; role: string; email?: string }) {
  const globalPolls = await getGlobalPolls({ activeOnly: true, limit: 10 });
  const activeGlobalPolls = (globalPolls || []).filter(
    (poll: any) => !poll.expires_at || new Date(poll.expires_at) >= new Date()
  );

  if (!activeGlobalPolls || activeGlobalPolls.length === 0) return null;
  return <DashboardGlobalPolls polls={activeGlobalPolls} currentUserId={userId} currentUserRole={role} currentUserEmail={email} />;
}

async function DeferredDashboardPolls({ userId, courseIds }: { userId: string; courseIds: string[] }) {
  if (courseIds.length === 0) return null;

  const { data: dashboardPolls } = await getDashboardPolls(courseIds);
  if (!dashboardPolls || dashboardPolls.length === 0) return null;
  return <DashboardPolls polls={dashboardPolls} currentUserId={userId} />;
}

async function DeferredNotices({ userId, userRole, courseIds }: { userId: string; userRole?: string; courseIds: string[] }) {
  const supabase = await createClient();
  const [globalNotices, { data: courseNotices }] = await Promise.all([
    getNotices(10),
    courseIds.length > 0
      ? supabase
          .from('course_notices')
          .select('id, course_id, title, content, created_by, created_at, profiles:created_by(name, role, email), courses:course_id(title)')
          .in('course_id', courseIds)
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const notices = [
    ...((globalNotices as any[]) || []).map((notice: any) => ({ ...notice, noticeScope: 'Global' })),
    ...((courseNotices as any[]) || []).map((notice: any) => {
      const course = Array.isArray(notice.courses) ? notice.courses[0] : notice.courses;
      return { ...notice, author_id: notice.created_by, noticeScope: course?.title || 'Enrolled course' };
    }),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);
  if (notices.length === 0) return null;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>Recent Notices</h2>
        <Link href="/notices" style={{ color: 'var(--neon-cyan)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', whiteSpace: 'nowrap' }}>View all notices →</Link>
      </div>
      <NoticeBoard notices={notices as Notice[]} currentUserId={userId} currentUserRole={userRole} />
    </div>
  );
}
