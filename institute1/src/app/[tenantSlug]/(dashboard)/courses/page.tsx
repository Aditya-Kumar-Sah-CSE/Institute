import { createClient } from '@/lib/supabase/server';
import CourseCatalog from '@/features/courses/components/CourseCatalog';

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { getTenantConfig } = await import('@/lib/tenant/tenantResolver');
  const { tenant } = await getTenantConfig();

  let coursesQuery = supabase
    .from('courses')
    .select('*, profiles(name)')
    .order('created_at', { ascending: false });

  if (tenant) {
    coursesQuery = coursesQuery.eq('institution_id', tenant.id);
  }

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

  const courses = coursesRes.data;
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
