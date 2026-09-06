export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

export const GEMINI_TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: 'openDashboard',
    description: 'Navigate to the student main dashboard. Use when student asks to open/show dashboard, home page, or main screen. Examples: "dashboard kholo", "open home", "home page dikhao".',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'openProfile',
    description: 'Navigate to student profile page. Use when student wants to see/edit profile, user info, account details, or badges.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'openCourses',
    description: 'Navigate to published courses catalog. Use when student wants to browse all available courses, subjects, or catalog.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'openMyCourses',
    description: 'Navigate to student enrolled courses list.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'openCourse',
    description: 'Navigate to a specific course detail/player page by title or ID.',
    parameters: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'Specific course ID if known' },
        courseName: { type: 'string', description: 'Course title or query string to match' }
      }
    }
  },
  {
    name: 'openDSASheets',
    description: 'Navigate to DSA Sheets index page. Use when student wants to see all DSA sheets.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'openDSASheet',
    description: 'Navigate to a specific DSA sheet page.',
    parameters: {
      type: 'object',
      properties: {
        sheetId: { type: 'string', description: 'Sheet UUID or ID' },
        query: { type: 'string', description: 'Sheet title query' }
      }
    }
  },
  {
    name: 'openDSAProblem',
    description: 'Navigate to a specific DSA coding problem inside a sheet or problem list.',
    parameters: {
      type: 'object',
      properties: {
        sheetId: { type: 'string', description: 'Associated sheet ID' },
        problemId: { type: 'string', description: 'Problem UUID or ID' },
        query: { type: 'string', description: 'Problem title or number query' }
      }
    }
  },
  {
    name: 'openWeakestDSAProblem',
    description: 'Find and navigate to student weakest DSA problem based on analytics.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'openCodingArena',
    description: 'Navigate to coding arena compiler / playground.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'openRoutine',
    description: 'Navigate to daily routine & schedule manager screen.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'openGoals',
    description: 'Navigate to student goals management page.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'openLatexEditor',
    description: 'Navigate to LaTeX document / notes editor.',
    parameters: {
      type: 'object',
      properties: {
        problemId: { type: 'string', description: 'Associated problem ID if applicable' }
      }
    }
  },
  {
    name: 'openNotifications',
    description: 'Navigate to student notifications center.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'openLeaderboard',
    description: 'Navigate to student rank & leaderboard screen.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'openDoubts',
    description: 'Navigate to doubts & Q&A forum.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'searchYouTube',
    description: 'Search YouTube for educational videos or problem solutions.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Topic or problem search query' }
      },
      required: ['query']
    }
  },
  {
    name: 'searchWeb',
    description: 'Search web resources for student queries.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    }
  },
  {
    name: 'queryLivePage',
    description: 'Inspect current active page context and answer questions about visible content.',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Question about visible page content' }
      },
      required: ['question']
    }
  },
  {
    name: 'getCurrentPageContext',
    description: 'Read the live rendered content of the current page open on the user\'s screen (visible headings, cards, text content, active buttons, active problem/course/sheet details, stats, progress, UI state). Use when user asks "isme kya hai?", "is page ka progress batao", "yaha kya likha hai?", "explain this page", or refers to current screen context ("ye", "isko", "isme").',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'getStudent360',
    description: 'Get comprehensive student intelligence analytics profile.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'getWeakAreas',
    description: 'Get list of student weak DSA topics and subjects.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'getRecommendations',
    description: 'Get personalized study recommendations for today.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'getMyRoutine',
    description: 'Fetch student daily routine tasks.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'generateTomorrowRoutine',
    description: 'Generate AI optimized routine for tomorrow.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'getMyGoals',
    description: 'Fetch student current goals.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'createCodingSheet',
    description: 'Create a new DSA coding sheet. Examples: "Advanced Graph sheet banao", "create DSA sheet named DP".',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the new sheet e.g. "Advanced Graph", "Dynamic Programming"' },
        description: { type: 'string', description: 'Optional description' },
        category: { type: 'string', description: 'Optional category' }
      },
      required: ['title']
    }
  },
  {
    name: 'addProblemsToSheet',
    description: 'Add problems matching a topic query (e.g. Binary Search, Arrays) to a DSA sheet.',
    parameters: {
      type: 'object',
      properties: {
        sheetId: { type: 'string', description: 'Sheet UUID' },
        sheetQuery: { type: 'string', description: 'Optional sheet name query' },
        topicQuery: { type: 'string', description: 'Topic or problem search query e.g. "Binary Search"' },
        limit: { type: 'number', description: 'Number of problems to add, default 5' }
      }
    }
  },
  {
    name: 'runSafeSQLQuery',
    description: 'Safely execute SQL queries in the sandboxed SQL Editor engine.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'SQL query to execute e.g. "SELECT * FROM employees LIMIT 10"' },
        dataset: { type: 'string', description: 'Dataset key e.g. "employees_departments"' }
      },
      required: ['query']
    }
  }
];
