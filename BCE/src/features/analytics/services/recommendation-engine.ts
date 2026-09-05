/* ============================================
   Deterministic Recommendation Engine
   ============================================ */

export type RecommendationType = 'course' | 'topic' | 'practice' | 'trainer';

export interface RecommendationItem {
  id: string;
  type: RecommendationType;
  title: string;
  subtitle?: string;
  description: string;
  evidenceWhy: string;
  actionUrl: string;
  actionText: string;
  relevanceScore: number;
}

export interface SkillGapItem {
  topic: string;
  currentCapability: number;
  targetCapability: number;
  gap: number;
  evidence: string;
}

interface GenerateRecommendationsInput {
  weakAreas: string[];
  skillGaps: SkillGapItem[];
  enrolledCourseIds: string[];
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
  mcqAvgScore: number;
  mcqTotalAttempts: number;
  dsaSolvedCount: number;
}

export function generateDeterministicRecommendations(
  input: GenerateRecommendationsInput
): RecommendationItem[] {
  const recommendations: RecommendationItem[] = [];

  const {
    weakAreas,
    skillGaps,
    enrolledCourseIds,
    completedCourseIds,
    availableCourses,
    availableSheets,
    mcqAvgScore,
    mcqTotalAttempts,
    dsaSolvedCount
  } = input;

  const excludedCourseIds = new Set([...enrolledCourseIds, ...completedCourseIds]);

  // 1. RECOMMENDATIONS BASED ON SKILL GAPS / WEAK TOPICS
  skillGaps.forEach(gapItem => {
    if (gapItem.gap > 10) {
      // Find matching un-enrolled course for this weak topic
      const matchingCourse = availableCourses.find(c => {
        if (excludedCourseIds.has(c.id)) return false;
        const searchStr = `${c.title} ${c.description || ''} ${(c.tags || []).join(' ')}`.toLowerCase();
        return searchStr.includes(gapItem.topic.toLowerCase());
      });

      if (matchingCourse) {
        recommendations.push({
          id: `rec-course-${matchingCourse.id}`,
          type: 'course',
          title: matchingCourse.title,
          subtitle: `Targeted Course for ${gapItem.topic}`,
          description: matchingCourse.description || `Boost your ${gapItem.topic} proficiency to close the ${gapItem.gap}% skill gap.`,
          evidenceWhy: `Why? ${gapItem.evidence}`,
          actionUrl: `/courses/${matchingCourse.id}`,
          actionText: 'Explore Course',
          relevanceScore: 95 + gapItem.gap
        });
        excludedCourseIds.add(matchingCourse.id);
      } else {
        // Fallback: Topic practice recommendation
        recommendations.push({
          id: `rec-topic-${gapItem.topic.replace(/\s+/g, '-').toLowerCase()}`,
          type: 'topic',
          title: `Master ${gapItem.topic}`,
          subtitle: `Recommended Topic Focus`,
          description: `Your current proficiency is ${gapItem.currentCapability}% (Target: ${gapItem.targetCapability}%). Focus on foundational ${gapItem.topic} concepts.`,
          evidenceWhy: `Why? ${gapItem.evidence}`,
          actionUrl: `/code-arena/sheets`,
          actionText: 'Practice Topic',
          relevanceScore: 85 + gapItem.gap
        });
      }
    }
  });

  // 2. DSA / PRACTICE RECOMMENDATION
  if (dsaSolvedCount < 10) {
    const firstSheet = availableSheets && availableSheets.length > 0 ? availableSheets[0] : null;
    recommendations.push({
      id: 'rec-practice-dsa-beginner',
      type: 'practice',
      title: firstSheet ? firstSheet.title : 'Beginner DSA Practice',
      subtitle: 'Build Problem Solving Habit',
      description: 'Solving daily DSA problems improves algorithm accuracy and placement readiness.',
      evidenceWhy: `Why? Based on your current DSA activity (${dsaSolvedCount} problems solved).`,
      actionUrl: firstSheet ? `/code-arena/sheets/${firstSheet.id}` : '/code-arena/sheets',
      actionText: 'Start Solving',
      relevanceScore: 90
    });
  } else if (weakAreas.some(w => w.toLowerCase().includes('dsa') || w.toLowerCase().includes('graph') || w.toLowerCase().includes('tree') || w.toLowerCase().includes('dp'))) {
    const matchingSheet = availableSheets?.find(s => s.title.toLowerCase().includes('dsa') || s.title.toLowerCase().includes('striver') || s.title.toLowerCase().includes('blind'));
    recommendations.push({
      id: 'rec-practice-dsa-advanced',
      type: 'practice',
      title: matchingSheet ? matchingSheet.title : 'Targeted DSA Practice',
      subtitle: 'Algorithmic Proficiency',
      description: 'Consolidate topic strengths by solving structured problem sheets.',
      evidenceWhy: `Why? Based on weak topic performance identified in assessment data.`,
      actionUrl: matchingSheet ? `/code-arena/sheets/${matchingSheet.id}` : '/code-arena/sheets',
      actionText: 'Practice Now',
      relevanceScore: 88
    });
  }

  // 3. ASSESSMENT RECOMMENDATION (IF ASSESSMENT SCORE IS LOW OR ATTEMPTS FEW)
  if (mcqTotalAttempts === 0) {
    recommendations.push({
      id: 'rec-mcq-first',
      type: 'practice',
      title: 'Take Course Assessments',
      subtitle: 'Evaluate Skill Knowledge',
      description: 'Complete course MCQs to test your domain retention and unlock targeted analytics.',
      evidenceWhy: 'Why? You have 0 assessment attempts recorded in Smart Learn.',
      actionUrl: '/courses',
      actionText: 'View Courses',
      relevanceScore: 80
    });
  } else if (mcqAvgScore < 70) {
    recommendations.push({
      id: 'rec-mcq-improve',
      type: 'topic',
      title: 'Revise Assessment Weak Spots',
      subtitle: 'Accuracy Enhancement',
      description: `Re-attempt course MCQs to raise your average assessment score from ${Math.round(mcqAvgScore)}% to 85%+.`,
      evidenceWhy: `Why? Based on your current average quiz score of ${Math.round(mcqAvgScore)}% across ${mcqTotalAttempts} attempts.`,
      actionUrl: '/courses',
      actionText: 'Re-attempt Quiz',
      relevanceScore: 82
    });
  }

  // 4. GENERAL POPULAR/EXPLORE COURSE RECOMMENDATION IF FEWER THAN 3 RECOMMENDATIONS
  if (recommendations.length < 3) {
    const exploreCourse = availableCourses.find(c => !excludedCourseIds.has(c.id));
    if (exploreCourse) {
      recommendations.push({
        id: `rec-course-explore-${exploreCourse.id}`,
        type: 'course',
        title: exploreCourse.title,
        subtitle: 'Expand Skill Domain',
        description: exploreCourse.description || 'Broaden your tech stack with this top-rated Smart Learn course.',
        evidenceWhy: 'Why? Recommended to expand your learning breadth based on enrolled courses.',
        actionUrl: `/courses/${exploreCourse.id}`,
        actionText: 'View Course',
        relevanceScore: 75
      });
    }
  }

  // Sort by relevance score descending & limit to top 4
  return recommendations
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 4);
}
