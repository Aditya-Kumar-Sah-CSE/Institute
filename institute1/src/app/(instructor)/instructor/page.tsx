import { createClient, createAdminClient } from '@/lib/supabase/server';

import Card from '@/components/ui/Card';
import Link from 'next/link';
import { BookOpen, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InstructorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch instructor's courses
  const { data: courses } = await supabase
    .from('courses')
    .select('*, lessons(id)')
    .eq('created_by', user?.id)
    .order('created_at', { ascending: false });

  const courseCount = courses?.length || 0;
  const courseIds = courses?.map(c => c.id) || [];

  let studentCount = 0;
  let pendingReviewsCount = 0;

  if (courseIds.length > 0) {
    // Total Students (unique enrollments in instructor's courses)
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('user_id')
      .in('course_id', courseIds);
    const uniqueUsers = new Set(enrollments?.map(e => e.user_id));
    studentCount = uniqueUsers.size;

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
      <div className="page-header">
        <h1 className="text-gradient">Instructor Dashboard</h1>
        <p className="text-secondary">Manage your courses, lessons, and students.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-lg)' }}>
        <Link href={courseIds.length > 0 ? `/leaderboard?filter=${courseIds[0]}` : '/leaderboard'} style={{ textDecoration: 'none' }}>
          <Card variant="glass" padding="lg" hover style={{ height: '100%' }}>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--neon-cyan)', marginBottom: 'var(--space-xs)' }}>
              {studentCount}
            </div>
            <div className="text-secondary text-sm text-uppercase tracking-wider">Total Students</div>
          </Card>
        </Link>
        
        <Link href="/instructor/courses" style={{ textDecoration: 'none' }}>
          <Card variant="glass" padding="lg" hover style={{ height: '100%' }}>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--neon-magenta)', marginBottom: 'var(--space-xs)' }}>
              {courseCount}
            </div>
            <div className="text-secondary text-sm text-uppercase tracking-wider">Your Courses</div>
          </Card>
        </Link>

        <Link href="/instructor/submissions" style={{ textDecoration: 'none' }}>
          <Card variant="glass" padding="lg" hover style={{ height: '100%' }}>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'bold', color: 'var(--neon-gold)', marginBottom: 'var(--space-xs)' }}>
              {pendingReviewsCount}
            </div>
            <div className="text-secondary text-sm text-uppercase tracking-wider">Pending Reviews</div>
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
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {courses && courses.length > 0 ? (
              courses.map(course => (
                <div key={course.id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-md)', gap: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)' }}>{course.title}</h3>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{course.is_published ? '🟢 Published' : '🟡 Draft'}</p>
                  </div>
                  <Link href={`/instructor/courses/${course.id}/builder`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 'var(--text-sm)', flex: '0 0 auto' }}>
                    Edit Curriculum
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>You haven&apos;t created any courses yet.</p>
            )}
          </div>
        </Card>

        <Card variant="glass">
          <h2 style={{ marginBottom: 'var(--space-lg)', fontSize: 'var(--text-xl)' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <Link href="/instructor/courses" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '16px 20px', fontSize: 'var(--text-md)', gap: '12px' }}>
              <BookOpen className="w-5 h-5 text-neon-cyan" /> Course Manager
            </Link>
            <Link href="/instructor/submissions" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: '16px 20px', fontSize: 'var(--text-md)', gap: '12px' }}>
              <FileText className="w-5 h-5 text-neon-gold" /> Review Student Submissions
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
