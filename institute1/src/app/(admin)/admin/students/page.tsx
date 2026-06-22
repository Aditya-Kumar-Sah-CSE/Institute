import { createClient } from '@/lib/supabase/server';
import Card from '@/components/ui/Card';
import StudentLeaderboardTable from './components/StudentLeaderboardTable';

export default async function AdminStudentsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
  const isInstructor = profile?.role === 'instructor';

  // Fetch all students and their enrollments to calculate progress
  // In Supabase we can query profiles with a left join to enrollments
  const { data: students } = await supabase
    .from('profiles')
    .select(`
      *,
      enrollments (
        id,
        progress,
        status,
        course_id,
        courses (
          title
        )
      )
    `)
    .neq('role', 'admin')
    .order('xp', { ascending: false });

  // Calculate stats for the overview panel
  const totalStudents = students?.length || 0;
  const activeStudents = students?.filter(s => s.last_active_at && (new Date().getTime() - new Date(s.last_active_at).getTime() < 7 * 24 * 60 * 60 * 1000)).length || 0; // active in last 7 days
  const totalXPEarned = students?.reduce((sum, s) => sum + (s.xp || 0), 0) || 0;
  
  // Calculate average completion rate
  let totalProgress = 0;
  let enrollmentCount = 0;
  students?.forEach(student => {
    student.enrollments?.forEach((enr: { progress: number }) => {
      totalProgress += (enr.progress || 0);
      enrollmentCount++;
    });
  });
  const avgCompletion = enrollmentCount > 0 ? Math.round((totalProgress / enrollmentCount) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
      <div className="page-header">
        <h1 className="text-gradient">Student Tracking</h1>
        <p className="text-secondary">Monitor student progress, XP, and active engagement.</p>
      </div>

      {/* Overview Panel */}
      <div className="dashboard-stats-grid">
        <Card variant="glass" padding="lg">
          <div className="stat-card-value" style={{ color: 'var(--neon-cyan)' }}>
            {totalStudents}
          </div>
          <div className="text-secondary stat-card-label">Total Users</div>
        </Card>
        
        <Card variant="glass" padding="lg">
          <div className="stat-card-value" style={{ color: 'var(--neon-magenta)' }}>
            {activeStudents}
          </div>
          <div className="text-secondary stat-card-label">Active Users (7d)</div>
        </Card>

        <Card variant="glass" padding="lg">
          <div className="stat-card-value" style={{ color: 'var(--neon-gold)' }}>
            {avgCompletion}%
          </div>
          <div className="text-secondary stat-card-label">Avg Completion</div>
        </Card>

        <Card variant="glass" padding="lg">
          <div className="stat-card-value" style={{ color: 'var(--neon-lime)' }}>
            {totalXPEarned}
          </div>
          <div className="text-secondary stat-card-label">Total XP Earned</div>
        </Card>
      </div>

      {/* Student Table */}
      <Card variant="glass" padding="lg">
        <h2 style={{ marginBottom: 'var(--space-xl)', fontSize: 'var(--text-xl)' }}>Student Leaderboard & Details</h2>
        <StudentLeaderboardTable students={students || []} isInstructor={isInstructor} />
      </Card>
    </div>
  );
}
