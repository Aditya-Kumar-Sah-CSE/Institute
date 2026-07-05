import Link from 'next/link';
import Card from '@/components/ui/Card';
import NoticeBoard from '@/features/notices/components/NoticeBoard';
import type { Notice } from '@/features/notices/components/NoticeBoard';
import DashboardProfileCard from './components/DashboardProfileCard';
import { getDashboardData } from './actions';
import { auth } from '@/lib/auth/auth.config';
import { redirect } from 'next/navigation';
import { Zap, Flame, CheckCircle, Award } from 'lucide-react';
import ContinueLearning from './components/ContinueLearning';
import DashboardPolls from './components/DashboardPolls';
import PollAlerts from './components/PollAlerts';

export default async function DashboardPage({ params }: { params: Promise<{ tenant: string }> }) {
  const session = await auth();
  const { tenant } = await params;

  if (!session || !session.user) {
    redirect(`/${tenant}/login`);
  }

  // Use the Drizzle actions logic I built before!
  const data = await getDashboardData(session.user.id || '');

  // Mocking the values for the legacy components that expect Supabase payloads
  const profile = {
    id: session.user.id || '',
    name: session.user.name || 'Admin',
    xp: 5000,
    streak_days: 12,
    role: (session.user as any).role || 'student',
    admission_filled: true,
  };

  const enrollments = data.enrollments.map(enr => ({
    progress: enr.progress || 0,
    status: enr.status,
    course_id: enr.course_id,
    courses: enr.course
  }));

  const completedAssignments = data.completedAssignments || 0;
  const earnedBadges = data.earnedBadges || 0;
  const notices: Notice[] = [];
  const appData = null;
  const pollAlerts: any[] = [];
  const dashboardPolls: any[] = [];
  const certificatesMap: Record<string, string> = {};
  const settings = { is_admission_pinned: false };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'minmax(0, 1fr)', 
      gap: 'var(--space-2xl)' 
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
        <div className="dashboard-welcome">
          <h1 className="text-gradient" style={{ fontSize: 'var(--text-4xl)', marginBottom: 'var(--space-xs)' }}>
            Welcome back, {profile?.name?.split(' ')[0] || 'Student'}!
          </h1>
          <p className="text-secondary" style={{ fontSize: 'var(--text-lg)' }}>
            Ready to continue your learning journey?
          </p>
        </div>

        <div className="dashboard-stats-grid">
          <Link href={`/${tenant}/profile`} style={{ textDecoration: 'none' }}>
            <Card variant="glass" padding="lg" className="stat-card hover-lift">
              <div className="stat-card-icon" style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--neon-cyan)' }}>
                <Zap size={24} />
              </div>
              <div className="stat-card-content">
                <div suppressHydrationWarning className="stat-card-value" style={{ color: 'var(--neon-cyan)' }}>
                  {profile.xp.toLocaleString('en-US')}
                </div>
                <div className="text-secondary stat-card-label">Total XP</div>
              </div>
            </Card>
          </Link>
          
          <Link href={`/${tenant}/profile`} style={{ textDecoration: 'none' }}>
            <Card variant="glass" padding="lg" className="stat-card hover-lift">
              <div className="stat-card-icon" style={{ background: 'rgba(255, 0, 255, 0.1)', color: 'var(--neon-magenta)' }}>
                <Flame size={24} />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-value" style={{ color: 'var(--neon-magenta)' }}>
                  {profile.streak_days}
                </div>
                <div className="text-secondary stat-card-label">Day Streak</div>
              </div>
            </Card>
          </Link>

          <Link href={`/${tenant}/profile`} style={{ textDecoration: 'none' }}>
            <Card variant="glass" padding="lg" className="stat-card hover-lift">
              <div className="stat-card-icon" style={{ background: 'rgba(57, 255, 20, 0.1)', color: 'var(--neon-lime)' }}>
                <CheckCircle size={24} />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-value" style={{ color: 'var(--neon-lime)' }}>
                  {completedAssignments}
                </div>
                <div className="text-secondary stat-card-label">Tasks Completed</div>
              </div>
            </Card>
          </Link>

          <Link href={`/${tenant}/profile`} style={{ textDecoration: 'none' }}>
            <Card variant="glass" padding="lg" className="stat-card hover-lift">
              <div className="stat-card-icon" style={{ background: 'rgba(255, 215, 0, 0.1)', color: 'var(--neon-gold)' }}>
                <Award size={24} />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-value" style={{ color: 'var(--neon-gold)' }}>
                  {earnedBadges}
                </div>
                <div className="text-secondary stat-card-label">Badges Earned</div>
              </div>
            </Card>
          </Link>
        </div>

        {pollAlerts.length > 0 && <PollAlerts alerts={pollAlerts} />}

        {profile?.role === 'student' && !profile.admission_filled && settings?.is_admission_pinned && (
          <div style={{ background: 'rgba(255, 0, 0, 0.1)', border: '1px solid var(--neon-red)', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <strong style={{ color: 'var(--neon-red)', fontSize: 'var(--text-lg)', display: 'flex', alignItems: 'center' }}>
                Mandatory Action Required
              </strong>
            </div>
            <p style={{ color: 'var(--text-primary)', margin: 0 }}>You have not completed your Admission Registration Form yet. This is mandatory for all students.</p>
            <a href={`/${tenant}/admission`} style={{ display: 'inline-block', alignSelf: 'flex-start', background: 'var(--neon-red)', color: 'white', padding: '10px 16px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold', marginTop: 'var(--space-xs)' }}>
              Fill Admission Form Now
            </a>
          </div>
        )}

        {dashboardPolls.length > 0 && <DashboardPolls polls={dashboardPolls} currentUserId={session.user.id || ''} />}

        <div style={{ marginTop: 'var(--space-2xl)' }}>
          <ContinueLearning enrollments={enrollments || []} certificatesMap={certificatesMap} />
        </div>

        <div className="dashboard-bottom-row">
          <div className="dashboard-bottom-col">
            {notices.length > 0 ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                  <h2 style={{ fontSize: 'var(--text-2xl)' }}>Recent Notices</h2>
                  <Link href={`/${tenant}/notices`} style={{ color: 'var(--neon-cyan)' }}>View all notices →</Link>
                </div>
                <NoticeBoard notices={notices as Notice[]} />
              </div>
            ) : (
                <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem' }}>No recent notices.</div>
            )}
          </div>
          
          <div className="dashboard-bottom-col">
            <DashboardProfileCard profile={profile} appData={appData} />
          </div>
        </div>
      </div>
  </div>
  );
}
