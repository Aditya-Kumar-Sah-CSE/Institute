import { createClient } from '@/lib/supabase/server';
import CourseCatalog from '@/features/courses/components/CourseCatalog';

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const coursesQuery = supabase
    .from('courses')
    .select('*, profiles!courses_created_by_fkey(name)')
    .order('created_at', { ascending: false });

  const enrollmentsQuery = user ? supabase
    .from('enrollments')
    .select('course_id, progress, status')
    .eq('user_id', user.id) : null;

  const certificatesQuery = user ? supabase
    .from('certificates')
    .select('id, course_id')
    .eq('user_id', user.id) : null;

  const [coursesRes, enrollmentsRes, certificatesRes] = await Promise.all([
    coursesQuery,
    enrollmentsQuery,
    certificatesQuery
  ]);

  let courses = coursesRes.data;

  // Fallback: Query without join in case foreign key relationship alias cache fails
  if (!courses || courses.length === 0) {
    const { data: rawCourses } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    courses = rawCourses;
  }

  const enrollments = enrollmentsRes?.data;
  const certificatesData = certificatesRes?.data;

  // Fetch user's enrollments to pass progress to catalog
  const enrollmentsMap: Record<string, { progress: number; status: string }> = {};
  if (enrollments) {
    enrollments.forEach(e => {
      enrollmentsMap[e.course_id] = { progress: e.progress, status: e.status };
    });
  }

  const certificatesMap: Record<string, string> = {};
  if (certificatesData) {
    certificatesData.forEach(c => {
      certificatesMap[c.course_id] = c.id;
    });
  }

  return (
    <div className="courses-page">
      <div className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 className="text-gradient">Course Catalog</h1>
        <p className="text-secondary">Discover new skills and level up your career.</p>
      </div>

      <CourseCatalog 
        courses={courses || []} 
        enrollments={enrollmentsMap} 
        certificatesMap={certificatesMap}
      />
    </div>
  );
}
