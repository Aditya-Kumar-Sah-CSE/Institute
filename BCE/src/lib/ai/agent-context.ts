import { Student360Profile } from '@/features/analytics/services/student-intelligence';
import { LivePageContext } from './live-page-context';

export interface AgentPageContext extends Partial<LivePageContext> {
  route?: string;
  problemId?: string;
  problemTitle?: string;
  courseId?: string;
  courseTitle?: string;
  certificateId?: string;
  liveContext?: LivePageContext;
}

export function buildAgentContext(
  profile?: Student360Profile | null,
  pageContext?: AgentPageContext
) {
  return {
    student: profile ? {
      userId: profile.userId,
      hasSufficientData: profile.hasSufficientData,
      overallLearningScore: profile.overallLearningScore,
      academicScore: profile.academicScore,
      codingScore: profile.codingScore,
      learningScore: profile.learningScore,
      assessmentScore: profile.assessmentScore,
      confidenceLevel: profile.confidenceLevel,
      coverage: profile.dataCoverage,
      strengths: profile.strengths,
      weakAreas: profile.weakAreas,
      skillGaps: profile.skillGaps,
      enrolledCourses: profile.enrolledCoursesData,
      dailyRoutines: profile.dailyRoutines,
      activeGoals: profile.activeGoals,
      nextBestAction: profile.nextBestAction
    } : null,
    currentPageContext: {
      route: pageContext?.route || '/dashboard',
      problemId: pageContext?.problemId || null,
      problemTitle: pageContext?.problemTitle || null,
      courseId: pageContext?.courseId || null,
      courseTitle: pageContext?.courseTitle || null,
      certificateId: pageContext?.certificateId || null,
      liveContext: pageContext?.liveContext || null
    }
  };
}
