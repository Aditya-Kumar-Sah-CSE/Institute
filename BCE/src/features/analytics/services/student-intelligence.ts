import { createClient } from '@/lib/supabase/server';
import type { RecommendationItem } from './recommendation-engine';

const SIGNAL_THRESHOLDS = {
  strongQuizAccuracy: 80,
  weakQuizAccuracy: 70,
  highCourseProgress: 80,
  lowCourseProgress: 80,
  lowCodingAcceptance: 50,
} as const;

export type MetricStatus = 'measured' | 'no_data' | 'unavailable';

export interface StudentMetric {
  value: number | null;
  status: MetricStatus;
  unit: 'percent' | 'count' | 'cgpa';
  label: string;
  detail: string;
}

export interface StudentInsight {
  id: string;
  label: string;
  reason: string;
  evidence: string;
  severity?: number;
}

export interface Student360Profile {
  userId: string;
  readiness: StudentMetric;
  dimensions: {
    academic: StudentMetric;
    skills: StudentMetric;
    coding: StudentMetric;
    assessment: StudentMetric;
  };
  capabilityGaps: Array<{
    id: 'dsa' | 'course_completion';
    label: string;
    current: StudentMetric;
    target: number | null;
    gap: number | null;
    status: 'measured' | 'no_data' | 'no_target' | 'unavailable';
  }>;
  strengths: StudentInsight[];
  improvementAreas: StudentInsight[];
  hasSufficientData: boolean;
  courseProgressPercent: number | null;
  quizAccuracyPercent: number | null;
  codingAcceptancePercent: number | null;
  dataCoverage: {
    coursesCount: number;
    completedCoursesCount: number;
    assessmentsCount: number;
    dsaSolvedCount: number;
    codingSubmissionsCount: number;
    certificatesCount: number;
    badgesCount: number;
    routinesCount: number;
    activeGoalsCount: number;
    routinesCompletedToday: number;
  };
  dataAvailability: {
    profile: boolean;
    courses: boolean;
    assessments: boolean;
    coding: boolean;
    certificates: boolean;
    badges: boolean;
    routines: boolean;
    goals: boolean;
  };
  lastUpdatedAt: string;
  dailyRoutines: Array<{ id?: string; time_slot: string; task_name: string; sort_order: number }>;
  personalizedPlan: Array<{ id: string; title: string; detail: string; actionUrl: string; actionText: string }>;
  activeGoals: Array<{ id: string; goal_text: string; duration_mins: number; routine: boolean; status: string }>;
  enrolledCoursesData: Array<{ id: string; title: string; progress: number }>;
  highestProgressCourse: { id: string; title: string; progress: number } | null;
  lowestProgressCourse: { id: string; title: string; progress: number } | null;
  nextBestAction: RecommendationItem | null;
}

const metric = (
  label: string,
  unit: StudentMetric['unit'],
  value: number | null,
  status: MetricStatus,
  detail: string,
): StudentMetric => ({ value, status, unit, label, detail });

export async function getStudent360Profile(studentId: string): Promise<Student360Profile> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== studentId) {
    throw new Error('Student analytics can only be loaded for the authenticated student.');
  }

  const todayDate = new Date().toISOString().slice(0, 10);
  const todayStart = `${todayDate}T00:00:00.000Z`;
  const [
    { data: profile, error: profileError },
    { data: enrollments, error: coursesError },
    { data: attempts, error: attemptsError },
    { count: acceptedSubmissionCount, error: acceptedError },
    { count: codingSubmissionCount, error: submissionsError },
    { count: certificateCount, error: certificatesError },
    { count: badgeCount, error: badgesError },
    { data: routinesData, error: routinesError },
    { data: goals, error: goalsError },
    { data: completedRoutineTasks, error: routineCompletionsError },
    { data: completedGoalSessions, error: completedGoalSessionsError },
  ] = await Promise.all([
    supabase.from('profiles').select('cgpa, skills, streak_days').eq('id', user.id).maybeSingle(),
    supabase.from('enrollments').select('course_id, progress, completed_at, status, courses(title)').eq('user_id', user.id).eq('status', 'approved'),
    supabase.from('course_mcq_attempts').select('score, total').eq('user_id', user.id),
    supabase.from('coding_submissions').select('id', { count: 'exact', head: true }).eq('student_id', user.id).eq('status', 'ACCEPTED'),
    supabase.from('coding_submissions').select('id', { count: 'exact', head: true }).eq('student_id', user.id),
    supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('user_badges').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('daily_routines').select('id, time_slot, task_name, sort_order').eq('user_id', user.id).order('sort_order', { ascending: true }),
    supabase.from('student_goals').select('id, goal_text, duration_mins, routine, status').eq('user_id', user.id).eq('status', 'active'),
    supabase.from('daily_routine_completions').select('task_id').eq('user_id', user.id).eq('completed_date', todayDate),
    supabase.from('goal_sessions').select('goal_id').eq('user_id', user.id).eq('status', 'completed').gte('started_at', todayStart),
  ]);

  const courseRows = enrollments || [];
  const courseProgressRows = courseRows.map(row => {
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
    const progress = row.completed_at
      ? 100
      : Math.max(0, Math.min(100, Math.round((Number(row.progress) || 0) * 100)));
    return { id: row.course_id, title: course?.title || 'Enrolled course', progress };
  });
  const totalQuizScore = (attempts || []).reduce((sum, attempt) => sum + (Number(attempt.score) || 0), 0);
  const totalQuizMaximum = (attempts || []).reduce((sum, attempt) => sum + (Number(attempt.total) || 0), 0);
  const quizAccuracyPercent = attemptsError || (attempts?.length || 0) === 0 || totalQuizMaximum <= 0
    ? null
    : Math.round((totalQuizScore / totalQuizMaximum) * 100);
  const courseProgressPercent = courseRows.length > 0 && !coursesError
    ? Math.round(courseProgressRows.reduce((sum, course) => sum + course.progress, 0) / courseProgressRows.length)
    : null;
  const totalSubmissions = codingSubmissionCount || 0;
  const acceptedSubmissions = acceptedSubmissionCount || 0;
  const codingAcceptancePercent = totalSubmissions > 0 && !acceptedError && !submissionsError
    ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
    : null;
  const coursesAvailable = !coursesError;
  const assessmentsAvailable = !attemptsError;
  const codingAvailable = !acceptedError && !submissionsError;
  const routines = routinesError ? [] : (routinesData || []);
  const activeGoals = goalsError ? [] : (goals || []);
  const completedRoutineIds = new Set((routineCompletionsError ? [] : completedRoutineTasks || []).map(item => item.task_id));
  const completedGoalIds = new Set((completedGoalSessionsError ? [] : completedGoalSessions || []).map(session => session.goal_id));
  const dailyRoutines = routines;
  const skills = Array.isArray(profile?.skills) ? profile.skills.filter((skill): skill is string => typeof skill === 'string' && skill.trim().length > 0) : [];

  const strengths: StudentInsight[] = [];
  const improvementAreas: StudentInsight[] = [];
  if (badgeCount) {
    strengths.push({ id: 'earned-badges', label: `${badgeCount} achievement badge${badgeCount === 1 ? '' : 's'}`, reason: 'Badges have been awarded on this account.', evidence: `${badgeCount} rows in user_badges.` });
  }
  if (quizAccuracyPercent !== null && quizAccuracyPercent >= SIGNAL_THRESHOLDS.strongQuizAccuracy) {
    strengths.push({ id: 'quiz-accuracy', label: 'Strong quiz accuracy', reason: `Recorded course MCQ accuracy is at least ${SIGNAL_THRESHOLDS.strongQuizAccuracy}%.`, evidence: `${totalQuizScore}/${totalQuizMaximum} marks across ${attempts?.length || 0} attempts.` });
  } else if (quizAccuracyPercent !== null && quizAccuracyPercent < SIGNAL_THRESHOLDS.weakQuizAccuracy) {
    improvementAreas.push({ id: 'assessment-performance', label: 'Assessment performance', reason: `Recorded course MCQ accuracy is below ${SIGNAL_THRESHOLDS.weakQuizAccuracy}%.`, evidence: `${totalQuizScore}/${totalQuizMaximum} marks across ${attempts?.length || 0} attempts.`, severity: SIGNAL_THRESHOLDS.weakQuizAccuracy - quizAccuracyPercent });
  }
  if (courseProgressPercent !== null && courseProgressPercent >= SIGNAL_THRESHOLDS.highCourseProgress) {
    strengths.push({ id: 'course-progress', label: 'High course progress', reason: `Average progress across approved enrollments is at least ${SIGNAL_THRESHOLDS.highCourseProgress}%.`, evidence: `${courseProgressPercent}% average across ${courseRows.length} courses.` });
  } else if (courseProgressPercent !== null && courseProgressPercent < SIGNAL_THRESHOLDS.lowCourseProgress) {
    improvementAreas.push({ id: 'course-progress', label: 'Continue enrolled courses', reason: `Average progress across approved enrollments is below ${SIGNAL_THRESHOLDS.lowCourseProgress}%.`, evidence: `${courseProgressPercent}% average across ${courseRows.length} courses.`, severity: SIGNAL_THRESHOLDS.lowCourseProgress - courseProgressPercent });
  }
  if (codingAcceptancePercent !== null && codingAcceptancePercent < SIGNAL_THRESHOLDS.lowCodingAcceptance) {
    improvementAreas.push({ id: 'coding-acceptance', label: 'Coding submission performance', reason: `Code Arena acceptance is below ${SIGNAL_THRESHOLDS.lowCodingAcceptance}%.`, evidence: `${acceptedSubmissions} accepted out of ${totalSubmissions} submissions.`, severity: SIGNAL_THRESHOLDS.lowCodingAcceptance - codingAcceptancePercent });
  }
  improvementAreas.sort((a, b) => (b.severity || 0) - (a.severity || 0));
  if (profile?.streak_days && profile.streak_days > 0) {
    strengths.push({ id: 'learning-streak', label: 'Active learning streak', reason: 'The profile records a current activity streak.', evidence: `${profile.streak_days} consecutive days recorded on the profile.` });
  }
  const completedRoutinesToday = dailyRoutines.filter(routine => completedRoutineIds.has(routine.id || routine.time_slot)).length;
  if (completedRoutinesToday > 0) {
    strengths.push({ id: 'routine-completed-today', label: 'Routine activity recorded today', reason: 'At least one scheduled routine has a completion record for today.', evidence: `${completedRoutinesToday} of ${dailyRoutines.length} routine tasks completed today.` });
  }

  const lowestProgressCourse = [...courseProgressRows].sort((a, b) => a.progress - b.progress)[0] || null;
  const highestProgressCourse = [...courseProgressRows].sort((a, b) => b.progress - a.progress)[0] || null;
  const nextBestAction: RecommendationItem | null = lowestProgressCourse && lowestProgressCourse.progress < 100
    ? {
        id: `continue-${lowestProgressCourse.id}`,
        type: 'CONTINUE_COURSE',
        title: `Continue ${lowestProgressCourse.title}`,
        description: `This is the least-progressed approved course in your enrollments (${lowestProgressCourse.progress}%).`,
        evidenceWhy: `Recorded enrollment progress: ${lowestProgressCourse.progress}%.`,
        actionUrl: `/courses/${lowestProgressCourse.id}`,
        actionText: 'Open Course',
      }
    : courseRows.length > 0 && assessmentsAvailable && (attempts?.length || 0) === 0
      ? {
          id: 'try-course-assessment',
          type: 'TAKE_ASSESSMENT',
          title: 'Try a course assessment',
          description: 'There are no course MCQ attempts recorded yet.',
          evidenceWhy: 'No rows were found in course_mcq_attempts for this account.',
          actionUrl: '/courses',
          actionText: 'View Courses',
        }
      : null;
  const personalizedPlan = [
    ...(!routinesError && !routineCompletionsError ? dailyRoutines
      .filter(routine => !completedRoutineIds.has(routine.id || routine.time_slot))
      .map((routine, index) => ({
        id: `routine-${routine.time_slot}-${index}`,
        title: routine.task_name,
        detail: `Scheduled routine at ${routine.time_slot}.`,
        actionUrl: '/goals',
        actionText: 'Open routine',
      })) : []),
    ...(!goalsError && !completedGoalSessionsError ? activeGoals
      .filter(goal => !completedGoalIds.has(goal.id))
      .map(goal => ({
        id: `goal-${goal.id}`,
        title: goal.goal_text,
        detail: `${goal.duration_mins} minute active goal${goal.routine ? ' · routine' : ''}.`,
        actionUrl: '/goals',
        actionText: 'Open goal',
      })) : []),
    ...(nextBestAction ? [{
      id: nextBestAction.id,
      title: nextBestAction.title,
      detail: nextBestAction.evidenceWhy,
      actionUrl: nextBestAction.actionUrl,
      actionText: nextBestAction.actionText,
    }] : []),
  ];

  const coverage = {
    coursesCount: coursesAvailable ? courseRows.length : 0,
    completedCoursesCount: coursesAvailable ? courseProgressRows.filter(course => course.progress >= 100).length : 0,
    assessmentsCount: assessmentsAvailable ? attempts?.length || 0 : 0,
    dsaSolvedCount: codingAvailable ? acceptedSubmissions : 0,
    codingSubmissionsCount: codingAvailable ? totalSubmissions : 0,
    certificatesCount: certificatesError ? 0 : certificateCount || 0,
    badgesCount: badgesError ? 0 : badgeCount || 0,
    routinesCount: routines.length,
    activeGoalsCount: activeGoals.length,
    routinesCompletedToday: completedRoutinesToday,
  };
  const dataAvailability = {
    profile: !profileError && !!profile,
    courses: coursesAvailable,
    assessments: assessmentsAvailable,
    coding: codingAvailable,
    certificates: !certificatesError,
    badges: !badgesError,
    routines: !routinesError && !routineCompletionsError,
    goals: !goalsError,
  };
  const skillsMetric = metric('Skills mastery', 'percent', null, 'no_data', skills.length > 0
    ? `${skills.length} self-reported skill names exist, but no mastery/progress values are stored.`
    : 'No skill records are available.');
  const academicMetric = metric('Academic', 'cgpa', profile?.cgpa == null ? null : Number(profile.cgpa),
    profile?.cgpa == null ? (profileError ? 'unavailable' : 'no_data') : 'measured',
    profile?.cgpa == null ? 'No CGPA value is stored on the student profile.' : 'Stored profile CGPA; displayed on its original scale.');
  const assessmentMetric = metric('Assessment', 'percent', quizAccuracyPercent,
    attemptsError ? 'unavailable' : quizAccuracyPercent === null ? 'no_data' : 'measured',
    attemptsError ? 'Assessment records could not be loaded.' : quizAccuracyPercent === null ? 'No scored course MCQ attempts are recorded.' : `${totalQuizScore}/${totalQuizMaximum} marks across ${attempts?.length || 0} attempts.`);
  const codingMetric = metric('Coding acceptance', 'percent', codingAcceptancePercent,
    codingAvailable ? codingAcceptancePercent === null ? 'no_data' : 'measured' : 'unavailable',
    !codingAvailable ? 'Code Arena submissions could not be loaded.' : codingAcceptancePercent === null ? 'No Code Arena submissions are recorded.' : `${acceptedSubmissions} accepted of ${totalSubmissions} total submissions.`);
  const courseMetric = metric('Average course completion', 'percent', courseProgressPercent,
    coursesAvailable ? courseProgressPercent === null ? 'no_data' : 'measured' : 'unavailable',
    coursesAvailable ? `${courseRows.length} approved enrollment${courseRows.length === 1 ? '' : 's'}; using stored enrollment progress.` : 'Course enrollment records could not be loaded.');
  const readinessMetric = metric('Learning readiness', 'percent', null, 'no_data',
    'No validated readiness rubric exists in Smart Learn; incomparable academic, skill, coding and assessment signals are not combined.');

  return {
    userId: user.id,
    readiness: readinessMetric,
    dimensions: {
      academic: academicMetric,
      skills: skillsMetric,
      coding: codingMetric,
      assessment: assessmentMetric,
    },
    capabilityGaps: [
      { id: 'dsa', label: 'DSA & Algorithms', current: metric('DSA solved', 'count', codingAvailable && totalSubmissions > 0 ? coverage.dsaSolvedCount : null, !codingAvailable ? 'unavailable' : totalSubmissions === 0 ? 'no_data' : 'measured', 'Accepted Code Arena submissions, matching the BCE profile count.'), target: null, gap: null, status: !codingAvailable ? 'unavailable' : totalSubmissions === 0 ? 'no_data' : 'no_target' },
      { id: 'course_completion', label: 'Course Completion', current: courseMetric, target: null, gap: null, status: !coursesAvailable ? 'unavailable' : courseProgressPercent === null ? 'no_data' : 'no_target' },
    ],
    strengths,
    improvementAreas,
    hasSufficientData: (coursesAvailable && coverage.coursesCount > 0)
      || (assessmentsAvailable && coverage.assessmentsCount > 0)
      || (codingAvailable && coverage.codingSubmissionsCount > 0)
      || (!badgesError && coverage.badgesCount > 0),
    courseProgressPercent,
    quizAccuracyPercent,
    codingAcceptancePercent,
    dataCoverage: coverage,
    dataAvailability,
    lastUpdatedAt: new Date().toISOString(),
    dailyRoutines,
    personalizedPlan,
    activeGoals,
    enrolledCoursesData: coursesAvailable ? courseProgressRows : [],
    highestProgressCourse: coursesAvailable ? highestProgressCourse : null,
    lowestProgressCourse: coursesAvailable ? lowestProgressCourse : null,
    nextBestAction,
  };
}
