import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  generateStudentAwareRecommendations,
  RecommendationItem,
  RecommendedCourseItem,
  PersonalizedPlan,
  SkillGapItem
} from './recommendation-engine';

export interface Student360Profile {
  userId: string;
  hasSufficientData: boolean;
  
  // High-level Scores (0-100)
  overallLearningScore: number;
  academicScore: number;
  skillScore: number;
  codingScore: number;
  learningScore: number;
  assessmentScore: number;

  // Metadata & Confidence
  confidenceLevel: 'High' | 'Medium' | 'Low' | 'Insufficient';
  dataCoverage: {
    assessmentsCount: number;
    coursesCount: number;
    dsaSolvedCount: number;
    certificatesCount: number;
    badgesCount: number;
    routinesCount: number;
    activeGoalsCount: number;
  };
  lastUpdatedAt: string;

  // Routine & Goals Data
  dailyRoutines: Array<{ time_slot: string; task_name: string; sort_order: number }>;
  activeGoals: Array<{ id: string; goal_text: string; duration_mins: number; routine: boolean; status: string }>;
  enrolledCoursesData: Array<{ id: string; title: string; progress: number }>;

  // Insights & Student-Aware Recommendations
  strengths: string[];
  weakAreas: string[];
  skillGaps: SkillGapItem[];
  nextBestAction: RecommendationItem | null;
  recommendedCourse: RecommendedCourseItem | null;
  recommendedCourses?: RecommendedCourseItem[];
  personalizedPlan: PersonalizedPlan;
  recommendations: RecommendationItem[];
}

export async function getStudent360Profile(userId: string): Promise<Student360Profile> {
  const adminClient = await createAdminClient();

  // 1. Parallel Server-side Fetch of Student's Real Data
  const [
    { data: profile },
    { data: enrollments },
    { data: mcqAttempts },
    { data: dsaEnrollments },
    { data: certificates },
    { data: badges },
    { data: availableCourses },
    { data: availableSheets },
    { data: dailyRoutines },
    { data: studentGoals }
  ] = await Promise.all([
    adminClient.from('profiles').select('*').eq('id', userId).single(),
    adminClient.from('enrollments').select('*, courses(*)').eq('user_id', userId),
    adminClient.from('course_mcq_attempts').select('*').eq('user_id', userId).order('submitted_at', { ascending: false }),
    adminClient.from('coding_sheet_enrollments').select('*').eq('student_id', userId),
    adminClient.from('certificates').select('id, course_id').eq('user_id', userId),
    adminClient.from('user_badges').select('id').eq('user_id', userId),
    adminClient.from('courses').select('id, title, description, tags, difficulty, total_xp').eq('is_published', true).eq('is_deleted', false),
    adminClient.from('coding_sheets').select('id, title, description').eq('is_public', true),
    adminClient.from('daily_routines').select('time_slot, task_name, sort_order').eq('user_id', userId).order('sort_order', { ascending: true }),
    adminClient.from('student_goals').select('id, goal_text, duration_mins, routine, status, goal_type').eq('user_id', userId).eq('status', 'active')
  ]);

  // 2. Data Counts & Data Coverage Calculation
  const assessmentsCount = mcqAttempts?.length || 0;
  const coursesCount = enrollments?.length || 0;
  
  // Calculate DSA Problem solving details
  let dsaSolvedCount = 0;
  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;

  if (dsaEnrollments && dsaEnrollments.length > 0) {
    dsaEnrollments.forEach((e: any) => {
      const solvedIds = e.solved_problem_ids || [];
      dsaSolvedCount += solvedIds.length;
    });
  }

  const certificatesCount = certificates?.length || 0;
  const badgesCount = badges?.length || 0;

  const totalActivityPoints = assessmentsCount + coursesCount + (dsaSolvedCount > 0 ? 1 : 0);
  const hasSufficientData = totalActivityPoints > 0 || Boolean(profile?.cgpa || profile?.skills?.length);

  // Confidence Level Determination
  let confidenceLevel: 'High' | 'Medium' | 'Low' | 'Insufficient' = 'Insufficient';
  if (assessmentsCount >= 5 && coursesCount >= 2 && dsaSolvedCount >= 10) {
    confidenceLevel = 'High';
  } else if (assessmentsCount >= 2 || coursesCount >= 1 || dsaSolvedCount >= 3) {
    confidenceLevel = 'Medium';
  } else if (hasSufficientData) {
    confidenceLevel = 'Low';
  }

  // 3. Score Calculations (Real Dynamic Values)
  
  // A. Academic Score
  let academicScore = 60;
  if (profile?.cgpa && profile.cgpa > 0) {
    academicScore = Math.min(100, Math.round((profile.cgpa / 10) * 100));
  } else if (coursesCount > 0 && enrollments) {
    const completedCount = (enrollments || []).filter((e: any) => e.progress >= 1.0 || e.status === 'completed').length;
    academicScore = Math.min(100, Math.round(50 + (completedCount / coursesCount) * 50));
  }

  // B. Assessment Score (MCQ Accuracy)
  let assessmentScore = 0;
  let mcqAvgScorePercent = 0;
  if (assessmentsCount > 0 && mcqAttempts) {
    let totalScoreObtained = 0;
    let totalMaxScore = 0;
    (mcqAttempts || []).forEach((att: any) => {
      totalScoreObtained += att.score || 0;
      totalMaxScore += att.total || 1;
    });
    mcqAvgScorePercent = Math.min(100, Math.round((totalScoreObtained / Math.max(totalMaxScore, 1)) * 100));
    assessmentScore = mcqAvgScorePercent;
  }

  // C. Course Engagement & Learning Score
  let learningScore = 0;
  if (coursesCount > 0 && enrollments) {
    const totalProgress = (enrollments || []).reduce((sum: number, e: any) => sum + (e.progress || 0), 0);
    learningScore = Math.min(100, Math.round((totalProgress / coursesCount) * 100));
  }

  // D. Coding & DSA Score
  let codingScore = 0;
  if (dsaSolvedCount > 0) {
    codingScore = Math.min(100, Math.round((dsaSolvedCount / 30) * 100));
  } else if (profile?.xp && profile.xp > 0) {
    codingScore = Math.min(100, Math.round((profile.xp / 1000) * 100));
  }

  // E. Skill Score
  const skillsList = profile?.skills || [];
  const externalCertsList = profile?.external_certificates || [];
  let skillScore = Math.min(100, (skillsList.length * 15) + (externalCertsList.length * 20) + (certificatesCount * 25) + (badgesCount * 10));
  if (skillsList.length > 0 && skillScore === 0) {
    skillScore = 60;
  }

  // Overall Learning Readiness Composite Score
  let overallLearningScore = Math.round(
    (academicScore * 0.25) +
    (skillScore * 0.20) +
    (codingScore * 0.25) +
    (learningScore * 0.15) +
    (assessmentScore * 0.15)
  );
  if (overallLearningScore === 0 && coursesCount > 0) {
    overallLearningScore = 35; // Initial baseline indicator for newly enrolled student
  }

  // 4. Strengths & Weak Areas Analysis (Dynamically computed from actual DB records)
  const strengths: string[] = [];
  const weakAreas: string[] = [];
  const skillGaps: SkillGapItem[] = [];

  if (skillsList.length > 0) {
    skillsList.slice(0, 3).forEach((sk: string) => strengths.push(sk));
  }
  if (profile?.streak && profile.streak > 0) {
    strengths.push(`${profile.streak} Day Learning Streak`);
  }
  if (mcqAvgScorePercent >= 75) {
    strengths.push(`Quiz Accuracy (${Math.round(mcqAvgScorePercent)}%)`);
  }
  if (studentGoals && studentGoals.length > 0) {
    strengths.push('Goal Focused');
  }
  if (dailyRoutines && dailyRoutines.length > 0) {
    strengths.push('Daily Routine Active');
  }
  if (badgesCount > 0) {
    strengths.push(`Achievement Badges (${badgesCount})`);
  }
  if (strengths.length === 0) {
    if (coursesCount > 0) strengths.push('Enrolled Learner');
    else strengths.push('Account Active');
  }

  // DSA Capability Gap
  if (dsaSolvedCount >= 15) {
    strengths.push('Data Structures & Algorithms');
  } else {
    weakAreas.push('DSA Problem Solving');
    const currentDsaCap = Math.min(90, Math.round((dsaSolvedCount / 20) * 100));
    const targetDsaCap = 80;
    skillGaps.push({
      topic: 'DSA & Algorithms',
      currentCapability: currentDsaCap,
      targetCapability: targetDsaCap,
      gap: targetDsaCap - currentDsaCap,
      evidence: `Based on your DSA activity (${dsaSolvedCount} problems solved).`
    });
  }

  // Course Completion Progress Gap
  if (learningScore < 90) {
    weakAreas.push('Course Completion Progress');
    const targetCourseCap = 90;
    skillGaps.push({
      topic: 'Course Completion',
      currentCapability: learningScore,
      targetCapability: targetCourseCap,
      gap: targetCourseCap - learningScore,
      evidence: `Based on your average course progress of ${learningScore}% across ${coursesCount > 0 ? coursesCount : 2} enrolled courses.`
    });
  }

  // Assessment Accuracy Gap
  if (assessmentsCount > 0 && mcqAvgScorePercent < 75) {
    weakAreas.push('Assessment Concept Retention');
    skillGaps.push({
      topic: 'Assessment Accuracy',
      currentCapability: mcqAvgScorePercent,
      targetCapability: 85,
      gap: 85 - mcqAvgScorePercent,
      evidence: `Based on your average quiz score of ${mcqAvgScorePercent}% across ${assessmentsCount} attempts.`
    });
  }

  // 5. Enrolled Courses Data Mapping
  const enrolledCoursesList = (enrollments || []).map((e: any) => ({
    id: e.course_id,
    title: e.courses?.title || 'Enrolled Course',
    progress: Math.round((e.progress || 0) * 100),
    description: e.courses?.description,
    category: e.courses?.difficulty
  }));

  const completedCourseIds = certificates?.map((c: any) => c.course_id) || [];
  const activeGoalItem = studentGoals && studentGoals.length > 0 ? studentGoals[0] : null;

  // 6. Run Student-Aware Recommendation Decision Engine
  const { recommendations, nextBestAction, recommendedCourse, recommendedCourses, personalizedPlan } = 
    generateStudentAwareRecommendations({
      userId,
      enrolledCourses: enrolledCoursesList,
      completedCourseIds,
      availableCourses: availableCourses || [],
      availableSheets: availableSheets || [],
      skillGaps,
      weakAreas,
      strongAreas: strengths,
      mcqAvgScore: mcqAvgScorePercent,
      mcqTotalAttempts: assessmentsCount,
      dsaSolvedCount,
      dsaDifficultyStats: { easy: easySolved, medium: mediumSolved, hard: hardSolved },
      activeGoal: activeGoalItem,
      streakCount: profile?.streak || 0
    });

  return {
    userId,
    hasSufficientData,
    overallLearningScore,
    academicScore,
    skillScore,
    codingScore,
    learningScore,
    assessmentScore,
    confidenceLevel,
    dataCoverage: {
      assessmentsCount,
      coursesCount,
      dsaSolvedCount,
      certificatesCount,
      badgesCount,
      routinesCount: dailyRoutines?.length || 0,
      activeGoalsCount: studentGoals?.length || 0
    },
    lastUpdatedAt: new Date().toISOString(),
    dailyRoutines: (dailyRoutines || []).map((r: any) => ({
      time_slot: r.time_slot,
      task_name: r.task_name,
      sort_order: r.sort_order
    })),
    activeGoals: (studentGoals || []).map((g: any) => ({
      id: g.id,
      goal_text: g.goal_text,
      duration_mins: g.duration_mins,
      routine: Boolean(g.routine),
      status: g.status
    })),
    enrolledCoursesData: enrolledCoursesList.map(c => ({
      id: c.id,
      title: c.title,
      progress: c.progress
    })),
    strengths,
    weakAreas,
    skillGaps,
    nextBestAction,
    recommendedCourse,
    recommendedCourses: recommendedCourses || (recommendedCourse ? [recommendedCourse] : []),
    personalizedPlan,
    recommendations
  };
}
