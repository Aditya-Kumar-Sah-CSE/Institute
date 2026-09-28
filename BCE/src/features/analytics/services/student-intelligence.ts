import { createAdminClient } from '@/lib/supabase/server';
import type { RecommendationItem } from './recommendation-engine';

export interface Student360Profile {
  userId: string;
  hasSufficientData: boolean;
  courseProgressPercent: number | null;
  quizAccuracyPercent: number | null;
  dataCoverage: {
    coursesCount: number;
    assessmentsCount: number;
    dsaSolvedCount: number;
    certificatesCount: number;
    badgesCount: number;
    routinesCount: number;
    activeGoalsCount: number;
  };
  dataAvailability: {
    courses: boolean;
    assessments: boolean;
    coding: boolean;
    certificates: boolean;
    badges: boolean;
  };
  lastUpdatedAt: string;
  dailyRoutines: Array<{ time_slot: string; task_name: string; sort_order: number }>;
  activeGoals: Array<{ id: string; goal_text: string; duration_mins: number; routine: boolean; status: string }>;
  enrolledCoursesData: Array<{ id: string; title: string; progress: number }>;
  nextBestAction: RecommendationItem | null;
}

export async function getStudent360Profile(userId: string): Promise<Student360Profile> {
  const supabase = await createAdminClient();
  const [
    { data: enrollments, error: coursesError },
    { data: attempts, error: attemptsError },
    { data: sheetEnrollments, error: codingError },
    { data: certificates, error: certificatesError },
    { data: badges, error: badgesError },
    { data: routines },
    { data: goals },
  ] = await Promise.all([
    supabase.from('enrollments').select('course_id, progress, status, courses(title)').eq('user_id', userId).eq('status', 'approved'),
    supabase.from('course_mcq_attempts').select('score, total').eq('user_id', userId),
    supabase.from('coding_sheet_enrollments').select('solved_problem_ids').eq('student_id', userId),
    supabase.from('certificates').select('id').eq('user_id', userId),
    supabase.from('user_badges').select('id').eq('user_id', userId),
    supabase.from('daily_routines').select('time_slot, task_name, sort_order').eq('user_id', userId).order('sort_order', { ascending: true }),
    supabase.from('student_goals').select('id, goal_text, duration_mins, routine, status').eq('user_id', userId).eq('status', 'active'),
  ]);

  const courseRows = enrollments || [];
  const courseProgressRows = courseRows.map((row: any) => ({
    id: row.course_id,
    title: Array.isArray(row.courses) ? row.courses[0]?.title || 'Enrolled course' : row.courses?.title || 'Enrolled course',
    progress: row.status === 'completed'
      ? 100
      : Math.max(0, Math.min(100, Math.round((Number(row.progress) || 0) * 100))),
  }));
  const totalQuizScore = (attempts || []).reduce((sum: number, attempt: any) => sum + (Number(attempt.score) || 0), 0);
  const totalQuizMaximum = (attempts || []).reduce((sum: number, attempt: any) => sum + (Number(attempt.total) || 0), 0);
  const quizAccuracyPercent = (attempts?.length || 0) > 0 && totalQuizMaximum > 0
    ? Math.round((totalQuizScore / totalQuizMaximum) * 100)
    : null;
  const uniqueSolvedIds = new Set<string>();
  (sheetEnrollments || []).forEach((row: any) => {
    if (Array.isArray(row.solved_problem_ids)) {
      row.solved_problem_ids.forEach((id: unknown) => uniqueSolvedIds.add(String(id)));
    }
  });

  const coverage = {
    coursesCount: courseRows.length,
    assessmentsCount: attempts?.length || 0,
    dsaSolvedCount: uniqueSolvedIds.size,
    certificatesCount: certificates?.length || 0,
    badgesCount: badges?.length || 0,
    routinesCount: routines?.length || 0,
    activeGoalsCount: goals?.length || 0,
  };
  const dataAvailability = {
    courses: !coursesError,
    assessments: !attemptsError,
    coding: !codingError,
    certificates: !certificatesError,
    badges: !badgesError,
  };
  const hasSufficientData = (
    dataAvailability.courses && coverage.coursesCount > 0
  ) || (
    dataAvailability.assessments && coverage.assessmentsCount > 0
  ) || (
    dataAvailability.coding && coverage.dsaSolvedCount > 0
  ) || (
    dataAvailability.certificates && coverage.certificatesCount > 0
  ) || (
    dataAvailability.badges && coverage.badgesCount > 0
  );
  const courseProgressPercent = courseProgressRows.length > 0
    ? Math.round(courseProgressRows.reduce((sum, course) => sum + course.progress, 0) / courseProgressRows.length)
    : null;

  const inProgressCourse = courseProgressRows
    .filter(course => course.progress < 100)
    .sort((a, b) => a.progress - b.progress)[0];
  const nextBestAction: RecommendationItem | null = inProgressCourse
    ? {
        id: `continue-${inProgressCourse.id}`,
        type: 'CONTINUE_COURSE',
        title: `Continue ${inProgressCourse.title}`,
        description: `The enrollment record shows ${inProgressCourse.progress}% course progress.`,
        evidenceWhy: `Current recorded progress: ${inProgressCourse.progress}%.`,
        actionUrl: `/courses/${inProgressCourse.id}`,
        actionText: 'Open Course',
      }
    : coverage.coursesCount > 0 && coverage.assessmentsCount === 0 && dataAvailability.assessments
      ? {
          id: 'try-course-assessment',
          type: 'TAKE_ASSESSMENT',
          title: 'Try a course assessment',
          description: 'No course MCQ attempts are recorded yet.',
          evidenceWhy: 'The course MCQ attempt table has no records for this student.',
          actionUrl: '/courses',
          actionText: 'View Courses',
        }
      : null;

  return {
    userId,
    hasSufficientData,
    courseProgressPercent,
    quizAccuracyPercent,
    dataCoverage: coverage,
    dataAvailability,
    lastUpdatedAt: new Date().toISOString(),
    dailyRoutines: routines || [],
    activeGoals: goals || [],
    enrolledCoursesData: courseProgressRows,
    nextBestAction,
  };
}
