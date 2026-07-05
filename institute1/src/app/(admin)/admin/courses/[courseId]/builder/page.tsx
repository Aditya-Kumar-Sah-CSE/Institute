import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CurriculumBuilder from '@/features/admin/components/CurriculumBuilder';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { User } from 'lucide-react';
import JoinedStudentsList from '@/features/admin/components/JoinedStudentsList';

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
        <JoinedStudentsList enrollments={enrollments || []} />
      </div>
    </div>
  );
}
