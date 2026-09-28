import { getCourseNotices } from '../actions/notices';
import CourseNoticesClient from './CourseNoticesClient';

export default async function CourseNoticesSection({ courseId, canPost }: { courseId: string; canPost: boolean }) {
  const { data, error } = await getCourseNotices(courseId);
  if (error) {
    console.error(`Error fetching course notices (${error.code || 'unknown'}): ${error.message}`);
    const migrationMissing = error.code === 'PGRST205' || error.code === '42P01';
    return (
      <section role="status" style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-divider)', color: 'var(--text-muted)' }}>
        {migrationMissing
          ? 'Course notices are not set up yet. Apply migrations 138_course_notices.sql and 139_course_notice_assigned_faculty.sql.'
          : 'Course notices could not be loaded. Please try again later.'}
      </section>
    );
  }
  return <CourseNoticesClient courseId={courseId} canPost={canPost} notices={data || []} />;
}
