import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import CourseCard from '@/features/courses/components/CourseCard';
import { getNotices } from '@/features/notices/actions';
import NoticeBoard from '@/features/notices/components/NoticeBoard';
import type { Notice } from '@/features/notices/components/NoticeBoard';
import type { Course } from '@/types';

interface DashboardEnrollment {
  progress: number;
  status: string;
  course_id: string;
  courses: Course | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const profilePromise = supabase.from('profiles').select('*').eq('id', user.id).single();
  
  // Fetch enrollments with course details
  const enrollmentsPromise = supabase
    .from('enrollments')
    .select('progress, status, course_id, courses(*, profiles(name))')
    .eq('user_id', user.id)
    .order('enrolled_at', { ascending: false })
    .limit(3);

  // Quick stats
  const completedAssignmentsPromise = supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'approved');

  const earnedBadgesPromise = supabase
    .from('user_badges')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Fetch recent 2 notices
  const noticesPromise = getNotices(2);

  const [
    { data: profile },
    { data: enrollments },
    { count: completedAssignments },
    { count: earnedBadges },
    notices
  ] = await Promise.all([
    profilePromise,
    enrollmentsPromise,
    completedAssignmentsPromise,
    earnedBadgesPromise,
    noticesPromise
  ]);

  return (
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
        <Card variant="glass" padding="lg">
          <div className="stat-card-value" style={{ color: 'var(--neon-cyan)' }}>
            {profile?.xp.toLocaleString()}
          </div>
          <div className="text-secondary stat-card-label">Total XP</div>
        </Card>
        
        <Card variant="glass" padding="lg">
          <div className="stat-card-value" style={{ color: 'var(--neon-magenta)' }}>
            {profile?.streak_days} 🔥
          </div>
          <div className="text-secondary stat-card-label">Day Streak</div>
        </Card>

        <Card variant="glass" padding="lg">
          <div className="stat-card-value" style={{ color: 'var(--neon-lime)' }}>
            {completedAssignments || 0}
          </div>
          <div className="text-secondary stat-card-label">Tasks Completed</div>
        </Card>

        <Card variant="glass" padding="lg">
          <div className="stat-card-value" style={{ color: 'var(--neon-gold)' }}>
            {earnedBadges || 0}
          </div>
          <div className="text-secondary stat-card-label">Badges Earned</div>
        </Card>
      </div>

      {notices && notices.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <h2 style={{ fontSize: 'var(--text-2xl)' }}>Recent Notices</h2>
            <Link href="/notices" style={{ color: 'var(--neon-cyan)' }}>View all notices →</Link>
          </div>
          <NoticeBoard notices={notices as Notice[]} />
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)' }}>Continue Learning</h2>
          <Link href="/courses" style={{ color: 'var(--neon-cyan)' }}>Browse all courses →</Link>
        </div>
        
        {enrollments && enrollments.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
            {(enrollments as unknown as DashboardEnrollment[])
              .filter((enr) => enr.courses !== null)
              .map((enr) => (
                <CourseCard key={enr.course_id} course={enr.courses!} progress={enr.progress} status={enr.status} />
              ))}
          </div>
        ) : (
          <Card variant="glass" style={{ padding: 'var(--space-3xl)', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem', opacity: 0.5, display: 'block', marginBottom: 'var(--space-md)' }}>🏜️</span>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>No courses yet</h3>
            <p className="text-secondary" style={{ marginBottom: 'var(--space-lg)' }}>
              Enroll in a course to start your learning journey.
            </p>
            <Link href="/courses">
              <button className="btn btn-primary">Browse Courses</button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
