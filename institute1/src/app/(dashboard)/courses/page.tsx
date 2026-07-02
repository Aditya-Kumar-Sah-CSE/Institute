import { createClient } from '@/lib/supabase/server';
import CourseCatalog from '@/features/courses/components/CourseCatalog';
import FacultySection from '@/features/courses/components/FacultySection';

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const coursesQuery = supabase
    .from('courses')
    .select('*, profiles(name)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  const enrollmentsQuery = user ? supabase
    .from('enrollments')
    .select('course_id, progress, status')
    .eq('user_id', user.id) : null;

  const facultyQuery = supabase
    .from('profiles')
    .select('id, name, avatar_url, role, institute_id')
    .in('role', ['instructor', 'admin'])
    .order('name', { ascending: true });

  const [coursesRes, enrollmentsRes, facultyRes] = await Promise.all([
    coursesQuery,
    enrollmentsQuery,
    facultyQuery
  ]);

  const courses = coursesRes.data;
  const enrollments = enrollmentsRes?.data;
  const faculty = (facultyRes.data || []).filter(
    fac => fac.name?.toLowerCase() !== 'iambestadi'
  );

  // Fetch user's enrollments to pass progress to catalog
  const enrollmentsMap: Record<string, { progress: number; status: string }> = {};
  if (enrollments) {
    enrollments.forEach(e => {
      enrollmentsMap[e.course_id] = { progress: e.progress, status: e.status };
    });
  }

  return (
    <div className="courses-page">
      <div className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 className="text-gradient">Course Catalog</h1>
        <p className="text-secondary">Discover new skills and level up your career.</p>
      </div>

      <FacultySection faculty={faculty} />

      <CourseCatalog 
        courses={courses || []} 
        enrollments={enrollmentsMap} 
      />
    </div>
  );
}
