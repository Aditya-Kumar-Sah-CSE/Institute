import { createClient } from '@/lib/supabase/server';
import Card from '@/components/ui/Card';
import StudentLeaderboardTable from './components/StudentLeaderboardTable';
import Link from 'next/link';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { Users, Activity, CheckCircle, Zap } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h1 className="text-gradient">Administration</h1>
        <p className="text-secondary">Monitor student progress, manage faculty, and view overall platform engagement.</p>
      </div>

      {/* Overview Panel */}
      <div className="dashboard-stats-grid">
        <Card variant="glass" padding="lg" className="stat-card hover-lift">
          <div className="stat-card-icon" style={{ background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)', color: 'var(--accent-primary)' }}>
            <Users size={24} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value" style={{ color: 'var(--accent-primary)' }}>
              {totalMembers}
            </div>
            <div className="text-secondary stat-card-label">Total Members</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {students.length} Std • {instructors.length} Fac
            </div>
          </div>
        </Card>
        
        <Card variant="glass" padding="lg" className="stat-card hover-lift">
          <div className="stat-card-icon" style={{ background: 'color-mix(in srgb, var(--accent-secondary) 10%, transparent)', color: 'var(--accent-secondary)' }}>
            <Activity size={24} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value" style={{ color: 'var(--accent-secondary)' }}>
              {activeStudents}
            </div>
            <div className="text-secondary stat-card-label">Active (7d)</div>
          </div>
        </Card>

        <Card variant="glass" padding="lg" className="stat-card hover-lift">
          <div className="stat-card-icon" style={{ background: 'color-mix(in srgb, var(--accent-warning) 10%, transparent)', color: 'var(--accent-warning)' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value" style={{ color: 'var(--accent-warning)' }}>
              {avgCompletion}%
            </div>
            <div className="text-secondary stat-card-label">Avg Completion</div>
          </div>
        </Card>

        <Card variant="glass" padding="lg" className="stat-card hover-lift">
          <div className="stat-card-icon" style={{ background: 'color-mix(in srgb, var(--accent-success) 10%, transparent)', color: 'var(--accent-success)' }}>
            <Zap size={24} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value" style={{ color: 'var(--accent-success)' }}>
              {totalXPEarned}
            </div>
            <div className="text-secondary stat-card-label">Total XP Earned</div>
          </div>
        </Card>
      </div>

      {/* Student Table */}
      <Card variant="glass" padding="sm">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>
            Administration & Leaderboard
          </h2>
        </div>
        <StudentLeaderboardTable 
          students={allUsers || []} 
          isInstructor={isInstructor} 
          currentUserId={user?.id} 
          currentUserEmail={user?.email}
          superAdminEmail={SUPER_ADMIN_EMAIL} 
        />
      </Card>
    </div>
  );
}


