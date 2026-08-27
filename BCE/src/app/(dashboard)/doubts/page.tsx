import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Card from '@/components/ui/Card';
import HubDoubtCard from '@/app/(dashboard)/batch/[batchId]/doubts/components/HubDoubtCard';

export const dynamic = 'force-dynamic';

export default async function DoubtsRedirectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('graduation_period, role').eq('id', user.id).single();

  if (!profile) return <div>Profile not found.</div>;

  if (profile.role === 'admin' || profile.role === 'instructor') {
    const { data: teachingCourses } = await supabase
      .from('courses')
      .select('id')
      .eq('created_by', user.id)
      .eq('is_deleted', false);
      
    const teachingCourseIds = teachingCourses?.map(c => c.id) || [];

    // 2. Get courses the faculty is enrolled in
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('user_id', user.id);
      
    const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];
    
    // Combine both sets of course IDs
    const courseIds = Array.from(new Set([...teachingCourseIds, ...enrolledCourseIds]));

    let doubtsQuery = supabase
      .from('doubts')
      .select(`
        *, 
        author:profiles(name, avatar_url, role), 
        course:courses(id, title), 
        lesson:lessons(id, title),
        view_count:doubt_views(count),
        replies:doubt_replies(count)
      `)
      .order('created_at', { ascending: false })
      .limit(30);

    // Apply filter: If they teach courses or are enrolled, only show those doubts.
    // If they have 0 courses (even if admin), show none as requested.
    if (courseIds.length > 0) {
      doubtsQuery = doubtsQuery.in('course_id', courseIds);
    } else {
      doubtsQuery = doubtsQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // Force empty
    }

    const { data: doubts, error } = await doubtsQuery;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', margin: 0, background: 'linear-gradient(45deg, var(--neon-blue), var(--neon-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Faculty Doubts Hub
          </h1>
          <p className="text-secondary" style={{ marginTop: 'var(--space-2xs)' }}>
             Review and resolve doubts from your courses.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {doubts && doubts.length > 0 ? (
            doubts.map((doubt: any) => (
              <HubDoubtCard key={doubt.id} doubt={doubt} batchId={doubt.batch || 'global'} />
            ))
          ) : (
            <Card variant="glass" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: 'var(--space-md)' }}>✨</span>
              <h3 style={{ color: 'var(--text-primary)' }}>No active doubts</h3>
              <p className="text-secondary">Everything is perfectly clear right now!</p>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // For students
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id, courses!inner(is_deleted)')
    .eq('user_id', user.id)
    .eq('courses.is_deleted', false);

  const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];

  let studentDoubtsQuery = supabase
    .from('doubts')
    .select(`
      *, 
      author:profiles(name, avatar_url, role), 
      course:courses(id, title), 
      lesson:lessons(id, title),
      view_count:doubt_views(count),
      replies:doubt_replies(count)
    `)
    .order('created_at', { ascending: false })
    .limit(30);

  if (enrolledCourseIds.length > 0) {
    studentDoubtsQuery = studentDoubtsQuery.in('course_id', enrolledCourseIds);
  } else {
    studentDoubtsQuery = studentDoubtsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  const { data: studentDoubts } = await studentDoubtsQuery;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-3xl)', margin: 0, background: 'linear-gradient(45deg, var(--neon-blue), var(--neon-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          My Doubts Hub
        </h1>
        <p className="text-secondary" style={{ marginTop: 'var(--space-2xs)' }}>
           Recent doubts and discussions from your enrolled courses.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {studentDoubts && studentDoubts.length > 0 ? (
          studentDoubts.map((doubt: any) => (
            <HubDoubtCard key={doubt.id} doubt={doubt} batchId={doubt.batch || 'global'} />
          ))
        ) : (
          <Card variant="glass" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: 'var(--space-md)' }}>📝</span>
            <h3 style={{ color: 'var(--text-primary)' }}>No active doubts</h3>
            <p className="text-secondary">It's quiet in your courses right now.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
