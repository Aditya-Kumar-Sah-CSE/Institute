import { createClient } from '@/lib/supabase/server';
import CourseCatalog from '@/features/courses/components/CourseCatalog';
import { getBatchCourseRatingStats } from '@/features/courses/actions/reviews';
import { queryCourseCards } from '@/features/courses/lib/courseQueries';

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [enrollmentsRes, certificatesRes] = await Promise.all([
    user
      ? supabase
          .from('enrollments')
          .select('course_id, progress, status')
          .eq('user_id', user.id)
      : Promise.resolve({ data: [] as { course_id: string; progress: number; status: string }[] }),
    user
      ? supabase
          .from('certificates')
          .select('id, course_id')
          .eq('user_id', user.id)
      : Promise.resolve({ data: [] as { id: string; course_id: string }[] }),
  ]);

  const enrollments = enrollmentsRes.data || [];
  const certificatesData = certificatesRes.data || [];

  const enrollmentsMap: Record<string, { progress: number; status: string }> = {};
  const enrolledCourseIds: string[] = [];
  enrollments.forEach((e) => {
    enrollmentsMap[e.course_id] = { progress: e.progress, status: e.status };
    if (e.course_id) enrolledCourseIds.push(e.course_id);
  });

  const certificatesMap: Record<string, string> = {};
  certificatesData.forEach((c) => {
    certificatesMap[c.course_id] = c.id;
  });

  // Initial load fetches only the user's enrolled course cards; un-enrolled courses lazy-load on tab switch.
  const [{ courses: enrolledCourses }, ratingStatsMap] = await Promise.all([
    queryCourseCards(supabase, { courseIds: enrolledCourseIds }),
    enrolledCourseIds.length > 0
      ? getBatchCourseRatingStats(enrolledCourseIds)
      : Promise.resolve({}),
  ]);

  return (
    <div className="courses-page">
      <div className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 className="text-gradient">Course Catalog</h1>
        <p className="text-secondary">Discover new skills and level up your career.</p>
      </div>

      <CourseCatalog
        courses={enrolledCourses}
        enrollments={enrollmentsMap}
        certificatesMap={certificatesMap}
        ratingStatsMap={ratingStatsMap}
      />
    </div>
  );
}
