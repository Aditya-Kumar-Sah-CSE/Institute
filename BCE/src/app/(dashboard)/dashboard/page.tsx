import { createClient, getUser } from '@/lib/supabase/server';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import CourseCard from '@/features/courses/components/CourseCard';
import { getNotices } from '@/features/notices/actions';
import type { Notice } from '@/features/notices/components/NoticeBoard';
import type { Course } from '@/types';
import { createAdminClient } from '@/lib/supabase/server';
import { getDashboardPolls } from '@/features/courses/actions/polls';
import { getGlobalPolls } from '@/features/polls/actions';
import GlobalPollCard from '@/features/polls/components/GlobalPollCard';
import { Zap, Flame, CheckCircle, Award, User, BookOpen, Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import AddGoalDashboardCard from '@/features/goals/components/AddGoalDashboardCard';
import PinnedGoalAlert from '@/features/goals/components/PinnedGoalAlert';
import { Suspense } from 'react';


const NoticeBoard = dynamic(() => import('@/features/notices/components/NoticeBoard'), { loading: () => <div className="skeleton-dash" style={{ height: '300px', borderRadius: '12px' }}></div> });
const DashboardProfileCard = dynamic(() => import('./components/DashboardProfileCard'), { loading: () => <div className="skeleton-dash" style={{ height: '300px', borderRadius: '12px' }}></div> });
const PollAlerts = dynamic(() => import('./components/PollAlerts'));
const DashboardPolls = dynamic(() => import('./components/DashboardPolls'), { loading: () => <div className="skeleton-dash" style={{ height: '200px', borderRadius: '12px' }}></div> });
const ContinueLearning = dynamic(() => import('./components/ContinueLearning'), { loading: () => <div className="skeleton-dash" style={{ height: '250px', borderRadius: '12px' }}></div> });
const UpcomingContestsAlert = dynamic(() => import('@/features/code-arena/components/contests/UpcomingContestsAlert'), { loading: () => <div className="skeleton-dash" style={{ height: '140px', borderRadius: '12px' }}></div> });
const DashboardAlerts = dynamic(() => import('./components/DashboardAlerts'));
const DashboardBattleBanners = dynamic(() => import('./components/DashboardBattleBanners'));
const NptelAssignmentsWidget = dynamic(() => import('@/features/nptel/components/NptelAssignmentsWidget'));
const ActivityFeed = dynamic(() => import('@/features/activity/components/ActivityFeed'), { 
  loading: () => <div className="skeleton-dash" style={{ height: '300px', borderRadius: '12px' }}></div> 
});
const LearningIntelligenceSection = dynamic(() => import('@/features/analytics/components/LearningIntelligenceSection'), { 
  loading: () => <div className="skeleton-dash" style={{ height: '320px', borderRadius: '12px' }}></div> 
});

interface DashboardEnrollment {
  progress: number;
  status: string;
  course_id: string;
  courses: Course | null;
}

export default async function DashboardPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return null;

  const { getOrCreateProfile } = await import('@/lib/profile');
  const profilePromise = getOrCreateProfile(user);
  
  const settingsPromise = supabase.from('company_settings').select('is_admission_pinned').single();
  const activeGoalPromise = supabase
    .from('student_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const [
    profile,
    { data: settings },
    { data: activeGoal }
  ] = await Promise.all([
    profilePromise,
    settingsPromise,
    activeGoalPromise
  ]);

  if (!profile) return null;

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'minmax(0, 1fr)', 
      gap: 'var(--space-2xl)' 
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>

        {searchParams?.error === 'FileTooLarge' && (
          <div style={{ background: 'rgba(255, 0, 0, 0.1)', border: '1px solid var(--neon-red)', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <strong style={{ color: 'var(--neon-red)', fontSize: 'var(--text-lg)' }}>
              Upload Failed: File Too Large
            </strong>
            <p style={{ color: 'var(--text-primary)', margin: 0 }}>The file you tried to share exceeds the 15MB server limit. Please share a smaller file.</p>
          </div>
        )}

        <div className="dashboard-stats-grid">
          <Link href="/code-arena/profile" style={{ textDecoration: 'none' }} title="View Coding Profile">
            <Card variant="glass" padding="lg" className="stat-card hover-lift">
              <div className="stat-card-icon" style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--neon-cyan)' }}>
                <User size={24} />
              </div>
              <div className="stat-card-content">
                <div suppressHydrationWarning className="stat-card-value" style={{ color: 'var(--neon-cyan)', fontSize: '1.4rem', fontWeight: 800 }}>
                  Profile <span style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.85 }}>View</span>
                </div>
                <div className="text-secondary stat-card-label">Coding Profile</div>
              </div>
            </Card>
          </Link>
          
          <Link href="/code-arena/sheets" style={{ textDecoration: 'none' }} title="View Coding Sheets">
            <Card variant="glass" padding="lg" className="stat-card hover-lift">
              <div className="stat-card-icon" style={{ background: 'rgba(57, 255, 20, 0.1)', color: 'var(--neon-lime)' }}>
                <BookOpen size={24} />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-value" style={{ color: 'var(--neon-lime)', fontSize: '1.4rem', fontWeight: 800 }}>
                  Sheets <span style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.85 }}>Solve</span>
                </div>
                <div className="text-secondary stat-card-label">DSA Sheets</div>
              </div>
            </Card>
          </Link>

          <Link href="/code-arena/problems" style={{ textDecoration: 'none' }} title="Import Problem">
            <Card variant="glass" padding="lg" className="stat-card hover-lift">
              <div className="stat-card-icon" style={{ background: 'rgba(255, 0, 255, 0.1)', color: 'var(--neon-magenta)' }}>
                <Download size={24} />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-value" style={{ color: 'var(--neon-magenta)', fontSize: '1.4rem', fontWeight: 800 }}>
                  Import <span style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.85 }}>New</span>
                </div>
                <div className="text-secondary stat-card-label">Add a Problem</div>
              </div>
            </Card>
          </Link>

          <AddGoalDashboardCard initialGoal={activeGoal} />
        </div>


        <Suspense fallback={null}>
          <PinnedGoalAlert />
        </Suspense>
        
        <Suspense fallback={<div className="skeleton-dash" style={{ height: '320px', borderRadius: '12px' }}></div>}>
          <LearningIntelligenceSection userId={user.id} />
        </Suspense>

        <Suspense fallback={<div className="skeleton-dash" style={{ height: '140px', borderRadius: '12px' }}></div>}>
          <UpcomingContestsAlert />
        </Suspense>

        <Suspense fallback={null}>
          <DeferredPollAlerts userId={user.id} />
        </Suspense>

        <Suspense fallback={null}>
          <DeferredBattles />
        </Suspense>

        <Suspense fallback={<div className="skeleton-dash" style={{ height: '220px', borderRadius: '12px' }}></div>}>
          <DeferredGlobalPolls userId={user.id} role={profile?.role || 'student'} email={profile?.email} />
        </Suspense>

        <Suspense fallback={<div className="skeleton-dash" style={{ height: '220px', borderRadius: '12px' }}></div>}>
          <DeferredDashboardPolls userId={user.id} />
        </Suspense>

        {profile?.role === 'student' && !profile.admission_filled && settings?.is_admission_pinned && (
          <div style={{ background: 'rgba(255, 0, 0, 0.1)', border: '1px solid var(--neon-red)', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <strong style={{ color: 'var(--neon-red)', fontSize: 'var(--text-lg)', display: 'flex', alignItems: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                Mandatory Action Required
              </strong>
            </div>
            <p style={{ color: 'var(--text-primary)', margin: 0 }}>You have not completed your Admission Registration Form yet. This is mandatory for all students.</p>
            <a href="/admission" style={{ display: 'inline-block', alignSelf: 'flex-start', background: 'var(--neon-red)', color: 'white', padding: '10px 16px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold', marginTop: 'var(--space-xs)' }}>
              Fill Admission Form Now
            </a>
          </div>
        )}

        <Suspense fallback={null}>
          <DeferredDashboardAlerts userId={user.id} />
        </Suspense>

        <Suspense fallback={<div className="skeleton-dash" style={{ height: '180px', borderRadius: '12px' }}></div>}>
          <DeferredNptelWidget userId={user.id} />
        </Suspense>

        <Suspense fallback={<div className="skeleton-dash" style={{ height: '250px', borderRadius: '12px' }}></div>}>
          <DeferredContinueLearning userId={user.id} />
        </Suspense>

        <div className="dashboard-bottom-row">
          <div className="dashboard-bottom-col">
            <Suspense fallback={<div className="skeleton-dash" style={{ height: '300px', borderRadius: '12px' }}></div>}>
              <DeferredNotices />
            </Suspense>
          </div>
          
          <div className="dashboard-bottom-col">
            <Suspense fallback={<div className="skeleton-dash" style={{ height: '300px', borderRadius: '12px' }}></div>}>
              <DeferredProfileCard profile={profile} />
            </Suspense>
            <div style={{ marginTop: 'var(--space-2xl)' }}>
              <Suspense fallback={<div className="skeleton-dash" style={{ height: '300px', borderRadius: '12px' }}></div>}>
                <ActivityFeed />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DEFERRED ASYNC COMPONENTS FOR FAST FIRST-SCREEN LOADING ──

async function DeferredPollAlerts({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: pollAlerts } = await supabase
    .from('notifications')
    .select('id, message, created_at, link')
    .eq('user_id', userId)
    .eq('is_read', false)
    .or('message.ilike.%posted a new poll in%,message.ilike.%created a global poll%')
    .order('created_at', { ascending: false });

  if (!pollAlerts || pollAlerts.length === 0) return null;
  return <PollAlerts alerts={pollAlerts} />;
}

async function DeferredBattles() {
  const supabase = await createClient();
  const { data: activeBattles } = await supabase
    .from('coding_battles')
    .select('id, title, status, start_time, end_time, duration_minutes, join_code')
    .in('status', ['LOBBY', 'SCHEDULED', 'LIVE'])
    .order('created_at', { ascending: false })
    .limit(5);

  if (!activeBattles || activeBattles.length === 0) return null;
  return <DashboardBattleBanners battles={activeBattles} />;
}

async function DeferredGlobalPolls({ userId, role, email }: { userId: string; role: string; email?: string }) {
  const globalPolls = await getGlobalPolls();
  const activeGlobalPolls = (globalPolls || []).filter(
    (poll: any) => !poll.expires_at || new Date(poll.expires_at) >= new Date()
  );

  if (!activeGlobalPolls || activeGlobalPolls.length === 0) return null;
  return (
    <div style={{ marginBottom: 'var(--space-2xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Active Global Polls</h2>
        <Link href="/polls" style={{ color: 'var(--neon-cyan)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', whiteSpace: 'nowrap' }}>View all polls →</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 'var(--space-lg)' }}>
        {activeGlobalPolls.map((poll: any) => (
          <GlobalPollCard 
            key={poll.id} 
            poll={poll} 
            currentUserId={userId} 
            currentUserRole={role} 
            currentUserEmail={email}
          />
        ))}
      </div>
    </div>
  );
}

async function DeferredDashboardPolls({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', userId)
    .eq('status', 'approved');

  const ids = enrollments?.map(e => e.course_id) || [];
  if (ids.length === 0) return null;

  const { data: dashboardPolls } = await getDashboardPolls(ids);
  if (!dashboardPolls || dashboardPolls.length === 0) return null;
  return <DashboardPolls polls={dashboardPolls} currentUserId={userId} />;
}

async function DeferredDashboardAlerts({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', userId)
    .eq('status', 'approved');

  const ids = enrollments?.map(e => e.course_id) || [];
  return <DashboardAlerts courseIds={ids} />;
}

async function DeferredNptelWidget({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: nptelMappings } = await supabase
    .from('student_nptel_courses')
    .select('nptel_courses(course_name,nptel_assignments(title,deadline))')
    .eq('student_id', userId)
    .eq('active', true);

  const assignments = (nptelMappings || []).flatMap((mapping: any) => 
    (mapping.nptel_courses?.nptel_assignments || []).map((assignment: any) => ({
      ...assignment,
      courseName: mapping.nptel_courses.course_name,
      status: new Date(assignment.deadline) < new Date() 
        ? 'OVERDUE' 
        : new Date(assignment.deadline).getTime() - Date.now() <= 86400000 
          ? 'URGENT' 
          : 'UPCOMING'
    }))
  ).sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  return <NptelAssignmentsWidget assignments={assignments} />;
}

async function DeferredContinueLearning({ userId }: { userId: string }) {
  const supabase = await createClient();
  const [
    { data: enrollments },
    { data: certificatesData }
  ] = await Promise.all([
    supabase
      .from('enrollments')
      .select('progress, status, course_id, courses(id, title, thumbnail_url, description, difficulty, total_xp, is_published, is_deleted)')
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false }),
    supabase
      .from('certificates')
      .select('id, course_id')
      .eq('user_id', userId)
  ]);

  const certificatesMap: Record<string, string> = {};
  if (certificatesData) {
    certificatesData.forEach(c => {
      certificatesMap[c.course_id] = c.id;
    });
  }

  const validEnrollments = (enrollments || []).filter(
    (e: any) => e.courses && !e.courses.is_deleted
  );

  return <ContinueLearning enrollments={validEnrollments} certificatesMap={certificatesMap} />;
}

async function DeferredNotices() {
  const notices = await getNotices(2);
  if (!notices || notices.length === 0) return null;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>Recent Notices</h2>
        <Link href="/notices" style={{ color: 'var(--neon-cyan)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', whiteSpace: 'nowrap' }}>View all notices →</Link>
      </div>
      <NoticeBoard notices={notices as Notice[]} />
    </div>
  );
}

async function DeferredProfileCard({ profile }: { profile: any }) {
  const adminSb = await createAdminClient();
  const { data: appData } = await adminSb
    .from('instructor_applications')
    .select('status')
    .eq('user_id', profile.id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return <DashboardProfileCard profile={profile} appData={appData} />;
}
