import { createClient, getUser } from '@/lib/supabase/server';
import Link from 'next/link';
import Card from '@/components/ui/Card';
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
import { Suspense } from 'react';

const NoticeBoard = dynamic(() => import('@/features/notices/components/NoticeBoard'), { loading: () => <div className="skeleton-dash" style={{ height: '300px', borderRadius: '12px' }}></div> });
const DashboardPolls = dynamic(() => import('./components/DashboardPolls'), { loading: () => <div className="skeleton-dash" style={{ height: '200px', borderRadius: '12px' }}></div> });
import LearningIntelligenceSection from '@/features/analytics/components/LearningIntelligenceSection';

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
    <div className="dashboard-main-container">
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


        <Suspense fallback={<div className="skeleton-dash" style={{ height: '320px', borderRadius: '12px' }}></div>}>
          <LearningIntelligenceSection userId={user.id} />
        </Suspense>

        <div className="dashboard-bottom-row">
          <div className="dashboard-bottom-col">
            <Suspense fallback={<div className="skeleton-dash" style={{ height: '220px', borderRadius: '12px' }}></div>}>
              <DeferredGlobalPolls userId={user.id} role={profile?.role || 'student'} email={profile?.email} />
            </Suspense>

            <Suspense fallback={<div className="skeleton-dash" style={{ height: '220px', borderRadius: '12px' }}></div>}>
              <DeferredDashboardPolls userId={user.id} />
            </Suspense>
          </div>
          
          <div className="dashboard-bottom-col">
            <Suspense fallback={<div className="skeleton-dash" style={{ height: '300px', borderRadius: '12px' }}></div>}>
              <DeferredNotices />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DEFERRED ASYNC COMPONENTS FOR FAST FIRST-SCREEN LOADING ──

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
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
