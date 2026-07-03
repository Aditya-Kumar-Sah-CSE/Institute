import { createClient, getUser } from '@/lib/supabase/server';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import CourseCard from '@/features/courses/components/CourseCard';
import { getNotices } from '@/features/notices/actions';
import NoticeBoard from '@/features/notices/components/NoticeBoard';
import type { Notice } from '@/features/notices/components/NoticeBoard';
import type { Course } from '@/types';
import DashboardProfileCard from './components/DashboardProfileCard';
import { createAdminClient } from '@/lib/supabase/server';
import PollAlerts from './components/PollAlerts';
import DashboardPolls from './components/DashboardPolls';
import ContinueLearning from './components/ContinueLearning';
import { getDashboardPolls } from '@/features/courses/actions/polls';
import { Zap, Flame, CheckCircle, Award } from 'lucide-react';

interface DashboardEnrollment {
  progress: number;
  status: string;
  course_id: string;
  courses: Course | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return null;

  const profilePromise = supabase.from('profiles').select('id, name, xp, streak_days, last_active_at, role').eq('id', user.id).single();
  
  // Fetch enrollments with course details
  const enrollmentsPromise = supabase
    .from('enrollments')
    .select('progress, status, course_id, courses(id, title, thumbnail_url, description, difficulty, xp_reward, profiles(name))')
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false });

  // Quick stats
  const completedAssignmentsPromise = supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'approved');

  const certificatesPromise = supabase
    .from('certificates')
    .select('id, course_id')
    .eq('user_id', user.id);

  const earnedBadgesPromise = supabase
    .from('user_badges')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Fetch recent 2 notices
  const noticesPromise = getNotices(2);

  const adminSb = await createAdminClient();
  const appDataPromise = adminSb
    .from('instructor_applications')
    .select('status')
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch unread poll alerts
  const pollAlertsPromise = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_read', false)
    .like('message', '%posted a new poll in%')
    .order('created_at', { ascending: false });

  // We can fetch polls in parallel by just letting it run, though it needs course_ids.
  // Wait, if it needs course_ids, it depends on enrollments.
  // Let's use the enrollmentsPromise instead of making a duplicate query.
  const dashboardPollsPromise = enrollmentsPromise.then(res => {
    const ids = res.data?.filter(e => e.status === 'approved').map(e => e.course_id) || [];
    return getDashboardPolls(ids);
  });

  const [
    { data: profile },
    { data: enrollments },
    { count: completedAssignments },
    { count: earnedBadges },
    notices,
    { data: appData },
    { data: pollAlerts },
    { data: dashboardPolls },
    { data: certificatesData }
  ] = await Promise.all([
    profilePromise,
    enrollmentsPromise,
    completedAssignmentsPromise,
    earnedBadgesPromise,
    noticesPromise,
    appDataPromise,
    pollAlertsPromise,
    dashboardPollsPromise,
    certificatesPromise
  ]);

  const enrolledCourses = enrollments?.filter(e => e.courses).map(e => e.courses as Course) || [];
  
  // Create a map of course_id -> certificate_id
  const certificatesMap: Record<string, string> = {};
  if (certificatesData) {
    certificatesData.forEach(c => {
      certificatesMap[c.course_id] = c.id;
    });
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'minmax(0, 1fr)', 
      gap: 'var(--space-2xl)' 
    }}>
      {/* Use media queries from global.css or inline for 2 cols on desktop if desired, but we can just use flex for safety */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
        <div className="dashboard-welcome">
          <h1 className="text-gradient" style={{ fontSize: 'var(--text-4xl)', marginBottom: 'var(--space-xs)' }}>
            Welcome back, {profile?.name.split(' ')[0]}!
          </h1>
          <p className="text-secondary" style={{ fontSize: 'var(--text-lg)' }}>
            Ready to continue your learning journey?
          </p>
        </div>

        <div className="dashboard-stats-grid">
          <Link href="/profile" style={{ textDecoration: 'none' }}>
            <Card variant="glass" padding="lg" className="stat-card hover-lift">
              <div className="stat-card-icon" style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--neon-cyan)' }}>
                <Zap size={24} />
              </div>
              <div className="stat-card-content">
                <div suppressHydrationWarning className="stat-card-value" style={{ color: 'var(--neon-cyan)' }}>
                  {profile?.xp.toLocaleString('en-US')}
                </div>
                <div className="text-secondary stat-card-label">Total XP</div>
              </div>
            </Card>
          </Link>
          
          <Link href="/profile" style={{ textDecoration: 'none' }}>
            <Card variant="glass" padding="lg" className="stat-card hover-lift">
              <div className="stat-card-icon" style={{ background: 'rgba(255, 0, 255, 0.1)', color: 'var(--neon-magenta)' }}>
                <Flame size={24} />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-value" style={{ color: 'var(--neon-magenta)' }}>
                  {profile?.streak_days}
                </div>
                <div className="text-secondary stat-card-label">Day Streak</div>
              </div>
            </Card>
          </Link>

          <Link href="/profile" style={{ textDecoration: 'none' }}>
            <Card variant="glass" padding="lg" className="stat-card hover-lift">
              <div className="stat-card-icon" style={{ background: 'rgba(57, 255, 20, 0.1)', color: 'var(--neon-lime)' }}>
                <CheckCircle size={24} />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-value" style={{ color: 'var(--neon-lime)' }}>
                  {completedAssignments || 0}
                </div>
                <div className="text-secondary stat-card-label">Tasks Completed</div>
              </div>
            </Card>
          </Link>

          <Link href="/profile" style={{ textDecoration: 'none' }}>
            <Card variant="glass" padding="lg" className="stat-card hover-lift">
              <div className="stat-card-icon" style={{ background: 'rgba(255, 215, 0, 0.1)', color: 'var(--neon-gold)' }}>
                <Award size={24} />
              </div>
              <div className="stat-card-content">
                <div className="stat-card-value" style={{ color: 'var(--neon-gold)' }}>
                  {earnedBadges || 0}
                </div>
                <div className="text-secondary stat-card-label">Badges Earned</div>
              </div>
            </Card>
          </Link>
        </div>

        {pollAlerts && pollAlerts.length > 0 && (
          <PollAlerts alerts={pollAlerts} />
        )}

        {dashboardPolls && dashboardPolls.length > 0 && (
          <DashboardPolls polls={dashboardPolls} currentUserId={user.id} />
        )}

        <div style={{ marginTop: 'var(--space-2xl)' }}>
          <ContinueLearning enrollments={enrollments || []} certificatesMap={certificatesMap} />
        </div>

        <div className="dashboard-bottom-row">
          <div className="dashboard-bottom-col">
            {notices && notices.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                  <h2 style={{ fontSize: 'var(--text-2xl)' }}>Recent Notices</h2>
                  <Link href="/notices" style={{ color: 'var(--neon-cyan)' }}>View all notices →</Link>
                </div>
                <NoticeBoard notices={notices as Notice[]} />
              </div>
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
