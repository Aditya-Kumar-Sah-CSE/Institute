export interface LiveEntitySheet {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  totalProblems?: number;
  solvedProblems?: number;
  progress?: number;
  requiresPasscode?: boolean;
}

export interface LiveEntityProblem {
  id: string;
  number?: number;
  title: string;
  topic?: string;
  difficulty?: string;
  solved?: boolean;
  slug?: string;
}

export interface LiveEntityCourse {
  id: string;
  title: string;
  progress?: number;
  enrolled?: boolean;
}

export interface LivePageContext {
  route: string;
  pageType: 
    | 'dashboard'
    | 'dsa_sheets'
    | 'dsa_sheet_detail'
    | 'dsa_problem'
    | 'courses'
    | 'course_detail'
    | 'routine'
    | 'goals'
    | 'certificates'
    | 'profile'
    | 'latex'
    | 'general';
  pageTitle?: string;
  visibleHeadings?: string[];
  visibleTextContent?: string;
  interactiveElements?: string[];
  importantIds?: Record<string, string>;

  visibleEntities?: {
    sheets?: LiveEntitySheet[];
    courses?: LiveEntityCourse[];
    problems?: LiveEntityProblem[];
    certificates?: Array<{ id: string; courseTitle: string }>;
    routineItems?: Array<{ time_slot: string; task_name: string }>;
    goals?: Array<{ id: string; goal_text: string }>;
  };

  currentEntity?: {
    type: 'sheet' | 'problem' | 'course' | 'certificate' | 'general';
    id: string;
    title: string;
    metadata?: Record<string, any>;
  };

  availableActions?: string[];
  loadState?: 'loading' | 'ready' | 'error' | 'not-found' | 'unauthorized';
  navigationId?: string;
  errorCode?: string;
  timestamp?: number;
}

export function buildDefaultLiveContext(route: string = '/dashboard'): LivePageContext {
  return {
    route,
    loadState: 'ready',
    pageType: route.includes('/code-arena/sheets/') ? 'dsa_sheet_detail'
            : route.includes('/code-arena/sheets') ? 'dsa_sheets'
            : route.includes('/code-arena/problems/') ? 'dsa_problem'
            : route.includes('/courses/') ? 'course_detail'
            : route.includes('/courses') ? 'courses'
            : route.includes('/profile') ? 'profile'
            : route.includes('/certificates') ? 'certificates'
            : route.includes('/latex-editor') ? 'latex'
            : 'dashboard',
    pageTitle: 'Smart Learn Platform',
    availableActions: ['open_dashboard', 'open_courses', 'open_dsa', 'get_learning_intelligence']
  };
}
