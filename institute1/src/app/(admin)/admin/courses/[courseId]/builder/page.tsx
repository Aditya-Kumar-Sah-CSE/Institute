import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CurriculumBuilder from '@/features/admin/components/CurriculumBuilder';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { User } from 'lucide-react';

export default async function CourseBuilderPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const supabase = await createClient();

  // Fetch course
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (!course) notFound();

  // Fetch lessons with assignments
  const { data: lessons } = await supabase
    .from('lessons')
    .select(`
      *,
      assignments (*)
    `)
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });


  // Fetch enrolled students
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, profiles(name, email, avatar_url, institute_id)')
    .eq('course_id', courseId);

  // Fetch submissions for assignments in this course
  const assignmentIds = lessons?.flatMap(l => l.assignments?.map((a: any) => a.id) || []) || [];
  let submissions: any[] = [];
  if (assignmentIds.length > 0) {
    const { data: subs } = await supabase
      .from('submissions')
      .select('*, profiles(name, avatar_url)')
      .in('assignment_id', assignmentIds);
    submissions = subs || [];
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <Link href="/admin/courses" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          ← Back to Courses
        </Link>
      </div>
      
      <CurriculumBuilder course={course} lessons={lessons || []} submissions={submissions} />

      <div style={{ marginTop: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>Joined Students</h2>
        {enrollments && enrollments.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
            {enrollments.map((enrollment: any) => (
              <Card key={enrollment.id} variant="glass" style={{ padding: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  {enrollment.profiles?.avatar_url ? (
                    <img 
                      src={enrollment.profiles.avatar_url} 
                      alt={enrollment.profiles.name} 
                      style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>
                      <User size={24} opacity={0.5} />
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px 0' }}>{enrollment.profiles?.name || 'Unknown User'}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 2px 0' }}>{enrollment.profiles?.email}</p>
                    {enrollment.profiles?.institute_id && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 6px 0', opacity: 0.8 }}>ID: {enrollment.profiles.institute_id}</p>
                    )}
                    <div style={{ 
                      fontSize: '0.75rem', 
                      display: 'inline-block', 
                      padding: '2px 8px', 
                      borderRadius: 12, 
                      backgroundColor: enrollment.status === 'approved' ? 'rgba(0, 255, 0, 0.1)' : 
                                       enrollment.status === 'rejected' ? 'rgba(255, 0, 0, 0.1)' : 
                                       'rgba(255, 165, 0, 0.1)', 
                      color: enrollment.status === 'approved' ? 'var(--neon-lime)' : 
                             enrollment.status === 'rejected' ? 'var(--danger)' : 
                             'var(--neon-gold)' 
                    }}>
                      {enrollment.status ? enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1) : 'Joined'}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No students have joined this course yet.</p>
        )}
      </div>
    </div>
  );
}
