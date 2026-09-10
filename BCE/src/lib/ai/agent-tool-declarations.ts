import { AppRole, getRequiredRoleForTool } from '@/lib/auth/agent-permissions';

export interface ToolDeclaration {
  name: string;
  description: string;
  requiredPermission?: AppRole;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

const TOOL_DECLARATIONS: ToolDeclaration[] = [
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
    name: 'getCurrentCodingProblem',
    description: 'Read the currently open rendered coding problem before solving or explaining it, including its statement, formats, constraints, examples, explanation, starter code, signature, and editor language.',
    parameters: { type: 'object', properties: {} }
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
  },
  // ─── WEB RESEARCH TOOLS ───
  {
    name: 'webSearch',
    description: 'Search the web for information. Returns search results with titles, snippets, and URLs.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query text' },
        limit: { type: 'number', description: 'Max results to return (default 5)' }
      },
      required: ['query']
    }
  },
  {
    name: 'webScrape',
    description: 'Fetch and extract text content from a URL.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Full URL to fetch and parse' },
        maxLength: { type: 'number', description: 'Max characters to return (default 3000)' }
      },
      required: ['url']
    }
  },
  {
    name: 'summarizeURL',
    description: 'Fetch URL content and return a concise summary.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to summarize' }
      },
      required: ['url']
    }
  },
  // ─── FILE & SYSTEM TOOLS ───
  {
    name: 'readFile',
    description: 'Read the contents of a local file by path.',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'File path to read' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'writeFile',
    description: 'Write content to a local file. REQUIRES CONFIRMATION.',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Output file path' },
        content: { type: 'string', description: 'Content to write' },
        append: { type: 'string', description: 'Set "true" to append instead of overwrite' }
      },
      required: ['filePath', 'content']
    }
  },
  {
    name: 'listDirectory',
    description: 'List files and folders in a directory.',
    parameters: {
      type: 'object',
      properties: {
        dirPath: { type: 'string', description: 'Directory path (default: current directory)' }
      }
    }
  },
  {
    name: 'deleteFile',
    description: 'Delete a file. REQUIRES CONFIRMATION.',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'File path to delete' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'getSystemInfo',
    description: 'Get system information like OS, hostname, memory, and Node.js version.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'runTerminalCommand',
    description: 'Execute a shell command. REQUIRES CONFIRMATION.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to run' },
        cwd: { type: 'string', description: 'Working directory' },
        timeoutMs: { type: 'number', description: 'Max execution time in ms' }
      },
      required: ['command']
    }
  },
  // ─── SCREEN & CONTEXT TOOLS ───
  {
    name: 'captureScreenContext',
    description: 'Capture the current screen state as a structured DOM snapshot.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'inspectLocalComputer',
    description: 'Inspect the connected local Computer Companion capabilities and connection state.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'launchPermittedApp',
    description: 'Launch an allowlisted desktop app through the local companion. Requires explicit user confirmation.',
    parameters: {
      type: 'object',
      properties: {
        app: { type: 'string', description: 'Allowlisted app name such as chrome or edge' },
        args: { type: 'array', description: 'Safe navigation arguments' }
      },
      required: ['app']
    }
  },
  {
    name: 'openBrowserUrl',
    description: 'Open an HTTP(S) URL in the paired local browser and verify the active tab URL, title, and visible DOM.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'HTTP(S) URL to open' },
        app: { type: 'string', description: 'Allowlisted browser name' }
      },
      required: ['url']
    }
  },
  {
    name: 'observeBrowserState',
    description: 'Observe the actual paired browser active tab URL, title, and visible DOM text.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'readLocalWorkspaceFile',
    description: 'Read a file from the local companion workspace.',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Relative workspace path' } },
      required: ['path']
    }
  },
  {
    name: 'writeLocalWorkspaceFile',
    description: 'Write a file in the local companion workspace. Requires explicit user confirmation.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative workspace path' },
        content: { type: 'string', description: 'File content' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'readScreenRegion',
    description: 'Read text content from a specific section of the page (sidebar, main, navbar, modal).',
    parameters: {
      type: 'object',
      properties: {
        section: { type: 'string', description: 'Page section: sidebar, main, navbar, modal, or all', enum: ['sidebar', 'main', 'navbar', 'modal', 'all'] }
      }
    }
  },
  // ─── PERSISTENT MEMORY TOOLS ───
  {
    name: 'saveToMemory',
    description: 'Save a fact or note to persistent agent memory.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Short label/key for the memory' },
        value: { type: 'string', description: 'The fact/note to remember' },
        category: { type: 'string', description: 'Category: general, academic, personal, preference' }
      },
      required: ['key', 'value']
    }
  },
  {
    name: 'recallFromMemory',
    description: 'Search and recall saved facts from persistent memory.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to find matching memories' }
      },
      required: ['query']
    }
  },
  {
    name: 'setReminder',
    description: 'Set a future reminder with a message.',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Reminder message text' },
        triggerAt: { type: 'string', description: 'ISO timestamp for when to trigger' }
      },
      required: ['message']
    }
  },
  {
    name: 'listReminders',
    description: 'List all active/pending reminders.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'clearPersistentMemory',
    description: 'Clear stored agent memories. REQUIRES CONFIRMATION.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional: clear only a specific category' }
      }
    }
  },
  {
    name: 'runAutonomousCodingAgent',
    description: 'Autonomously plan, inspect, generate code, apply workspace files, compile, repair errors, and verify pages in browser. Use when user asks to "Make a login page", "create a page", "build a component", "fix component", or requests full autonomous software engineering.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Coding prompt or feature description e.g. "Make a login page"' },
        maxRetries: { type: 'number', description: 'Max repair loop iterations (default: 3)' }
      },
      required: ['prompt']
    }
  }
];

export const GEMINI_TOOL_DECLARATIONS: ToolDeclaration[] = TOOL_DECLARATIONS.map(tool => ({
  ...tool,
  requiredPermission: getRequiredRoleForTool(tool.name)
}));
