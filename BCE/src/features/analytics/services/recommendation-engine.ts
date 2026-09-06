/* ============================================
   Student-Aware AI Recommendation Decision Engine
   ============================================ */

export type RecommendationType = 
  | 'CONTINUE_COURSE'
  | 'COMPLETE_PENDING'
  | 'PRACTICE_TOPIC'
  | 'REVISE_TOPIC'
  | 'TAKE_ASSESSMENT'
  | 'ENROLL_COURSE'
  | 'NEXT_COURSE'
  | 'DAILY_ACTION'
  | 'LEARNING_PLAN';

export interface RecommendationItem {
  id: string;
  type: RecommendationType;
  title: string;
  subtitle?: string;
  description: string;
  evidenceWhy: string;
  actionUrl: string;
  actionText: string;
  relevanceScore: number; // 0 - 100
  topic?: string;
  currentLevel?: number;
  targetLevel?: number;
}

export interface SkillGapItem {
  topic: string;
  currentCapability: number;
  targetCapability: number;
  gap: number;
  evidence: string;
}

export interface RecommendedCourseItem {
  id: string;
  title: string;
  description: string;
  matchScore: number;
  whyReason: string;
  actionUrl: string;
  difficulty?: string;
  tags?: string[];
}

export interface PersonalizedPlan {
  today: Array<{ title: string; detail: string; actionUrl: string }>;
  thisWeek: Array<{ title: string; detail: string }>;
  nextCourse: { title: string; reason: string; url: string; matchScore: number } | null;
}

export interface GenerateRecommendationsInput {
  userId: string;
  enrolledCourses: Array<{
    id: string;
    title: string;
    progress: number;
    description?: string;
    category?: string;
    lastAccessedAt?: string;
  }>;
  completedCourseIds: string[];
  availableCourses: Array<{
    id: string;
    title: string;
    description: string | null;
    tags?: string[];
    difficulty?: string;
    total_xp?: number;
  }>;
  availableSheets?: Array<{
    id: string;
    title: string;
    description: string | null;
  }>;
  skillGaps: SkillGapItem[];
  weakAreas: string[];
  strongAreas: string[];
  mcqAvgScore: number;
  mcqTotalAttempts: number;
  dsaSolvedCount: number;
  dsaDifficultyStats?: { easy: number; medium: number; hard: number };
  dsaWeakTopics?: string[];
  activeGoal?: { goal_type?: string; title?: string } | null;
  streakCount?: number;
  lastActiveDaysAgo?: number;
}

/**
 * Transparent Multi-Factor Recommendation Score Model:
 * score = (skillGap * 0.30) + (goalAlignment * 0.20) + (courseRelevance * 0.20) + 
 *         (recentActivity * 0.10) + (performanceNeed * 0.10) + (prerequisiteReadiness * 0.10)
 */
export function calculateRecommendationScore(params: {
  skillGapScore: number; // 0-100
  goalAlignmentScore: number; // 0-100
  courseRelevanceScore: number; // 0-100
  recentActivityScore: number; // 0-100
  performanceNeedScore: number; // 0-100
  prerequisiteReadinessScore: number; // 0-100
}): number {
  const {
    skillGapScore,
    goalAlignmentScore,
    courseRelevanceScore,
    recentActivityScore,
    performanceNeedScore,
    prerequisiteReadinessScore
  } = params;

  const score = 
    (skillGapScore * 0.30) +
    (goalAlignmentScore * 0.20) +
    (courseRelevanceScore * 0.20) +
    (recentActivityScore * 0.10) +
    (performanceNeedScore * 0.10) +
    (prerequisiteReadinessScore * 0.10);

  return Math.min(99, Math.max(50, Math.round(score)));
}

export function generateStudentAwareRecommendations(
  input: GenerateRecommendationsInput
): {
  recommendations: RecommendationItem[];
  nextBestAction: RecommendationItem;
  recommendedCourse: RecommendedCourseItem | null;
  recommendedCourses: RecommendedCourseItem[];
  personalizedPlan: PersonalizedPlan;
} {
  const {
    enrolledCourses,
    completedCourseIds,
    availableCourses,
    availableSheets,
    skillGaps,
    weakAreas,
    strongAreas,
    mcqAvgScore,
    mcqTotalAttempts,
    dsaSolvedCount,
    dsaDifficultyStats = { easy: 0, medium: 0, hard: 0 },
    dsaWeakTopics = [],
    activeGoal,
    streakCount = 0,
    lastActiveDaysAgo = 0
  } = input;

  const enrolledCourseIds = new Set(enrolledCourses.map(c => c.id));
  const excludedCourseIds = new Set([...enrolledCourseIds, ...completedCourseIds]);

  const recommendations: RecommendationItem[] = [];

  // Determine Goal Bias (Placement vs Academic vs Skill)
  const isPlacementGoal = activeGoal?.goal_type === 'placement' || 
    activeGoal?.title?.toLowerCase().includes('placement') || 
    activeGoal?.title?.toLowerCase().includes('interview') ||
    activeGoal?.title?.toLowerCase().includes('job');

  // 1. CONTINUE_COURSE / COMPLETE_PENDING (Enrolled Courses in Progress)
  const inProgressCourses = enrolledCourses.filter(c => c.progress > 0 && c.progress < 100);
  if (inProgressCourses.length > 0) {
    // Pick course with lowest completion or recently accessed
    const primaryCourse = inProgressCourses[0];
    const recScore = calculateRecommendationScore({
      skillGapScore: 70,
      goalAlignmentScore: isPlacementGoal ? 75 : 90,
      courseRelevanceScore: 95,
      recentActivityScore: lastActiveDaysAgo <= 2 ? 90 : 60,
      performanceNeedScore: 80,
      prerequisiteReadinessScore: 90
    });

    recommendations.push({
      id: `rec-continue-${primaryCourse.id}`,
      type: 'CONTINUE_COURSE',
      title: `Continue ${primaryCourse.title}`,
      subtitle: `Current Progress: ${primaryCourse.progress}%`,
      description: `Resume where you left off in ${primaryCourse.title}. You have completed ${primaryCourse.progress}% of the curriculum.`,
      evidenceWhy: `Your current progress in ${primaryCourse.title} is ${primaryCourse.progress}%, and completing this unlocks advanced topics.`,
      actionUrl: `/courses/${primaryCourse.id}`,
      actionText: 'Continue Course',
      relevanceScore: recScore,
      currentLevel: primaryCourse.progress,
      targetLevel: 100
    });
  }

  // 2. PRACTICE_TOPIC / REVISE_TOPIC (Measurable Skill Gaps)
  skillGaps.forEach((gapItem) => {
    if (gapItem.gap > 5) {
      const isDsaTopic = ['trees', 'graphs', 'dp', 'arrays', 'matrix', 'sorting', 'recursion', 'binary search'].some(
        t => gapItem.topic.toLowerCase().includes(t)
      );

      const recScore = calculateRecommendationScore({
        skillGapScore: Math.min(100, gapItem.gap * 2),
        goalAlignmentScore: isPlacementGoal && isDsaTopic ? 95 : 80,
        courseRelevanceScore: 90,
        recentActivityScore: 70,
        performanceNeedScore: 90,
        prerequisiteReadinessScore: 85
      });

      recommendations.push({
        id: `rec-gap-${gapItem.topic.toLowerCase().replace(/\s+/g, '-')}`,
        type: gapItem.currentCapability > 40 ? 'REVISE_TOPIC' : 'PRACTICE_TOPIC',
        title: `Practice ${gapItem.topic}`,
        subtitle: `Skill Gap: -${gapItem.gap}%`,
        description: `Your current ${gapItem.topic} proficiency is ${gapItem.currentCapability}% (Target: ${gapItem.targetCapability}%). Focused problem solving will close this gap.`,
        evidenceWhy: `Your ${gapItem.topic} accuracy is ${gapItem.currentCapability}%, which is below your ${gapItem.targetCapability}% target.`,
        actionUrl: isDsaTopic ? '/code-arena/sheets' : '/courses',
        actionText: 'Start Practice',
        relevanceScore: recScore,
        topic: gapItem.topic,
        currentLevel: gapItem.currentCapability,
        targetLevel: gapItem.targetCapability
      });
    }
  });

  // 3. TAKE_ASSESSMENT (Assessment Need)
  if (mcqTotalAttempts === 0) {
    const recScore = calculateRecommendationScore({
      skillGapScore: 80,
      goalAlignmentScore: 85,
      courseRelevanceScore: 85,
      recentActivityScore: 50,
      performanceNeedScore: 95,
      prerequisiteReadinessScore: 80
    });

    recommendations.push({
      id: 'rec-assessment-first',
      type: 'TAKE_ASSESSMENT',
      title: 'Take Initial Assessment',
      subtitle: 'Establish Skill Baseline',
      description: 'Attempt your first course quiz or MCQ to establish a baseline proficiency score and receive precision recommendations.',
      evidenceWhy: 'You have 0 recorded assessment attempts in Smart Learn.',
      actionUrl: '/courses',
      actionText: 'Take Quiz',
      relevanceScore: recScore,
      currentLevel: 0,
      targetLevel: 80
    });
  } else if (mcqAvgScore < 70) {
    const recScore = calculateRecommendationScore({
      skillGapScore: Math.round(100 - mcqAvgScore),
      goalAlignmentScore: 80,
      courseRelevanceScore: 85,
      recentActivityScore: 70,
      performanceNeedScore: 90,
      prerequisiteReadinessScore: 85
    });

    recommendations.push({
      id: 'rec-assessment-improve',
      type: 'REVISE_TOPIC',
      title: 'Raise Quiz Accuracy',
      subtitle: `Current Avg: ${Math.round(mcqAvgScore)}%`,
      description: `Re-attempt course assessments to raise your overall quiz accuracy from ${Math.round(mcqAvgScore)}% to 80%+.`,
      evidenceWhy: `Your average quiz score across ${mcqTotalAttempts} attempts is ${Math.round(mcqAvgScore)}%.`,
      actionUrl: '/courses',
      actionText: 'Improve Score',
      relevanceScore: recScore,
      currentLevel: Math.round(mcqAvgScore),
      targetLevel: 85
    });
  }

  // 4. COURSE ENROLLMENT INTELLIGENCE (Find Multiple Recommended Courses)
  let recommendedCourse: RecommendedCourseItem | null = null;
  let recommendedCourses: RecommendedCourseItem[] = [];

  const candidateCourses = availableCourses.length > 0 ? availableCourses : enrolledCourses.map(e => ({ id: e.id, title: e.title, description: e.description || null }));

  if (candidateCourses.length > 0) {
    const rankedCourses = candidateCourses.map(course => {
      const tagsList = (course as any).tags || [];
      const courseText = `${course.title} ${course.description || ''} ${tagsList.join(' ')}`.toLowerCase();
      
      const matchingWeakness = weakAreas.find(w => courseText.includes(w.toLowerCase()));
      const matchingGap = skillGaps.find(g => courseText.includes(g.topic.toLowerCase()));

      let matchScore = 70;
      let whyReason = `Recommended based on your overall learning trajectory.`;

      if (matchingGap) {
        matchScore = Math.min(98, 85 + matchingGap.gap);
        whyReason = `Addresses your ${matchingGap.topic} skill gap.`;
      } else if (matchingWeakness) {
        matchScore = 88;
        whyReason = `Targets your weak area in ${matchingWeakness}.`;
      } else if (isPlacementGoal && (courseText.includes('dsa') || courseText.includes('algorithm') || courseText.includes('system design'))) {
        matchScore = 92;
        whyReason = `Matches your Placement Goal and complements your coding practice.`;
      } else if (completedCourseIds.length > 0) {
        matchScore = 82;
        whyReason = `Logical next step following your completed coursework.`;
      }

      return {
        id: course.id,
        title: course.title,
        description: course.description || 'Expand your engineering skills with this course.',
        matchScore,
        whyReason,
        actionUrl: `/courses/${course.id}`,
        difficulty: (course as any).difficulty,
        tags: (course as any).tags
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    recommendedCourses = rankedCourses.slice(0, 4);
    recommendedCourse = rankedCourses[0] || null;

    if (recommendedCourse) {
      const recScore = calculateRecommendationScore({
        skillGapScore: recommendedCourse.matchScore,
        goalAlignmentScore: isPlacementGoal ? 90 : 80,
        courseRelevanceScore: recommendedCourse.matchScore,
        recentActivityScore: 75,
        performanceNeedScore: 80,
        prerequisiteReadinessScore: 90
      });

      recommendations.push({
        id: `rec-enroll-${recommendedCourse.id}`,
        type: 'ENROLL_COURSE',
        title: `Enroll in ${recommendedCourse.title}`,
        subtitle: `${recommendedCourse.matchScore}% Match`,
        description: recommendedCourse.description,
        evidenceWhy: recommendedCourse.whyReason,
        actionUrl: recommendedCourse.actionUrl,
        actionText: 'View Course',
        relevanceScore: recScore
      });
    }
  }

  // Sort recommendations by relevanceScore descending
  recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // 5. DETERMINE NEXT BEST ACTION (Top 1 Recommendation)
  const defaultNextAction: RecommendationItem = {
    id: 'rec-default-action',
    type: 'DAILY_ACTION',
    title: 'Daily DSA Practice',
    subtitle: 'Build Problem Solving Habit',
    description: 'Solve 2 DSA problems today to maintain your streak and sharpen algorithmic speed.',
    evidenceWhy: `You have solved ${dsaSolvedCount} problems. Daily practice strengthens retention.`,
    actionUrl: '/code-arena/sheets',
    actionText: 'Start Practice',
    relevanceScore: 90,
    currentLevel: dsaSolvedCount,
    targetLevel: dsaSolvedCount + 10
  };

  const nextBestAction = recommendations[0] || defaultNextAction;

  // 6. GENERATE PERSONALIZED 7-DAY LEARNING PLAN
  const topWeakTopic = weakAreas[0] || dsaWeakTopics[0] || (skillGaps[0] ? skillGaps[0].topic : 'Core Fundamentals');
  const secondaryWeakTopic = weakAreas[1] || dsaWeakTopics[1] || 'Problem Solving';

  const personalizedPlan: PersonalizedPlan = {
    today: [
      {
        title: `Focus: ${topWeakTopic}`,
        detail: `Study key concepts and review code patterns in ${topWeakTopic}.`,
        actionUrl: nextBestAction.actionUrl
      },
      {
        title: `Solve 3 ${dsaDifficultyStats.easy < 10 ? 'Easy' : 'Medium'} Problems`,
        detail: `Target ${topWeakTopic} problems to close your capability gap.`,
        actionUrl: '/code-arena/sheets'
      },
      {
        title: 'Review Mistakes & Flashcards',
        detail: 'Spend 15 minutes reviewing previous incorrect submissions.',
        actionUrl: '/code-arena/profile'
      }
    ],
    thisWeek: [
      {
        title: `Complete ${topWeakTopic} Module`,
        detail: `Raise your ${topWeakTopic} capability score from current level to 75%+.`
      },
      {
        title: 'Attempt Weekly Assessment',
        detail: `Take the ${topWeakTopic} quiz to verify your score improvement.`
      },
      {
        title: `Begin ${secondaryWeakTopic} Fundamentals`,
        detail: `Transition to ${secondaryWeakTopic} once target score is achieved.`
      }
    ],
    nextCourse: recommendedCourse ? {
      title: recommendedCourse.title,
      reason: recommendedCourse.whyReason,
      url: recommendedCourse.actionUrl,
      matchScore: recommendedCourse.matchScore
    } : null
  };

  return {
    recommendations: recommendations.slice(0, 5),
    nextBestAction,
    recommendedCourse,
    recommendedCourses,
    personalizedPlan
  };
}
