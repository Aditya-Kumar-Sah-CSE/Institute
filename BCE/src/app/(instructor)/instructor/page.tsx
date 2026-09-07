import { createClient, createAdminClient } from '@/lib/supabase/server';

import Card from '@/components/ui/Card';
import Link from 'next/link';
import { BookOpen, FileText, Users, UserPlus } from 'lucide-react';
import InstructorCoursesList from './InstructorCoursesList';
export const dynamic = 'force-dynamic';

export default async function InstructorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch instructor's courses
  const { data: courses } = await supabase
    .from('courses')
    .select('*, lessons(id)')
    .eq('created_by', user?.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  const courseCount = courses?.length || 0;
  const courseIds = courses?.map(c => c.id) || [];

  let studentCount = 0;
  let pendingReviewsCount = 0;
  let enrollmentRequestsCount = 0;

  if (courseIds.length > 0) {
    // Total Students (unique enrollments in instructor's courses)
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('user_id')
      .in('course_id', courseIds)
      .eq('status', 'approved');
    const uniqueUsers = new Set(enrollments?.map(e => e.user_id));
    studentCount = uniqueUsers.size;

    // Enrollment Requests
    const { data: pendingEnrollments } = await supabase
      .from('enrollments')
      .select('id')
      .in('course_id', courseIds)
      .eq('status', 'pending');
    enrollmentRequestsCount = pendingEnrollments?.length || 0;

    // Pending Reviews
    const { data: lessons } = await supabase.from('lessons').select('id').in('course_id', courseIds);
    const lessonIds = lessons?.map(l => l.id) || [];
    
    if (lessonIds.length > 0) {
      const { data: assignments } = await supabase.from('assignments').select('id').in('lesson_id', lessonIds);
      const assignmentIds = assignments?.map(a => a.id) || [];
      
      if (assignmentIds.length > 0) {
        try {
          // Use admin client to genuinely bypass RLS
          const serviceRoleClient = await createAdminClient();
          const { count } = await serviceRoleClient
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .in('assignment_id', assignmentIds)
            .eq('status', 'pending');
          pendingReviewsCount = count || 0;
        } catch (error) {
          console.error("Failed to fetch pending reviews:", error);
          pendingReviewsCount = 0;
        }
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h1 className="text-gradient">Instructor Dashboard</h1>
        <p className="text-secondary">Manage your courses, lessons, and students.</p>
      </div>

      <div className="dashboard-stats-grid">
        <Link href={courseIds.length > 0 ? `/leaderboard?filter=${courseIds[0]}` : '/leaderboard'} style={{ textDecoration: 'none' }}>
          <Card variant="glass" padding="lg" className="stat-card hover-lift" style={{ height: '100%' }}>
            <div className="stat-card-icon" style={{ background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)', color: 'var(--accent-primary)' }}>
              <Users size={24} />
            </div>
            <div className="stat-card-content">
              <div className="stat-card-value" style={{ color: 'var(--accent-primary)' }}>
                {studentCount}
              </div>
              <div className="text-secondary stat-card-label">Total Students</div>
            </div>
          </Card>
        </Link>
        
        <Link href="/instructor/courses" style={{ textDecoration: 'none' }}>
          <Card variant="glass" padding="lg" className="stat-card hover-lift" style={{ height: '100%' }}>
            <div className="stat-card-icon" style={{ background: 'color-mix(in srgb, var(--accent-secondary) 10%, transparent)', color: 'var(--accent-secondary)' }}>
              <BookOpen size={24} />
            </div>
            <div className="stat-card-content">
              <div className="stat-card-value" style={{ color: 'var(--accent-secondary)' }}>
                {courseCount}
              </div>
              <div className="text-secondary stat-card-label">Your Courses</div>
            </div>
          </Card>
        </Link>

        <Link href="/instructor/submissions" style={{ textDecoration: 'none' }}>
          <Card variant="glass" padding="lg" className="stat-card hover-lift" style={{ height: '100%' }}>
            <div className="stat-card-icon" style={{ background: 'color-mix(in srgb, var(--accent-warning) 10%, transparent)', color: 'var(--accent-warning)' }}>
              <FileText size={24} />
            </div>
            <div className="stat-card-content">
              <div className="stat-card-value" style={{ color: 'var(--accent-warning)' }}>
                {pendingReviewsCount}
              </div>
              <div className="text-secondary stat-card-label">Pending Reviews</div>
            </div>
          </Card>
        </Link>
        
        <Link href="/instructor/enrollments" style={{ textDecoration: 'none' }}>
          <Card variant="glass" padding="lg" className="stat-card hover-lift" style={{ height: '100%' }}>
            <div className="stat-card-icon" style={{ background: 'color-mix(in srgb, var(--accent-info) 10%, transparent)', color: 'var(--accent-info)' }}>
              <UserPlus size={24} />
            </div>
            <div className="stat-card-content">
              <div className="stat-card-value" style={{ color: 'var(--accent-info)' }}>
                {enrollmentRequestsCount}
              </div>
              <div className="text-secondary stat-card-label">St. Approval</div>
            </div>
          </Card>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-xl)' }}>
        <Card variant="glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)' }}>Your Courses</h2>
            <Link href="/instructor/courses" className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 'var(--text-sm)' }}>
              Create New
            </Link>
          </div>
          
          <InstructorCoursesList courses={courses || []} />
        </Card>

        <Card variant="glass">
          <h2 style={{ marginBottom: 'var(--space-lg)', fontSize: 'var(--text-xl)' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <Link href="/instructor/courses" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '16px 20px', fontSize: 'var(--text-md)', gap: '12px' }}>
              <BookOpen className="w-5 h-5 text-neon-cyan" /> Course Manager
            </Link>
            <Link href="/instructor/submissions" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '16px 20px', fontSize: 'var(--text-md)', gap: '12px' }}>
              <FileText className="w-5 h-5 text-neon-gold" /> Review Submissions
            </Link>
          </div>
          <p style={{ marginTop: 'var(--space-lg)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Note: Instructor tools currently share some UI with the Admin Panel, but access is restricted to your own courses.
          </p>
        </Card>
      </div>
    </div>
  );
}


