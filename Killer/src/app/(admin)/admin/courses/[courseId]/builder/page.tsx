import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CurriculumBuilder from '@/features/admin/components/CurriculumBuilder';
import Link from 'next/link';

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

  // Fetch course badges
  const { data: badges } = await supabase
    .from('badges')
    .select('*')
    .eq('course_id', courseId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <Link href="/admin/courses" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          ← Back to Courses
        </Link>
      </div>
      
      <CurriculumBuilder course={course} lessons={lessons || []} courseBadges={badges || []} />
    </div>
  );
}
