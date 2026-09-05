import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  generateDeterministicRecommendations,
  RecommendationItem,
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
  enrolledCoursesData: Array<{ title: string; progress: number }>;

  // Insights
  strengths: string[];
  weakAreas: string[];
  skillGaps: SkillGapItem[];
  nextBestAction: {
    title: string;
    subtitle: string;
    description: string;
    evidenceWhy: string;
    actionUrl: string;
    actionText: string;
  } | null;
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
    adminClient.from('student_goals').select('id, goal_text, duration_mins, routine, status').eq('user_id', userId).eq('status', 'active')
  ]);

  // 2. Data Counts & Data Coverage Calculation
  const assessmentsCount = mcqAttempts?.length || 0;
  const coursesCount = enrollments?.length || 0;
  const dsaSolvedCount = dsaEnrollments?.reduce((sum: number, e: any) => sum + (e.solved_problem_ids?.length || 0), 0) || 0;
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
  
  // A. Academic Score (from CGPA if present, else course completion rate)
  let academicScore = 70;
  if (profile?.cgpa && profile.cgpa > 0) {
    academicScore = Math.min(100, Math.round((profile.cgpa / 10) * 100));
  } else if (coursesCount > 0 && enrollments) {
    const completedCount = (enrollments || []).filter((e: any) => e.progress >= 1.0 || e.status === 'completed').length;
    academicScore = Math.min(100, Math.round(60 + (completedCount / coursesCount) * 40));
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
    codingScore = Math.min(100, Math.round((dsaSolvedCount / 40) * 100));
  } else if (profile?.xp && profile.xp > 100) {
    codingScore = Math.min(100, Math.round((profile.xp / 1000) * 100));
  }

  // E. Skill Score (from profile skills, external certs, badges)
  const skillsList = profile?.skills || [];
  const externalCertsList = profile?.external_certificates || [];
  let skillScore = Math.min(100, (skillsList.length * 10) + (externalCertsList.length * 15) + (certificatesCount * 20) + (badgesCount * 5));
  if (skillScore === 0 && (coursesCount > 0 || dsaSolvedCount > 0)) {
    skillScore = Math.min(100, 50 + (coursesCount * 10));
  }

  // Overall Learning Readiness Composite Score
  let overallLearningScore = 50;
  if (hasSufficientData) {
    overallLearningScore = Math.round(
      (academicScore * 0.20) +
      (skillScore * 0.20) +
      (codingScore * 0.25) +
      (learningScore * 0.15) +
      (assessmentScore * 0.20)
    );
  }

  // 4. Strengths & Weak Areas Analysis
  const strengths: string[] = [];
  const weakAreas: string[] = [];
  const skillGaps: SkillGapItem[] = [];

  // Evaluate Skills & Strengths
  if (skillsList.length > 0) {
    skillsList.slice(0, 3).forEach((sk: string) => strengths.push(sk));
  }

  if (dsaSolvedCount >= 10) {
    strengths.push('Data Structures & Algorithms');
  } else {
    weakAreas.push('DSA Problem Solving');
    skillGaps.push({
      topic: 'DSA & Algorithms',
      currentCapability: Math.min(90, dsaSolvedCount * 5),
      targetCapability: 80,
      gap: Math.max(10, 80 - (dsaSolvedCount * 5)),
      evidence: `Based on your DSA activity (${dsaSolvedCount} problems solved).`
    });
  }

  if (assessmentsCount > 0) {
    if (mcqAvgScorePercent >= 75) {
      strengths.push('Course Assessment Accuracy');
    } else {
      weakAreas.push('Assessment Concept Retention');
      skillGaps.push({
        topic: 'Assessment Accuracy',
        currentCapability: mcqAvgScorePercent,
        targetCapability: 85,
        gap: 85 - mcqAvgScorePercent,
        evidence: `Based on your average quiz score: ${mcqAvgScorePercent}% across ${assessmentsCount} attempts.`
      });
    }
  }

  if (coursesCount > 0 && learningScore < 60) {
    weakAreas.push('Course Completion Progress');
    skillGaps.push({
      topic: 'Course Completion',
      currentCapability: learningScore,
      targetCapability: 90,
      gap: 90 - learningScore,
      evidence: `Based on your average course progress of ${learningScore}% across ${coursesCount} enrolled courses.`
    });
  }

  if (strengths.length === 0) {
    strengths.push('Active Learner');
  }

  // 5. Deterministic Recommendations
  const enrolledCourseIds = enrollments?.map((e: any) => e.course_id) || [];
  const completedCourseIds = certificates?.map((c: any) => c.course_id) || [];

  const recommendations = generateDeterministicRecommendations({
    weakAreas,
    skillGaps,
    enrolledCourseIds,
    completedCourseIds,
    availableCourses: availableCourses || [],
    availableSheets: availableSheets || [],
    mcqAvgScore: mcqAvgScorePercent,
    mcqTotalAttempts: assessmentsCount,
    dsaSolvedCount
  });

  // 6. Next Best Action (Highest Priority Recommendation)
  let nextBestAction: Student360Profile['nextBestAction'] = null;
  if (recommendations.length > 0) {
    const topRec = recommendations[0];
    nextBestAction = {
      title: topRec.title,
      subtitle: topRec.subtitle || 'Top Priority Next Action',
      description: topRec.description,
      evidenceWhy: topRec.evidenceWhy,
      actionUrl: topRec.actionUrl,
      actionText: topRec.actionText
    };
  }

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
    enrolledCoursesData: (enrollments || []).map((e: any) => ({
      title: e.courses?.title || 'Enrolled Course',
      progress: Math.round((e.progress || 0) * 100)
    })),
    strengths,
    weakAreas,
    skillGaps,
    nextBestAction,
    recommendations
  };
}
