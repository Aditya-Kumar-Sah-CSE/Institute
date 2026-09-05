import { createAdminClient, getUser } from '@/lib/supabase/server';
import { getStudent360Profile } from '@/features/analytics/services/student-intelligence';

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
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
  execute: (args: any, user: { id: string }, context?: any) => Promise<AgentToolResult>;
}

// ─── TOOL IMPLEMENTATIONS ───

export const AGENT_TOOLS: Record<string, AgentToolDefinition> = {
  openProfile: {
    name: 'openProfile',
    description: 'Navigate to the student profile page',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({
      success: true,
      message: 'Opening your profile page.',
      url: '/profile'
    })
  },

  openDashboard: {
    name: 'openDashboard',
    description: 'Navigate to the student main dashboard',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({
      success: true,
      message: 'Opening student dashboard.',
      url: '/dashboard'
    })
  },

  openDSASheets: {
    name: 'openDSASheets',
    description: 'Navigate to the DSA coding sheets listing page',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({
      success: true,
      message: 'Opening DSA sheets.',
      url: '/code-arena/sheets'
    })
  },

  openDSASheet: {
    name: 'openDSASheet',
    description: 'Open a specific DSA coding sheet by sheet ID or title',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        sheetId: { type: 'string', description: 'ID of the DSA sheet if known' },
        titleQuery: { type: 'string', description: 'Name or title query of the DSA sheet' }
      }
    },
    execute: async (args) => {
      if (args.sheetId) {
        return { success: true, message: `Opening DSA sheet.`, url: `/code-arena/sheets/${args.sheetId}` };
      }
      const adminClient = await createAdminClient();
      if (args.titleQuery) {
        const { data } = await adminClient
          .from('coding_sheets')
          .select('id, title')
          .ilike('title', `%${args.titleQuery}%`)
          .limit(1)
          .maybeSingle();

        if (data) {
          return { success: true, message: `Opening DSA Sheet: ${data.title}`, url: `/code-arena/sheets/${data.id}` };
        }
      }
      return { success: true, message: 'Opening DSA sheets list.', url: '/code-arena/sheets' };
    }
  },

  openDSAProblem: {
    name: 'openDSAProblem',
    description: 'Open a specific DSA problem by problem ID, title, or index number (e.g. Problem 4)',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        problemId: { type: 'string', description: 'Problem UUID or slug if available' },
        query: { type: 'string', description: 'Problem title or query (e.g. "Problem 4", "Two Sum")' }
      }
    },
    execute: async (args) => {
      const adminClient = await createAdminClient();

      if (args.problemId) {
        return { success: true, message: `Opening DSA problem.`, url: `/code-arena/problems/${args.problemId}` };
      }

      const q = args.query ? args.query.trim() : '';
      if (q) {
        // Search by exact ID or title or slug
        const { data: matched } = await adminClient
          .from('coding_problems')
          .select('id, title, slug')
          .or(`title.ilike.%${q}%,slug.ilike.%${q}%`)
          .limit(1)
          .maybeSingle();

        if (matched) {
          return { success: true, message: `Opening problem: ${matched.title}`, url: `/code-arena/problems/${matched.id}` };
        }
      }

      // Default fallback: fetch latest problem
      const { data: latest } = await adminClient
        .from('coding_problems')
        .select('id, title')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest) {
        return { success: true, message: `Opening DSA problem: ${latest.title}`, url: `/code-arena/problems/${latest.id}` };
      }

      return { success: true, message: 'Opening DSA problems.', url: '/code-arena/problems' };
    }
  },

  openWeakestDSAProblem: {
    name: 'openWeakestDSAProblem',
    description: 'Find and open a DSA problem related to the student weakest topic or skill gap',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
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
          url: `/code-arena/problems/${matchedProblem.id}`
        };
      }

      return {
        success: true,
        message: `Your weak area is ${weakTopic}. Opening DSA sheets to practice.`,
        url: '/code-arena/sheets'
      };
    }
  },

  openCourse: {
    name: 'openCourse',
    description: 'Open a specific course by course ID or course title (e.g. ITW, DBMS, Web Dev)',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'Course UUID if known' },
        courseName: { type: 'string', description: 'Title or abbreviation of course (e.g. "ITW", "DBMS")' }
      }
    },
    execute: async (args) => {
      if (args.courseId) {
        return { success: true, message: 'Opening course.', url: `/courses/${args.courseId}` };
      }
      const adminClient = await createAdminClient();
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
          return { success: true, message: `Opening course: ${matched.title}`, url: `/courses/${matched.id}` };
        }
      }

      return { success: true, message: 'Opening courses catalog.', url: '/courses' };
    }
  },

  openMyCourses: {
    name: 'openMyCourses',
    description: 'Navigate to student enrolled courses',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({
      success: true,
      message: 'Opening your courses.',
      url: '/courses'
    })
  },

  openCertificate: {
    name: 'openCertificate',
    description: 'Open student certificates page or specific certificate',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        certificateId: { type: 'string', description: 'Certificate ID if known' }
      }
    },
    execute: async () => ({
      success: true,
      message: 'Opening your certificates.',
      url: '/certificates'
    })
  },

  openCodingProfile: {
    name: 'openCodingProfile',
    description: 'Open student Code Arena profile and activity stats',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({
      success: true,
      message: 'Opening coding profile.',
      url: '/code-arena/profile'
    })
  },

  openLatexEditor: {
    name: 'openLatexEditor',
    description: 'Open the LaTeX equation and document editor',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        problemId: { type: 'string', description: 'Optional current problem ID' }
      }
    },
    execute: async (args) => {
      const targetUrl = args.problemId ? `/latex-editor?problemId=${args.problemId}` : '/latex-editor';
      return {
        success: true,
        message: 'Opening LaTeX Editor.',
        url: targetUrl
      };
    }
  },

  openGoals: {
    name: 'openGoals',
    description: 'Open student target tracker / goals section',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({
      success: true,
      message: 'Opening goals and targets.',
      url: '/dashboard'
    })
  },

  openRoutine: {
    name: 'openRoutine',
    description: 'Open student daily routine schedule',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({
      success: true,
      message: 'Opening daily routine schedule.',
      url: '/dashboard'
    })
  },

  openNotifications: {
    name: 'openNotifications',
    description: 'Open student notices and notifications',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({
      success: true,
      message: 'Opening notices and notifications.',
      url: '/notices'
    })
  },

  openLeaderboard: {
    name: 'openLeaderboard',
    description: 'Open student leaderboard and rankings',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({
      success: true,
      message: 'Opening leaderboard.',
      url: '/leaderboard'
    })
  },

  openDoubts: {
    name: 'openDoubts',
    description: 'Open student doubt discussion hub',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({
      success: true,
      message: 'Opening doubt discussions.',
      url: '/doubts'
    })
  },

  openCodingArena: {
    name: 'openCodingArena',
    description: 'Open Code Arena main page',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({
      success: true,
      message: 'Opening Code Arena.',
      url: '/code-arena'
    })
  },

  searchProgramSeats: {
    name: 'searchProgramSeats',
    description: 'Query seat availability or program details for degrees like B.Sc, B.Tech, MCA, etc.',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        programName: { type: 'string', description: 'Degree or program name e.g. B.Sc, B.Tech' }
      }
    },
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

  // ─── SEARCH TOOLS ───

  searchYouTube: {
    name: 'searchYouTube',
    description: 'Search YouTube for a topic, problem, or explanation',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term or problem title' }
      },
      required: ['query']
    },
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
    description: 'Perform a web search for a topic',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    },
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
    description: 'Open external AI search/GPT with a query',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Query for GPT' }
      },
      required: ['query']
    },
    execute: async (args) => {
      const q = args.query || 'Explain DSA problem';
      const encoded = encodeURIComponent(q);
      return {
        success: true,
        message: `Opening ChatGPT search for "${q}".`,
        externalUrl: `https://chatgpt.com/?q=${encoded}`
      };
    }
  },

  // ─── LEARNING & ANALYTICS ───

  getMyLearningIntelligence: {
    name: 'getMyLearningIntelligence',
    description: 'Get high-level Student 360 readiness scores, strengths, and weak areas',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async (_, user) => {
      const profile = await getStudent360Profile(user.id);
      return {
        success: true,
        message: `Learning Readiness: ${profile.overallLearningScore}/100. Strengths: ${profile.strengths.join(', ')}. Weak Areas: ${profile.weakAreas.join(', ')}.`,
        data: profile
      };
    }
  },

  getMyWeakAreas: {
    name: 'getMyWeakAreas',
    description: 'Get list of student weak areas and identified skill gaps',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async (_, user) => {
      const profile = await getStudent360Profile(user.id);
      return {
        success: true,
        message: `Weak Areas: ${profile.weakAreas.join(', ') || 'None identified yet.'}`,
        data: profile.weakAreas
      };
    }
  },

  getMyRecommendations: {
    name: 'getMyRecommendations',
    description: 'Get top deterministic recommendations for student',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async (_, user) => {
      const profile = await getStudent360Profile(user.id);
      return {
        success: true,
        message: profile.nextBestAction ? `Next Action: ${profile.nextBestAction.title}` : 'No active recommendations.',
        data: profile.recommendations
      };
    }
  },

  getMyDSAProgress: {
    name: 'getMyDSAProgress',
    description: 'Get student DSA problem solving statistics and score',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async (_, user) => {
      const profile = await getStudent360Profile(user.id);
      return {
        success: true,
        message: `DSA Problems Solved: ${profile.dataCoverage.dsaSolvedCount}. Coding Score: ${profile.codingScore}/100.`,
        data: { dsaSolved: profile.dataCoverage.dsaSolvedCount, codingScore: profile.codingScore }
      };
    }
  },

  getMyCourseProgress: {
    name: 'getMyCourseProgress',
    description: 'Get enrolled courses and completion progress',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async (_, user) => {
      const profile = await getStudent360Profile(user.id);
      return {
        success: true,
        message: `Enrolled Courses: ${profile.enrolledCoursesData.map(c => `${c.title} (${c.progress}%)`).join(', ') || 'None'}`,
        data: profile.enrolledCoursesData
      };
    }
  },

  // ─── ROUTINE & GOALS CRUD ───

  getMyRoutine: {
    name: 'getMyRoutine',
    description: 'Fetch current daily routine schedule of the student',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
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

  createRoutine: {
    name: 'createRoutine',
    description: 'Add a new time slot / task to student daily routine',
    riskLevel: 'MEDIUM',
    parameters: {
      type: 'object',
      properties: {
        time_slot: { type: 'string', description: 'Time slot e.g. "08:00", "18:00"' },
        task_name: { type: 'string', description: 'Task description e.g. "DSA Practice"' }
      },
      required: ['time_slot', 'task_name']
    },
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
        return { success: false, message: `Failed to create routine: ${error.message}` };
      }

      return {
        success: true,
        message: `Added routine: ${args.time_slot} - ${args.task_name}.`,
        url: '/dashboard'
      };
    }
  },

  deleteRoutine: {
    name: 'deleteRoutine',
    description: 'Delete student daily routine schedule',
    riskLevel: 'HIGH',
    parameters: {
      type: 'object',
      properties: {
        confirm: { type: 'string', description: 'Explicit confirmation flag' }
      }
    },
    execute: async (args, user) => {
      if (args.confirm !== 'true') {
        return {
          success: false,
          message: 'Confirmation required before deleting routine.',
          requiresConfirmation: {
            toolName: 'deleteRoutine',
            args: { confirm: 'true' },
            promptMessage: 'Are you sure you want to clear your daily routine schedule?'
          }
        };
      }

      const adminClient = await createAdminClient();
      const { error } = await adminClient.from('daily_routines').delete().eq('user_id', user.id);

      if (error) {
        return { success: false, message: `Failed to delete routine: ${error.message}` };
      }

      return { success: true, message: 'Daily routine successfully deleted.', url: '/dashboard' };
    }
  },

  getMyGoals: {
    name: 'getMyGoals',
    description: 'Fetch student active targets and goals',
    riskLevel: 'LOW',
    parameters: { type: 'object', properties: {} },
    execute: async (_, user) => {
      const adminClient = await createAdminClient();
      const { data } = await adminClient
        .from('student_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const goals = data || [];
      const msg = goals.length > 0
        ? `Active Goal: ${goals[0].goal_text}`
        : 'No active goals set.';

      return { success: true, message: msg, data: goals };
    }
  },

  createGoal: {
    name: 'createGoal',
    description: 'Create a new active learning goal for student',
    riskLevel: 'MEDIUM',
    parameters: {
      type: 'object',
      properties: {
        goal_text: { type: 'string', description: 'Goal text e.g. "Solve 50 DSA problems in 30 days"' },
        duration_mins: { type: 'number', description: 'Target daily duration in minutes' },
        routine: { type: 'boolean', description: 'Link as daily routine goal' }
      },
      required: ['goal_text']
    },
    execute: async (args, user) => {
      const adminClient = await createAdminClient();

      // Archive previous active goals
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
          routine: Boolean(args.routine),
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

  deleteGoal: {
    name: 'deleteGoal',
    description: 'Delete or archive an active student goal',
    riskLevel: 'HIGH',
    parameters: {
      type: 'object',
      properties: {
        confirm: { type: 'string', description: 'Explicit confirmation flag' }
      }
    },
    execute: async (args, user) => {
      if (args.confirm !== 'true') {
        return {
          success: false,
          message: 'Confirmation required before deleting active goal.',
          requiresConfirmation: {
            toolName: 'deleteGoal',
            args: { confirm: 'true' },
            promptMessage: 'Are you sure you want to remove your active goal?'
          }
        };
      }

      const adminClient = await createAdminClient();
      const { error } = await adminClient
        .from('student_goals')
        .update({ status: 'archived' })
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) {
        return { success: false, message: `Failed to remove goal: ${error.message}` };
      }

      return { success: true, message: 'Goal removed.', url: '/dashboard' };
    }
  }
};
