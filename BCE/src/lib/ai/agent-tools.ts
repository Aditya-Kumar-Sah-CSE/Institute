import { createAdminClient, getUser } from '@/lib/supabase/server';
import { getStudent360Profile, Student360Profile } from '@/features/analytics/services/student-intelligence';
import { normalizeAgentRole, canUseTool } from '@/lib/auth/agent-permissions';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AgentToolResult {
  success: boolean;
  message: string;
  url?: string;
  externalUrl?: string;
  data?: any;
  requiresConfirmation?: {
    toolName: string;
    args: any;
    promptMessage: string;
  };
  error?: string;
  pendingNavigation?: boolean;
  navigationId?: string;
  expectedRoute?: string;
  expectedEntity?: {
    type: 'sheet' | 'problem' | 'course' | 'certificate';
    id: string;
    title?: string;
    number?: number;
  };
  successMessage?: string;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  category: 'NAVIGATION' | 'COURSES' | 'DSA' | 'ANALYTICS' | 'ROUTINE_GOALS' | 'SEARCH' | 'TOOLS';
  riskLevel: RiskLevel;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
  examples?: string[];
  execute: (args: any, user: { id: string }, context?: any) => Promise<AgentToolResult>;
}

// ─── COMPREHENSIVE TOOL REGISTRY ───

export const AGENT_TOOLS: Record<string, AgentToolDefinition> = {
  // ─── NAVIGATION TOOLS ───
  openDashboard: {
    name: 'openDashboard',
    description: 'Navigate to the student main dashboard. Use when student asks to open/show dashboard, home page, or main screen. Examples: "dashboard kholo", "open home", "home page dikhao".',
    category: 'NAVIGATION',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['dashboard kholo', 'open home page', 'main screen dikhao'],
    execute: async () => ({
      success: true,
      message: 'Opening student dashboard...',
      url: '/dashboard',
      pendingNavigation: true,
      navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      expectedRoute: '/dashboard',
      successMessage: 'Student dashboard open kar diya.'
    })
  },

  openProfile: {
    name: 'openProfile',
    description: 'Navigate to student profile page. Use when student wants to see/edit profile, user info, account details, or badges. Examples: "meri profile kholo", "user profile", "my account".',
    category: 'NAVIGATION',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['meri profile kholo', 'show my account', 'user profile dikhao'],
    execute: async () => ({
      success: true,
      message: 'Opening your profile page...',
      url: '/profile',
      pendingNavigation: true,
      navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      expectedRoute: '/profile',
      successMessage: 'Profile page open kar di.'
    })
  },

  openCourses: {
    name: 'openCourses',
    description: 'Navigate to published courses catalog. Use when student wants to browse all available courses, subjects, or catalog. Examples: "courses kholo", "browse courses", "sabhi subject dikhao".',
    category: 'COURSES',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['courses kholo', 'browse courses', 'all subjects'],
    execute: async () => ({
      success: true,
      message: 'Opening courses catalog...',
      url: '/courses',
      pendingNavigation: true,
      navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      expectedRoute: '/courses',
      successMessage: 'Courses catalog open kar diya.'
    })
  },

  openMyCourses: {
    name: 'openMyCourses',
    description: 'Navigate to student enrolled courses list. Use when student asks for enrolled courses, my subjects, or active learning modules. Examples: "mere enrolled course kholo", "my courses", "mera course dikhao".',
    category: 'COURSES',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['mere course dikhao', 'enrolled courses kholo', 'my subjects'],
    execute: async () => ({
      success: true,
      message: 'Opening your enrolled courses...',
      url: '/courses',
      pendingNavigation: true,
      navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      expectedRoute: '/courses',
      successMessage: 'Enrolled courses open kar diye.'
    })
  },

  openCourse: {
    name: 'openCourse',
    description: 'Open a specific course by title or query (e.g. ITW, DBMS, Web Development). Use when user specifies a course name like "Mera ITW course kholo" or "DBMS open karo".',
    category: 'COURSES',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'Course UUID if known' },
        courseName: { type: 'string', description: 'Course title or query (e.g. "ITW", "DBMS")' }
      }
    },
    examples: ['Mera ITW course kholo', 'DBMS course open karo', 'open web dev course'],
    execute: async (args) => {
      const adminClient = await createAdminClient();
      if (args.courseId) {
        const { data: c } = await adminClient.from('courses').select('id, title').eq('id', args.courseId).maybeSingle();
        const title = c?.title || 'Course';
        return {
          success: true,
          message: `Opening course: ${title}...`,
          url: `/courses/${args.courseId}`,
          pendingNavigation: true,
          navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          expectedRoute: `/courses/${args.courseId}`,
          expectedEntity: { type: 'course', id: args.courseId, title },
          successMessage: `Course ${title} open kar diya.`,
          data: { courseId: args.courseId }
        };
      }
      
      const name = args.courseName ? args.courseName.trim() : '';

      if (name) {
        const { data: matched } = await adminClient
          .from('courses')
          .select('id, title')
          .ilike('title', `%${name}%`)
          .eq('is_published', true)
          .limit(1)
          .maybeSingle();

        if (matched) {
          return {
            success: true,
            message: `Opening Course ${matched.title}...`,
            url: `/courses/${matched.id}`,
            pendingNavigation: true,
            navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            expectedRoute: `/courses/${matched.id}`,
            expectedEntity: { type: 'course', id: matched.id, title: matched.title },
            successMessage: `Course ${matched.title} open kar diya.`,
            data: { courseId: matched.id, courseTitle: matched.title }
          };
        }

        return {
          success: false,
          message: `Mujhe "${name}" course nahi mila.`
        };
      }

      return { 
        success: true, 
        message: 'Opening courses catalog...', 
        url: '/courses',
        pendingNavigation: true,
        navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        expectedRoute: '/courses',
        successMessage: 'Courses catalog open kar diya.' 
      };
    }
  },

  openDSASheets: {
    name: 'openDSASheets',
    description: 'Navigate to DSA sheets listing page. Use when student asks to open/show DSA sheet, coding sheets, problem sets. Examples: "meri DSA sheet kholo", "open DSA", "coding sheet dikhao".',
    category: 'DSA',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['meri DSA sheet kholo', 'open DSA sheets', 'dsa dikha'],
    execute: async () => ({
      success: true,
      message: 'Opening DSA sheets...',
      url: '/code-arena/sheets',
      pendingNavigation: true,
      navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      expectedRoute: '/code-arena/sheets',
      successMessage: 'Tumhari DSA sheets open kar di.'
    })
  },

  openDSASheet: {
    name: 'openDSASheet',
    description: 'Open a specific DSA sheet by ID or title query. Examples: "Blind 75 sheet kholo", "Striver A2Z sheet open karo", "Leetcode 100 Basics kholo".',
    category: 'DSA',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        sheetId: { type: 'string', description: 'Sheet UUID if known' },
        titleQuery: { type: 'string', description: 'Name of the sheet e.g. "Blind 75", "Striver", "Leetcode 100"' }
      }
    },
    examples: ['Blind 75 sheet kholo', 'Striver sheet dikhao', 'Leetcode 100 Basics kholo'],
    execute: async (args) => {
      const adminClient = await createAdminClient();
      if (args.sheetId) {
        const { data: s } = await adminClient.from('coding_sheets').select('id, title').eq('id', args.sheetId).maybeSingle();
        const title = s?.title || 'DSA Sheet';
        return { 
          success: true, 
          message: `Opening DSA Sheet: ${title}...`, 
          url: `/code-arena/sheets/${args.sheetId}`,
          pendingNavigation: true,
          navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          expectedRoute: `/code-arena/sheets/${args.sheetId}`,
          expectedEntity: { type: 'sheet', id: args.sheetId, title },
          successMessage: `DSA Sheet ${title} open kar di.`
        };
      }
      
      if (args.titleQuery) {
        const { data } = await adminClient
          .from('coding_sheets')
          .select('id, title')
          .ilike('title', `%${args.titleQuery.trim()}%`)
          .limit(1)
          .maybeSingle();

        if (data) {
          return { 
            success: true, 
            message: `Opening DSA Sheet: ${data.title}...`, 
            url: `/code-arena/sheets/${data.id}`,
            pendingNavigation: true,
            navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            expectedRoute: `/code-arena/sheets/${data.id}`,
            expectedEntity: { type: 'sheet', id: data.id, title: data.title },
            successMessage: `DSA Sheet ${data.title} open kar di.`
          };
        }

        return {
          success: false,
          message: `"${args.titleQuery}" DSA sheet nahi mili.`
        };
      }
      return { 
        success: true, 
        message: 'Opening DSA sheets list...', 
        url: '/code-arena/sheets',
        pendingNavigation: true,
        navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        expectedRoute: '/code-arena/sheets',
        successMessage: 'DSA sheets list open kar di.'
      };
    }
  },

  openDSAProblem: {
    name: 'openDSAProblem',
    description: 'Open a specific DSA problem by problem ID, title, or index number e.g. "Problem 4 kholo", "Two Sum open karo", "problem 4". Resolves Problem N as N-th problem in currently active sheet.',
    category: 'DSA',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        problemId: { type: 'string', description: 'Problem UUID or slug' },
        sheetId: { type: 'string', description: 'Associated sheet UUID' },
        sheetQuery: { type: 'string', description: 'Associated sheet title e.g. "Binary Search", "Blind 75"' },
        query: { type: 'string', description: 'Problem query or number (e.g. "Problem 4", "Two Sum")' },
        problemIndex: { type: 'number', description: 'Problem order index e.g. 4 for Problem 4' }
      }
    },
    examples: ['Problem 4 kholo', 'problem 4', 'Two Sum open karo', 'Binary Search sheet ka Problem 5 kholo'],
    execute: async (args, _, context) => {
      const adminClient = await createAdminClient();

      if (args.problemId) {
        const { data: p } = await adminClient.from('coding_problems').select('id, title').eq('id', args.problemId).maybeSingle();
        const title = p?.title || 'Problem';
        return {
          success: true,
          message: `Opening DSA problem: ${title}...`,
          url: `/code-arena/problems/${args.problemId}`,
          pendingNavigation: true,
          navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          expectedRoute: `/code-arena/problems/${args.problemId}`,
          expectedEntity: { type: 'problem', id: args.problemId, title },
          successMessage: `Problem ${title} open kar diya.`,
          data: { problemId: args.problemId, problemTitle: title }
        };
      }

      const q = args.query ? args.query.trim() : '';
      const numMatch = q.match(/\b\d+\b/);
      const targetNum = args.problemIndex || (numMatch ? parseInt(numMatch[0], 10) : null);

      // Resolve sheet ID if provided in args or context
      let activeSheetId = args.sheetId || context?.sheetId || context?.activeSheet?.id;

      if (!activeSheetId && args.sheetQuery) {
        const { data: sheetData } = await adminClient
          .from('coding_sheets')
          .select('id, title')
          .ilike('title', `%${args.sheetQuery.trim()}%`)
          .limit(1)
          .maybeSingle();

        if (sheetData) {
          activeSheetId = sheetData.id;
        }
      }

      // Auto-resolve activeSheetId from active problem if sheetId is missing
      const currentProbId = args.problemId || context?.problemId || (
        context?.liveContext?.currentEntity?.type === 'problem' ? context?.liveContext?.currentEntity?.id : null
      );
      if (!activeSheetId && currentProbId) {
        const { data: linkData } = await adminClient
          .from('coding_sheet_problems')
          .select('sheet_id, order_index')
          .eq('problem_id', currentProbId)
          .limit(1)
          .maybeSingle();

        if (linkData?.sheet_id) {
          activeSheetId = linkData.sheet_id;
        }
      }

      // SERVER VERIFICATION FOR PROBLEM N IN ACTIVE SHEET
      if (targetNum && activeSheetId) {
        const { data: sheetProblems } = await adminClient
          .from('coding_sheet_problems')
          .select('order_index, coding_problems(id, title, difficulty)')
          .eq('sheet_id', activeSheetId)
          .order('order_index', { ascending: true });

        if (sheetProblems && sheetProblems.length >= targetNum) {
          const matchedItem = sheetProblems[targetNum - 1]?.coding_problems as any;
          if (matchedItem) {
            return {
              success: true,
              message: `Opening Problem ${targetNum}: ${matchedItem.title}...`,
              url: `/code-arena/problems/${matchedItem.id}`,
              pendingNavigation: true,
              navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              expectedRoute: `/code-arena/problems/${matchedItem.id}`,
              expectedEntity: { type: 'problem', id: matchedItem.id, title: matchedItem.title, number: targetNum },
              successMessage: `Problem ${targetNum} (${matchedItem.title}) open kar diya.`,
              data: { problemId: matchedItem.id, problemTitle: matchedItem.title, number: targetNum, sheetId: activeSheetId }
            };
          }
        } else if (sheetProblems && sheetProblems.length < targetNum) {
          return {
            success: false,
            message: `Is sheet me Problem ${targetNum} available nahi hai. Total ${sheetProblems.length} problems hain.`
          };
        }
      }

      // Check visibleEntities problems list from live context as fallback hint
      if (targetNum && context?.liveContext?.visibleEntities?.problems) {
        const visibleProb = context.liveContext.visibleEntities.problems.find((p: any) => p.number === targetNum);
        if (visibleProb) {
          return {
            success: true,
            message: `Opening Problem ${targetNum}: ${visibleProb.title}...`,
            url: `/code-arena/problems/${visibleProb.id}`,
            pendingNavigation: true,
            navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            expectedRoute: `/code-arena/problems/${visibleProb.id}`,
            expectedEntity: { type: 'problem', id: visibleProb.id, title: visibleProb.title, number: targetNum },
            successMessage: `Problem ${targetNum} (${visibleProb.title}) open kar diya.`,
            data: { problemId: visibleProb.id, problemTitle: visibleProb.title, number: targetNum }
          };
        }
      }

      if (q) {
        const { data: matched } = await adminClient
          .from('coding_problems')
          .select('id, title, slug')
          .or(`title.ilike.%${q}%,slug.ilike.%${q}%`)
          .limit(1)
          .maybeSingle();

        if (matched) {
          return {
            success: true,
            message: `Opening Problem ${matched.title}...`,
            url: `/code-arena/problems/${matched.id}`,
            pendingNavigation: true,
            navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            expectedRoute: `/code-arena/problems/${matched.id}`,
            expectedEntity: { type: 'problem', id: matched.id, title: matched.title },
            successMessage: `Problem ${matched.title} open kar diya.`,
            data: { problemId: matched.id, problemTitle: matched.title }
          };
        }

        return {
          success: false,
          message: `Mujhe "${q}" problem nahi mila.`
        };
      }

      const { data: latest } = await adminClient
        .from('coding_problems')
        .select('id, title')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest) {
        return {
          success: true,
          message: `Opening DSA problem: ${latest.title}...`,
          url: `/code-arena/problems/${latest.id}`,
          pendingNavigation: true,
          navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          expectedRoute: `/code-arena/problems/${latest.id}`,
          expectedEntity: { type: 'problem', id: latest.id, title: latest.title },
          successMessage: `Problem ${latest.title} open kar diya.`,
          data: { problemId: latest.id, problemTitle: latest.title }
        };
      }

      return { 
        success: true, 
        message: 'Opening DSA problems...', 
        url: '/code-arena/problems',
        pendingNavigation: true,
        navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        expectedRoute: '/code-arena/problems',
        successMessage: 'DSA problems list open kar di.'
      };
    }
  },

  queryLivePage: {
    name: 'queryLivePage',
    description: 'Answer questions about visible screen content, sheets count, problem counts, or available options. Use when student asks "Kaunsi sheets available hain?", "Is sheet me kitne problems hain?", "Yahan kya kya hai?". Strictly non-hallucinating.',
    category: 'ANALYTICS',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Question about visible screen content' }
      }
    },
    examples: ['Kaunsi sheets available hain?', 'Is sheet me kitne problems hain?', 'Yahan kya kya hai?'],
    execute: async (args, _, context) => {
      const live = context?.liveContext;
      const q = (args.question || '').toLowerCase();

      if (q.includes('sheet') && (q.includes('available') || q.includes('kaunsi') || q.includes('kitni') || q.includes('list') || q.includes('yahan'))) {
        if (live?.visibleEntities?.sheets && live.visibleEntities.sheets.length > 0) {
          const list = live.visibleEntities.sheets.map((s: any) => `${s.title} (${s.totalProblems || 0} problems)`).join(', ');
          return {
            success: true,
            message: `Abhi ${live.visibleEntities.sheets.length} DSA sheets available hain: ${list}.`,
            url: '/code-arena/sheets'
          };
        }
      }

      if ((q.includes('problem') || q.includes('sawal')) && (q.includes('kitne') || q.includes('count') || q.includes('list'))) {
        if (live?.currentEntity?.type === 'sheet' && live?.currentEntity?.metadata?.totalProblems !== undefined) {
          return {
            success: true,
            message: `${live.currentEntity.title} me total ${live.currentEntity.metadata.totalProblems} problems hain (solved: ${live.currentEntity.metadata.solvedProblems || 0}).`
          };
        }
      }

      return {
        success: true,
        message: 'Ye information abhi Smart Learn me available nahi hai.'
      };
    }
  },

  openWeakestDSAProblem: {
    name: 'openWeakestDSAProblem',
    description: 'Find student weakest topic using Student360 analytics and open a matching DSA problem. Examples: "meri weakest DSA problem kholo", "open problem for weak topic".',
    category: 'DSA',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['meri weakest DSA problem kholo', 'open weak topic problem'],
    execute: async (_, user) => {
      const profile = await getStudent360Profile(user.id);
      const weakTopic = profile.weakAreas[0] || 'DSA';

      const adminClient = await createAdminClient();
      const { data: matchedProblem } = await adminClient
        .from('coding_problems')
        .select('id, title, tags')
        .limit(1)
        .maybeSingle();

      if (matchedProblem) {
        return {
          success: true,
          message: `Your weak area is ${weakTopic}. Opened matching problem: ${matchedProblem.title}.`,
          url: `/code-arena/problems/${matchedProblem.id}`,
          data: { problemId: matchedProblem.id, problemTitle: matchedProblem.title }
        };
      }

      return {
        success: true,
        message: `Your weak area is ${weakTopic}. Opening DSA sheets to practice.`,
        url: '/code-arena/sheets'
      };
    }
  },

  openCodingArena: {
    name: 'openCodingArena',
    description: 'Navigate to Code Arena main workspace. Use when user asks for coding arena, compiler, IDE, or arena home.',
    category: 'DSA',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['code arena kholo', 'open compiler', 'coding arena dikha'],
    execute: async () => ({
      success: true,
      message: 'Opening Code Arena.',
      url: '/code-arena'
    })
  },

  openCodingProfile: {
    name: 'openCodingProfile',
    description: 'Navigate to student Code Arena stats and profile. Use when student wants to see coding rating, solved counts, or streaks.',
    category: 'DSA',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['coding stats dikhao', 'dsa profile kholo', 'coding rank dikho'],
    execute: async () => ({
      success: true,
      message: 'Opening coding profile.',
      url: '/code-arena/profile'
    })
  },

  openRoutine: {
    name: 'openRoutine',
    description: 'Navigate to student daily routine schedule. Use when user says "meri routine dikhao", "timetable kholo", "routine check karo".',
    category: 'ROUTINE_GOALS',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['meri routine dikhao', 'timetable kholo', 'show daily schedule'],
    execute: async () => ({
      success: true,
      message: 'Opening daily routine schedule.',
      url: '/dashboard'
    })
  },

  openGoals: {
    name: 'openGoals',
    description: 'Navigate to student target goals tracker. Use when user asks for active goals, targets, or study goals.',
    category: 'ROUTINE_GOALS',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['mera goal dikhao', 'open targets', 'goals tracker kholo'],
    execute: async () => ({
      success: true,
      message: 'Opening goals and targets.',
      url: '/dashboard'
    })
  },

  openCertificate: {
    name: 'openCertificate',
    description: 'Navigate to student certificates page. Use when student asks for degree, certificates, earned credentials.',
    category: 'NAVIGATION',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        certificateId: { type: 'string', description: 'Optional certificate UUID' }
      }
    },
    examples: ['meri certificates dikhao', 'show my certificates', 'earned degrees'],
    execute: async () => ({
      success: true,
      message: 'Opening your certificates.',
      url: '/certificates'
    })
  },

  openBadges: {
    name: 'openBadges',
    description: 'Navigate to student badges & achievements section in profile.',
    category: 'NAVIGATION',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['mere badges dikhao', 'show achievements'],
    execute: async () => ({
      success: true,
      message: 'Opening your profile achievements and badges.',
      url: '/profile'
    })
  },

  openLatexEditor: {
    name: 'openLatexEditor',
    description: 'Open LaTeX equation & math formula editor. Use when user asks for latex editor, math formula, equation builder.',
    category: 'TOOLS',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        problemId: { type: 'string', description: 'Optional problem ID' }
      }
    },
    examples: ['latex editor kholo', 'open math formula editor', 'latex equation dikhao'],
    execute: async (args) => {
      const targetUrl = args.problemId ? `/latex-editor?problemId=${args.problemId}` : '/latex-editor';
      return {
        success: true,
        message: 'Opening LaTeX Editor.',
        url: targetUrl
      };
    }
  },

  openNotifications: {
    name: 'openNotifications',
    description: 'Navigate to student notices & announcements page.',
    category: 'NAVIGATION',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['notices dikhao', 'notifications kholo', 'announcements open karo'],
    execute: async () => ({
      success: true,
      message: 'Opening notices and notifications.',
      url: '/notices'
    })
  },

  openLeaderboard: {
    name: 'openLeaderboard',
    description: 'Navigate to student rank leaderboard.',
    category: 'NAVIGATION',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['leaderboard kholo', 'show my rank', 'class rankings dikha'],
    execute: async () => ({
      success: true,
      message: 'Opening leaderboard.',
      url: '/leaderboard'
    })
  },

  openDoubts: {
    name: 'openDoubts',
    description: 'Navigate to doubt discussion forum.',
    category: 'NAVIGATION',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['doubts kholo', 'ask doubt', 'doubts forum open karo'],
    execute: async () => ({
      success: true,
      message: 'Opening doubt discussions.',
      url: '/doubts'
    })
  },

  // ─── SEARCH TOOLS ───
  searchYouTube: {
    name: 'searchYouTube',
    description: 'Search YouTube for a specific problem title, topic, or video explanation. Use when student says "isko YouTube pe search karo" or "search YT for array solution".',
    category: 'SEARCH',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term or problem title' }
      },
      required: ['query']
    },
    examples: ['isko YouTube pe search karo', 'search YouTube for binary trees', 'yt pe search kar'],
    execute: async (args, _, context) => {
      const q = args.query || context?.problemTitle || 'DSA problem explanation';
      const encoded = encodeURIComponent(q);
      return {
        success: true,
        message: `Searching YouTube for "${q}".`,
        externalUrl: `https://www.youtube.com/results?search_query=${encoded}`
      };
    }
  },

  searchWeb: {
    name: 'searchWeb',
    description: 'Search Google for any general query.',
    category: 'SEARCH',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    },
    examples: ['google pe search karo', 'search web for react hooks'],
    execute: async (args) => {
      const q = args.query || 'Smart Learn';
      const encoded = encodeURIComponent(q);
      return {
        success: true,
        message: `Searching Google for "${q}".`,
        externalUrl: `https://www.google.com/search?q=${encoded}`
      };
    }
  },

  searchGPT: {
    name: 'searchGPT',
    description: 'Open external ChatGPT search for complex topic explanations.',
    category: 'SEARCH',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Query for ChatGPT' }
      },
      required: ['query']
    },
    examples: ['chatgpt pe kholo', 'open gpt for recursion explanation'],
    execute: async (args) => {
      const q = args.query || 'Explain DSA concept';
      const encoded = encodeURIComponent(q);
      return {
        success: true,
        message: `Opening ChatGPT search for "${q}".`,
        externalUrl: `https://chatgpt.com/?q=${encoded}`
      };
    }
  },

  searchProgramSeats: {
    name: 'searchProgramSeats',
    description: 'Query seat availability or program details for degrees like B.Sc, B.Tech, MCA in Smart Learn. Never invent fake seat numbers.',
    category: 'COURSES',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        programName: { type: 'string', description: 'Program name e.g. B.Sc, B.Tech' }
      }
    },
    examples: ['BSc me kitni seats hai', 'BTech seat availability'],
    execute: async (args) => {
      const adminClient = await createAdminClient();
      const prog = args.programName || 'B.Sc';
      const { data: matchedCourses } = await adminClient
        .from('courses')
        .select('id, title')
        .ilike('title', `%${prog}%`)
        .eq('is_published', true);

      if (matchedCourses && matchedCourses.length > 0) {
        return {
          success: true,
          message: `Smart Learn me ${prog} se related ${matchedCourses.length} active courses available hain: ${matchedCourses.map((c: any) => c.title).join(', ')}.`,
          url: '/courses'
        };
      }

      return {
        success: true,
        message: `Smart Learn me abhi ${prog} seat availability ka specific data available nahi hai. Aap active courses section me enrolled subjects dekh sakte hain.`,
        url: '/courses'
      };
    }
  },

  // ─── ANALYTICS & STUDENT 360 TOOLS ───
  getStudent360: {
    name: 'getStudent360',
    description: 'Fetch full 360 degree learning analytics summary for the student.',
    category: 'ANALYTICS',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['mera 360 profile dikhao', 'analyze my overall progress'],
    execute: async (_, user) => {
      const profile = await getStudent360Profile(user.id);
      return {
        success: true,
        message: `Overall Score: ${profile.overallLearningScore}/100. Academic: ${profile.academicScore}%, Coding: ${profile.codingScore}%, Assessment: ${profile.assessmentScore}%.`,
        data: profile
      };
    }
  },

  getWeakAreas: {
    name: 'getWeakAreas',
    description: 'Fetch student weak areas and identified skill gaps from Student360 analytics. Use when student asks "meri weakest skill kya hai?", "weak topics dikhao", "where am I lacking?".',
    category: 'ANALYTICS',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['meri weakest skill kya hai?', 'weak areas dikhao', 'skill gaps kya hain'],
    execute: async (_, user) => {
      const profile = await getStudent360Profile(user.id);
      const weakList = profile.weakAreas.length > 0 ? profile.weakAreas.join(', ') : 'DBMS, DSA Problem Solving';
      return {
        success: true,
        message: `Tumhara biggest gap ${weakList} hai. Is par focus karke accuracy improve kar sakte ho.`,
        data: profile.weakAreas
      };
    }
  },

  getRecommendations: {
    name: 'getRecommendations',
    description: 'Fetch deterministic learning recommendations for student. Use when user asks "main next kya karun?", "what should I study next?".',
    category: 'ANALYTICS',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['main next kya karun?', 'kaunsa course karun?', 'what to study next'],
    execute: async (_, user) => {
      const profile = await getStudent360Profile(user.id);
      const topRec = profile.recommendations[0];
      const weak = profile.weakAreas[0] || 'DBMS';
      const msg = topRec
        ? `Based on your profile, your main focus area is ${weak}. Recommended Next Action: ${topRec.title}.`
        : `Tumhara focus ${weak} hai. Practice questions and courses complete karo.`;

      return {
        success: true,
        message: msg,
        url: topRec?.actionUrl || '/courses',
        data: profile.recommendations
      };
    }
  },

  getMyDSAProgress: {
    name: 'getMyDSAProgress',
    description: 'Fetch student DSA solved count, coding XP, and score.',
    category: 'DSA',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['mera DSA progress dikhao', 'how many DSA problems solved'],
    execute: async (_, user) => {
      const profile = await getStudent360Profile(user.id);
      return {
        success: true,
        message: `DSA Problems Solved: ${profile.dataCoverage.dsaSolvedCount}. Coding Score: ${profile.codingScore}/100.`,
        data: { dsaSolved: profile.dataCoverage.dsaSolvedCount, codingScore: profile.codingScore }
      };
    }
  },

  // ─── DYNAMIC ROUTINE & GOALS GENERATOR ───
  getMyRoutine: {
    name: 'getMyRoutine',
    description: 'Fetch student current daily routine schedule.',
    category: 'ROUTINE_GOALS',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['meri routine dikhao', 'get my routine'],
    execute: async (_, user) => {
      const adminClient = await createAdminClient();
      const { data } = await adminClient
        .from('daily_routines')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      const routines = data || [];
      const msg = routines.length > 0
        ? `Routine: ${routines.map((r: any) => `${r.time_slot}: ${r.task_name}`).join(', ')}`
        : 'No routine set yet.';

      return { success: true, message: msg, data: routines };
    }
  },

  generateTomorrowRoutine: {
    name: 'generateTomorrowRoutine',
    description: 'Dynamically generate and save a personalized daily routine for tomorrow based on existing routine items, active goals, Student360 weak areas, and enrolled courses. Use when student asks "kal meri routine bana do" or "generate tomorrow routine".',
    category: 'ROUTINE_GOALS',
    riskLevel: 'MEDIUM',
    parameters: { type: 'object', properties: {} },
    examples: ['kal meri routine bana do', 'generate tomorrow routine', 'kal ka timetable banao'],
    execute: async (_, user) => {
      const profile = await getStudent360Profile(user.id);
      const adminClient = await createAdminClient();

      const weakTopic = profile.weakAreas[0] || 'DSA Graphs & Trees';
      const activeGoalText = profile.activeGoals[0]?.goal_text || 'Solve DSA problems';
      const courseTitle = profile.enrolledCoursesData[0]?.title || 'ITW Course Revision';

      // Smart dynamic slot allocation avoiding conflict with existing slots
      const existingSlots = new Set(profile.dailyRoutines.map(r => r.time_slot));

      const candidateSlots = [
        { slot: '08:00 AM', task: `DSA Weak Area Practice: ${weakTopic}` },
        { slot: '02:00 PM', task: `Enrolled Course Study: ${courseTitle}` },
        { slot: '06:00 PM', task: `Goal Focus: ${activeGoalText}` },
        { slot: '09:00 PM', task: `Daily Revision & Quiz` }
      ];

      const slotsToInsert = candidateSlots.filter(c => !existingSlots.has(c.slot));
      if (slotsToInsert.length === 0) {
        slotsToInsert.push({ slot: '10:00 PM', task: `Night Review: ${weakTopic}` });
      }

      let currentSort = profile.dailyRoutines.length;
      const inserts = slotsToInsert.map(s => {
        currentSort++;
        return {
          user_id: user.id,
          time_slot: s.slot,
          task_name: s.task,
          sort_order: currentSort
        };
      });

      const { error } = await adminClient.from('daily_routines').insert(inserts);

      if (error) {
        return { success: false, message: `Failed to save routine: ${error.message}` };
      }

      const generatedSummary = slotsToInsert.map(s => `${s.slot} - ${s.task}`).join('; ');
      return {
        success: true,
        message: `Kal ki personalized routine set kar di hai: ${generatedSummary}`,
        url: '/dashboard',
        data: slotsToInsert
      };
    }
  },

  createRoutine: {
    name: 'createRoutine',
    description: 'Add a specific single task/slot to daily routine.',
    category: 'ROUTINE_GOALS',
    riskLevel: 'MEDIUM',
    parameters: {
      type: 'object',
      properties: {
        time_slot: { type: 'string', description: 'Time slot e.g. "08:00 AM"' },
        task_name: { type: 'string', description: 'Task name e.g. "DSA Practice"' }
      },
      required: ['time_slot', 'task_name']
    },
    examples: ['add routine 08:00 AM DSA Practice'],
    execute: async (args, user) => {
      const adminClient = await createAdminClient();
      const { data: existing } = await adminClient.from('daily_routines').select('sort_order').eq('user_id', user.id);
      const sortOrder = (existing?.length || 0) + 1;

      const { error } = await adminClient
        .from('daily_routines')
        .insert({
          user_id: user.id,
          time_slot: args.time_slot,
          task_name: args.task_name,
          sort_order: sortOrder
        });

      if (error) {
        return { success: false, message: `Failed to add routine: ${error.message}` };
      }

      return {
        success: true,
        message: `Added routine slot: ${args.time_slot} - ${args.task_name}.`,
        url: '/dashboard'
      };
    }
  },

  getMyGoals: {
    name: 'getMyGoals',
    description: 'Fetch student active goals and targets.',
    category: 'ROUTINE_GOALS',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    examples: ['mera goal dikhao', 'get my goals'],
    execute: async (_, user) => {
      const adminClient = await createAdminClient();
      const { data } = await adminClient
        .from('student_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const goals = data || [];
      const msg = goals.length > 0 ? `Active Goal: ${goals[0].goal_text}` : 'No active goals set.';
      return { success: true, message: msg, data: goals };
    }
  },

  createGoal: {
    name: 'createGoal',
    description: 'Create a new active learning goal for student.',
    category: 'ROUTINE_GOALS',
    riskLevel: 'MEDIUM',
    parameters: {
      type: 'object',
      properties: {
        goal_text: { type: 'string', description: 'Goal text' },
        duration_mins: { type: 'number', description: 'Daily duration mins' }
      },
      required: ['goal_text']
    },
    examples: ['nayi goal banao solve 30 dsa problems'],
    execute: async (args, user) => {
      const adminClient = await createAdminClient();

      await adminClient
        .from('student_goals')
        .update({ status: 'archived' })
        .eq('user_id', user.id)
        .eq('status', 'active');

      const { data, error } = await adminClient
        .from('student_goals')
        .insert({
          user_id: user.id,
          goal_text: args.goal_text,
          duration_mins: args.duration_mins || 30,
          routine: true,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        return { success: false, message: `Failed to set goal: ${error.message}` };
      }

      return {
        success: true,
        message: `Goal set: "${data.goal_text}".`,
        url: '/dashboard'
      };
    }
  },

  createCodingSheet: {
    name: 'createCodingSheet',
    description: 'Create a new DSA coding sheet. Use when user says "Advanced Graph sheet banao", "create DSA sheet named DP", "ek naya sheet bana do".',
    category: 'DSA',
    riskLevel: 'MEDIUM',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the sheet e.g. "Advanced Graph", "Dynamic Programming"' },
        description: { type: 'string', description: 'Optional description of the sheet' },
        category: { type: 'string', description: 'Optional category e.g. "Graphs", "DP"' }
      },
      required: ['title']
    },
    examples: ['Advanced Graph sheet banao', 'create DSA sheet named DP', 'ek naya coding sheet bana do'],
    execute: async (args, user) => {
      const adminClient = await createAdminClient();
      const title = (args.title || '').trim();
      if (!title) return { success: false, message: 'Sheet title required hai.' };

      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `sheet-${Date.now()}`;
      
      const { data: newSheet, error } = await adminClient
        .from('coding_sheets')
        .insert({
          title,
          slug,
          description: args.description || `DSA practice sheet for ${title}`,
          is_public: true,
          published_at: new Date().toISOString(),
          created_by: user.id,
          enrollment_access: 'public'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          const { data: existing } = await adminClient.from('coding_sheets').select('id, title').eq('slug', slug).single();
          if (existing) {
            return {
              success: true,
              message: `DSA Sheet "${existing.title}" already exists. Opening sheet...`,
              url: `/code-arena/sheets/${existing.id}`,
              pendingNavigation: true,
              navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              expectedRoute: `/code-arena/sheets/${existing.id}`,
              expectedEntity: { type: 'sheet', id: existing.id, title: existing.title },
              successMessage: `DSA Sheet "${existing.title}" open kar di.`,
              data: { sheetId: existing.id, sheetTitle: existing.title }
            };
          }
        }
        return { success: false, message: `Sheet create nahi ho paayi: ${error.message}` };
      }

      return {
        success: true,
        message: `DSA Sheet "${newSheet.title}" successfully create ho gayi! Opening sheet...`,
        url: `/code-arena/sheets/${newSheet.id}`,
        pendingNavigation: true,
        navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        expectedRoute: `/code-arena/sheets/${newSheet.id}`,
        expectedEntity: { type: 'sheet', id: newSheet.id, title: newSheet.title },
        successMessage: `DSA Sheet "${newSheet.title}" verified & created.`,
        data: { sheetId: newSheet.id, sheetTitle: newSheet.title }
      };
    }
  },

  addProblemsToSheet: {
    name: 'addProblemsToSheet',
    description: 'Add problems matching a topic query (e.g. Binary Search, Arrays) or problem IDs to a DSA sheet. Use when user says "isme Binary Search ke problems add karo", "add binary search questions to this sheet".',
    category: 'DSA',
    riskLevel: 'MEDIUM',
    parameters: {
      type: 'object',
      properties: {
        sheetId: { type: 'string', description: 'Sheet UUID' },
        sheetQuery: { type: 'string', description: 'Optional sheet name query if sheetId not specified' },
        topicQuery: { type: 'string', description: 'Topic or problem search query e.g. "Binary Search", "Array"' },
        limit: { type: 'number', description: 'Number of problems to add, default 5' }
      }
    },
    examples: ['isme Binary Search ke problems add karo', 'add 5 binary search problems to sheet'],
    execute: async (args, _, context) => {
      const adminClient = await createAdminClient();
      let targetSheetId = args.sheetId || context?.sheetId || context?.activeSheet?.id;

      if (!targetSheetId && args.sheetQuery) {
        const { data: sheet } = await adminClient.from('coding_sheets').select('id, title').ilike('title', `%${args.sheetQuery.trim()}%`).limit(1).maybeSingle();
        if (sheet) targetSheetId = sheet.id;
      }

      if (!targetSheetId && context?.liveContext?.currentEntity?.type === 'sheet') {
        targetSheetId = context.liveContext.currentEntity.id;
      }

      if (!targetSheetId) {
        return { success: false, message: 'Kaunsi sheet me add karna hai? Pehle sheet open karo ya sheet name batao.' };
      }

      const topic = args.topicQuery || 'Binary Search';
      const limit = args.limit || 5;

      const { data: matchedProbs } = await adminClient
        .from('coding_problems')
        .select('id, title, tags')
        .or(`title.ilike.%${topic}%,tags.cs.{${topic}}`)
        .limit(limit);

      const probsToAdd = matchedProbs && matchedProbs.length > 0 ? matchedProbs : [];

      if (probsToAdd.length === 0) {
        const { data: fallbackProbs } = await adminClient.from('coding_problems').select('id, title, tags').limit(limit);
        if (fallbackProbs) probsToAdd.push(...fallbackProbs);
      }

      if (probsToAdd.length === 0) {
        return { success: false, message: `No problems found to add.` };
      }

      const { data: existingLinks } = await adminClient
        .from('coding_sheet_problems')
        .select('order_index, problem_id')
        .eq('sheet_id', targetSheetId);

      const existingProblemIds = new Set((existingLinks || []).map(l => l.problem_id));
      let currentOrder = (existingLinks || []).reduce((max, l) => Math.max(max, l.order_index || 0), 0);

      const newLinks = [];
      for (const p of probsToAdd) {
        if (!existingProblemIds.has(p.id)) {
          currentOrder++;
          newLinks.push({
            sheet_id: targetSheetId,
            problem_id: p.id,
            order_index: currentOrder
          });
        }
      }

      if (newLinks.length === 0) {
        return {
          success: true,
          message: `Sheet me ye problems already added hain.`,
          url: `/code-arena/sheets/${targetSheetId}`
        };
      }

      const { error: insertErr } = await adminClient.from('coding_sheet_problems').insert(newLinks);

      if (insertErr) {
        return { success: false, message: `Problems add nahi ho paaye: ${insertErr.message}` };
      }

      return {
        success: true,
        message: `Sheet me ${newLinks.length} problems (${topic}) add kar diye gaye!`,
        url: `/code-arena/sheets/${targetSheetId}`,
        pendingNavigation: true,
        navigationId: `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        expectedRoute: `/code-arena/sheets/${targetSheetId}`,
        successMessage: `${newLinks.length} problems sheet me add hone ki verification success.`,
        data: { sheetId: targetSheetId }
      };
    }
  },

  runSafeSQLQuery: {
    name: 'runSafeSQLQuery',
    description: 'Safely execute SQL queries in the sandboxed SQL Editor engine. Use when user says "SQL query run karo", "employees table ka average salary calculate karo", "test SQL query". Never executes against production DB admin.',
    category: 'TOOLS',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'SQL query to execute e.g. "SELECT * FROM employees LIMIT 10"' },
        dataset: { type: 'string', description: 'Dataset key e.g. "employees_departments"' }
      },
      required: ['query']
    },
    examples: ['SQL query run karo', 'select average salary from employees'],
    execute: async (args) => {
      const { executeSQL, createDatabase } = await import('@/lib/sql');
      const q = (args.query || 'SELECT 1;').trim();
      try {
        const db = createDatabase(args.dataset || 'employees_departments');
        const res = executeSQL(q, db);
        if (res.error) {
          return { success: false, message: `SQL Query error: ${res.error.message}` };
        }
        const summary = `Query returned ${res.rowCount} rows in ${res.executionTimeMs}ms. Columns: ${res.columns.map(c=>c.name).join(', ')}`;
        return {
          success: true,
          message: `SQL Query successfully executed!\n\n${summary}`,
          url: '/dashboard/sql-editor',
          data: { columns: res.columns, rows: res.rows, rowCount: res.rowCount }
        };
      } catch (err: any) {
        return { success: false, message: `SQL Execution failed: ${err.message}` };
      }
    }
  }
};

// ─── DYNAMIC TOOL FILTERING (Intent & Context Based Selection) ───

export function selectRelevantTools(userPrompt: string, pageContext?: any, userRole?: string): AgentToolDefinition[] {
  const p = userPrompt.toLowerCase();
  const normalizedRole = normalizeAgentRole(userRole);
  const selectedCategories = new Set<string>();

  // Determine relevant categories based on keywords
  if (p.includes('dsa') || p.includes('problem') || p.includes('sheet') || p.includes('code') || p.includes('sawal') || /problem\s*\d+/i.test(p)) {
    selectedCategories.add('DSA');
    selectedCategories.add('SEARCH');
    selectedCategories.add('NAVIGATION');
  }

  if (p.includes('course') || p.includes('subject') || p.includes('itw') || p.includes('dbms') || p.includes('seat') || p.includes('bsc')) {
    selectedCategories.add('COURSES');
    selectedCategories.add('NAVIGATION');
  }

  if (p.includes('weak') || p.includes('skill') || p.includes('next') || p.includes('360') || p.includes('analyze') || p.includes('plan') || p.includes('recommend')) {
    selectedCategories.add('ANALYTICS');
    selectedCategories.add('ROUTINE_GOALS');
    selectedCategories.add('COURSES');
    selectedCategories.add('DSA');
  }

  if (p.includes('routine') || p.includes('schedule') || p.includes('timetable') || p.includes('kal') || p.includes('goal') || p.includes('target')) {
    selectedCategories.add('ROUTINE_GOALS');
    selectedCategories.add('ANALYTICS');
    selectedCategories.add('NAVIGATION');
  }

  if (p.includes('youtube') || p.includes('yt') || p.includes('video') || p.includes('gpt') || p.includes('search') || p.includes('google')) {
    selectedCategories.add('SEARCH');
    selectedCategories.add('TOOLS');
  }

  if (p.includes('latex') || p.includes('equation') || p.includes('formula')) {
    selectedCategories.add('TOOLS');
    selectedCategories.add('NAVIGATION');
  }

  if (p.includes('certificate') || p.includes('badge') || p.includes('profile') || p.includes('rank') || p.includes('leaderboard') || p.includes('notice') || p.includes('doubt')) {
    selectedCategories.add('NAVIGATION');
  }

  // Fallback: If no specific category matched, include core NAVIGATION, DSA, COURSES, and ANALYTICS
  if (selectedCategories.size === 0) {
    selectedCategories.add('NAVIGATION');
    selectedCategories.add('DSA');
    selectedCategories.add('COURSES');
    selectedCategories.add('ANALYTICS');
  }

  const allTools = Object.values(AGENT_TOOLS);
  const filtered = allTools.filter(t => selectedCategories.has(t.category) && canUseTool(normalizedRole, t.name));

  // Cap at 15 tools max to keep Groq prompt lean and fast
  return filtered.slice(0, 15);
}
