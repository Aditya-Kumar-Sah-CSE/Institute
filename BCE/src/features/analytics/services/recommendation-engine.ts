/** Activity-based next steps; this module intentionally does not invent proficiency scores. */
export interface RecommendationItem {
  id: string;
  type: 'CONTINUE_COURSE' | 'TAKE_ASSESSMENT' | 'PRACTICE_TOPIC';
  title: string;
  description: string;
  evidenceWhy: string;
  actionUrl: string;
  actionText: string;
}
