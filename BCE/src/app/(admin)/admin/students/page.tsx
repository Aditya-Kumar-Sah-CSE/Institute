import { createClient } from '@/lib/supabase/server';
import Card from '@/components/ui/Card';
import StudentLeaderboardTable from './components/StudentLeaderboardTable';
import Link from 'next/link';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';

export default async function AdminStudentsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
  const isInstructor = profile?.role === 'instructor';

  // Fetch all users and their enrollments to calculate progress
  // We need all users to show member breakdown, but only students for the table
  const { data: allUsers } = await supabase
    .from('profiles')
    .select(`
      *,
      enrollments (
        id,
        progress,
        status,
        course_id,
        courses (
          title,
          created_by
        )
      )
    `)
    .order('xp', { ascending: false });

  const students = allUsers?.filter(u => u.role === 'student') || [];
  const instructors = allUsers?.filter(u => u.role === 'instructor') || [];

  // Calculate stats for the overview panel
  const totalMembers = allUsers?.length || 0;
  const activeStudents = students.filter(s => s.last_active_at && (new Date().getTime() - new Date(s.last_active_at).getTime() < 7 * 24 * 60 * 60 * 1000)).length || 0; // active in last 7 days
  const totalXPEarned = students.reduce((sum, s) => sum + (s.xp || 0), 0) || 0;
  
  // Calculate average completion rate (only for students)
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
        <h1 className="text-gradient">Administration & Tracking</h1>
        <p className="text-secondary">Monitor student progress, manage faculty, and view overall platform engagement.</p>
      </div>

      {/* Overview Panel */}
      <div className="dashboard-stats-grid">
        <Card variant="glass" padding="lg">
          <div className="stat-card-value" style={{ color: 'var(--neon-cyan)' }}>
            {totalMembers}
          </div>
          <div className="text-secondary stat-card-label">Total Members</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', opacity: 0.8 }}>
            {students.length} Students • {instructors.length} Faculty
          </div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>
            Administration & Leaderboard
          </h2>
        </div>
        <StudentLeaderboardTable 
          students={allUsers || []} 
          isInstructor={isInstructor} 
          currentUserId={user?.id} 
          superAdminEmail={SUPER_ADMIN_EMAIL} 
        />
      </Card>
    </div>
  );
}


