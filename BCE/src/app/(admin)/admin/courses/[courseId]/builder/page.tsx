import { createClient, createAdminClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import CurriculumBuilder from '@/features/admin/components/CurriculumBuilder';
import Link from 'next/link';
import JoinedStudentsList from '@/features/admin/components/JoinedStudentsList';

export default async function CourseBuilderPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const roleLower = (profile?.role || '').toLowerCase();
  const ALLOWED_STAFF_ROLES = [
    'admin', 'instructor', 'developer', 'faculty', 'super_admin', 'superadmin'
  ];

  if (!roleLower || !ALLOWED_STAFF_ROLES.includes(roleLower)) {
    console.warn(`[CourseBuilderPage] Access denied: User ${user.id} role '${profile?.role}' not authorized.`);
    notFound();
  }

  // Use admin client to reliably fetch course data (bypassing RLS for draft / assigned courses)
  const adminSupabase = await createAdminClient();

  const { data: course } = await adminSupabase
    .from('courses')
    .select('*, course_instructors(instructor_id)')
    .eq('id', courseId)
    .single();

  if (!course || course.is_deleted) {
    console.warn(`[CourseBuilderPage] Course not found or marked deleted: ${courseId}`);
    notFound();
  }

  // Permission check for non-admin instructors
  const isGlobalAdmin = ['admin', 'developer', 'super_admin', 'superadmin'].includes(roleLower);
  if (!isGlobalAdmin) {
    const isCreator = course.created_by === user.id;
    const isAssigned = Array.isArray(course.course_instructors) && course.course_instructors.some((ci: any) => ci.instructor_id === user.id);
    const isUnassignedCourse = !course.created_by && (!course.course_instructors || course.course_instructors.length === 0);

    if (!isCreator && !isAssigned && !isUnassignedCourse) {
      console.warn(`[CourseBuilderPage] Instructor ${user.id} not creator or assigned instructor for course ${courseId}.`);
      notFound();
    }
  }

  // Fetch lessons with assignments
  const { data: lessons } = await adminSupabase
    .from('lessons')
    .select(`
      *,
      assignments (*)
    `)
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });

  // Fetch enrolled students
  const { data: enrollments } = await adminSupabase
    .from('enrollments')
    .select('*, profiles(name, email, avatar_url, institute_id)')
    .eq('course_id', courseId);

  // Fetch submissions for assignments in this course
  const assignmentIds = lessons?.flatMap(l => l.assignments?.map((a: any) => a.id) || []) || [];
  let submissions: any[] = [];
  if (assignmentIds.length > 0) {
    const { data: subs } = await adminSupabase
      .from('submissions')
      .select('*, profiles(name, avatar_url)')
      .in('assignment_id', assignmentIds);
    submissions = subs || [];
  }

  const backUrl = ['instructor', 'faculty'].includes(roleLower) ? '/instructor/courses' : '/admin/courses';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <Link href={backUrl} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
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
