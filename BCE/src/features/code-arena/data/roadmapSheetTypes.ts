export interface RoadmapApproach {
  approach: string;
  time: string;
  space: string;
  code_cpp: string;
}

export interface RoadmapTestCase {
  input: string;
  output: string;
  explanation?: string;
}

export interface RoadmapTheoryModule {
  topic: string;
  concept: string;
  key_points: string[];
  template_cpp?: string;
  pitfalls: string[];
  batch?: string;
  part?: number;
}

export interface RoadmapRevisionData {
  title?: string;
  pattern_cheat_sheet?: Array<{
    pattern: string;
    when_to_use: string;
    idea: string;
    practice_ids: string[];
  }>;
  decision_guide?: string[];
  complexity_cheat_sheet?: Array<{
    item: string;
    complexity: string;
  }>;
  common_mistakes?: string[];
  interview_checklist?: string[];
  cpp_tips?: string[];
  self_test_before_level_2?: {
    instruction: string;
    problem_ids: string[];
  };
  self_test_before_level_3?: {
    instruction: string;
    problem_ids: string[];
  };
  next_level_preview?: {
    level: number;
    title: string;
    topics: string[];
    why: string;
  };
  [key: string]: any;
}

export interface RoadmapLevel {
  id: string;
  level_number: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  target_problem_count: number;
  is_unlocked: boolean;
  theory_modules: RoadmapTheoryModule[];
  revision_data: RoadmapRevisionData;
  meta: Record<string, any>;
}

export interface RoadmapProblem {
  id: string;
  problem_code: string;
  order_index: number;
  level_number: number;
  batch_name?: string | null;
  topic: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  company_tags: string[];
  problem_statement: string;
  description: string;
  constraints: string[];
  test_cases: RoadmapTestCase[];
  theory: string;
  brute_force: RoadmapApproach;
  optimized: RoadmapApproach;
  explanation: string;
  edge_cases: string[];
}

export interface RoadmapProblemProgress {
  problem_code: string;
  level_number: number;
  is_solved: boolean;
  is_revised: boolean;
  is_bookmarked: boolean;
  submitted_code?: string | null;
  language?: string | null;
  attempts: number;
  xp_awarded: number;
  solved_at?: string | null;
}

export function normalizeRoadmapDifficulty(diff?: string | null): 'EASY' | 'MEDIUM' | 'HARD' {
  const d = String(diff || 'EASY').trim().toUpperCase();
  if (d === 'HARD') return 'HARD';
  if (d === 'MEDIUM') return 'MEDIUM';
  return 'EASY';
}

