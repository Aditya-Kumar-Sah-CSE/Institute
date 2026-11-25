export type GuidedStepKind =
  | 'overview'
  | 'concept'
  | 'code_lab'
  | 'task'
  | 'project_overview'
  | 'project_milestone'
  | 'interview_theory'
  | 'interview_coding'
  | 'interview_output'
  | 'assignment'
  | 'checklist';

export type WorkspaceRunMode = 'javascript' | 'html_preview' | 'none';

export interface GuidedStepHint {
  step: number;
  text: string;
}

export interface GuidedQaItem {
  id: string;
  question: string;
  answer?: string;
  code?: string;
  explanation?: string;
}

export interface GuidedTableRow {
  col1: string;
  col2: string;
  col3?: string;
}

export interface GuidedLessonStep {
  id: string;
  stepNumber: number;
  kind: GuidedStepKind;
  badge: string;
  title: string;
  summary: string;
  keyPoints?: string[];
  codeSnippet?: string;
  starterCode?: string;
  solutionCode?: string;
  hints?: GuidedStepHint[];
  qaItems?: GuidedQaItem[];
  tableRows?: GuidedTableRow[];
  runMode: WorkspaceRunMode;
  analysisFocus?: string;
}

export interface SidebarLessonSummary {
  id: string;
  title: string;
  week_number: number;
  sort_order: number;
  xp_reward: number;
  created_at: string;
}

