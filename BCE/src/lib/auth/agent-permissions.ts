export type AppRole = 'guest' | 'student' | 'instructor' | 'admin' | 'developer' | 'superadmin';

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  guest: 0,
  student: 1,
  instructor: 2,
  admin: 3,
  developer: 3,
  superadmin: 4,
};

/**
 * Standardize raw role string from Supabase profile / Auth metadata into AppRole.
 */
export function normalizeAgentRole(rawRole?: unknown): AppRole {
  if (!rawRole) return 'guest';
  const roleStr = String(rawRole).trim().toLowerCase();
  if (!roleStr || roleStr === 'guest' || roleStr === 'public' || roleStr === 'anon') {
    return 'guest';
  }
  if (
    roleStr === 'superadmin' || 
    roleStr === 'super_admin' || 
    roleStr === 'platform_owner' || 
    roleStr === 'root_admin'
  ) {
    return 'superadmin';
  }
  if (roleStr === 'developer') {
    return 'developer';
  }
  if (roleStr === 'admin') {
    return 'admin';
  }
  if (roleStr === 'instructor' || roleStr === 'faculty' || roleStr === 'teacher') {
    return 'instructor';
  }
  return 'student';
}

/**
 * Page permission mappings to minimum required AppRole.
 */
export const PAGE_PERMISSIONS: Array<{ prefix: string; minRole: AppRole }> = [
  // Superadmin routes
  { prefix: '/super-admin', minRole: 'superadmin' },

  // Developer routes
  { prefix: '/developer', minRole: 'developer' },

  // Admin routes
  { prefix: '/admin', minRole: 'admin' },

  // Instructor / Faculty routes
  { prefix: '/instructor', minRole: 'instructor' },

  // Student / Authenticated user routes
  { prefix: '/dashboard', minRole: 'student' },
  { prefix: '/courses', minRole: 'student' },
  { prefix: '/code-arena', minRole: 'student' },
  { prefix: '/dsa', minRole: 'student' },
  { prefix: '/profile', minRole: 'student' },
  { prefix: '/leaderboard', minRole: 'student' },
  { prefix: '/doubts', minRole: 'student' },
  { prefix: '/feedbacks', minRole: 'student' },
  { prefix: '/goals', minRole: 'student' },
  { prefix: '/activity', minRole: 'student' },
  { prefix: '/roadmap', minRole: 'student' },
  { prefix: '/latex-editor', minRole: 'student' },
  { prefix: '/certificates', minRole: 'student' },
  { prefix: '/notices', minRole: 'student' },
  { prefix: '/games', minRole: 'student' },
  { prefix: '/share-doubt', minRole: 'student' },
  { prefix: '/batch', minRole: 'student' },
  { prefix: '/users', minRole: 'student' },

  // Public routes (accessible to guests)
  { prefix: '/', minRole: 'guest' },
  { prefix: '/login', minRole: 'guest' },
  { prefix: '/signup', minRole: 'guest' },
  { prefix: '/privacy', minRole: 'guest' },
  { prefix: '/terms', minRole: 'guest' },
  { prefix: '/verify-email', minRole: 'guest' },
  { prefix: '/apply-instructor', minRole: 'guest' },
  { prefix: '/pwa-start', minRole: 'guest' },
  { prefix: '/share', minRole: 'guest' },
  { prefix: '/sheets', minRole: 'guest' },
  { prefix: '/verify', minRole: 'guest' },
];

/**
 * Tool permission mappings to minimum required AppRole.
 */
export const TOOL_PERMISSIONS: Record<string, AppRole> = {
  // Universal read & interaction tools (accessible to ALL roles)
  searchWeb: 'guest',
  searchYouTube: 'guest',
  searchGPT: 'guest',
  searchProgramSeats: 'guest',
  queryLivePage: 'guest',
  getCurrentPageContext: 'guest',
  getCurrentCodingProblem: 'student',
  interactWithPageElement: 'guest',
  fillFormInput: 'guest',
  readPageContent: 'guest',

  // Student tools
  openDashboard: 'student',
  openProfile: 'student',
  openCourses: 'student',
  openMyCourses: 'student',
  openCourse: 'student',
  openDSASheets: 'student',
  openDSASheet: 'student',
  openDSAProblem: 'guest',
  openWeakestDSAProblem: 'student',
  openCodingArena: 'student',
  openCodingProfile: 'student',
  openRoutine: 'student',
  openGoals: 'student',
  openCertificate: 'student',
  openBadges: 'student',
  openLatexEditor: 'student',
  openNotifications: 'student',
  openLeaderboard: 'student',
  openDoubts: 'student',
  getStudent360: 'student',
  getWeakAreas: 'student',
  getRecommendations: 'student',
  getMyDSAProgress: 'student',
  getMyRoutine: 'student',
  generateTomorrowRoutine: 'student',
  createRoutine: 'student',
  getMyGoals: 'student',
  createGoal: 'student',
  createCodingSheet: 'instructor',
  addProblemsToSheet: 'student',
  getDSASheetDetails: 'student',
  runSafeSQLQuery: 'student',
  getNotices: 'student',
  readLatexCode: 'student',
  editLatexCode: 'student',
  getLeaderboardRank: 'student',
  runAutonomousCodingAgent: 'student',

  // Shared agent tools not tied to a student workflow
  scanLivePageElements: 'guest',
  getAvailableDSASheets: 'student',
  createNotice: 'instructor',
  captureScreenContext: 'student',
  readScreenRegion: 'student',
  saveToMemory: 'student',
  recallFromMemory: 'student',
  setReminder: 'student',
  listReminders: 'student',
  clearPersistentMemory: 'student',
  readFile: 'admin',
  writeFile: 'admin',
  listDirectory: 'admin',
  deleteFile: 'admin',
  getSystemInfo: 'admin',
  runTerminalCommand: 'admin',
  webSearch: 'guest',
  webScrape: 'guest',
  summarizeURL: 'guest',

  // Local Computer Companion tools. Desktop mutations remain confirmation-gated.
  inspectLocalComputer: 'student',
  launchPermittedApp: 'student',
  openBrowserUrl: 'student',
  observeBrowserState: 'student',
  readLocalWorkspaceFile: 'student',
  writeLocalWorkspaceFile: 'student',

  // Instructor tools
  openInstructorDashboard: 'instructor',
  openInstructorCourses: 'instructor',
  createCourse: 'instructor',
  editCourse: 'instructor',
  publishCourse: 'instructor',
  createModule: 'instructor',
  createLesson: 'instructor',
  createMCQ: 'instructor',
  manageCourseBuilder: 'instructor',
  viewStudentSubmissions: 'instructor',
  createInstructorNotice: 'instructor',

  // Admin tools
  openAdminDashboard: 'admin',
  openAdminCourses: 'admin',
  openAdminUsers: 'admin',
  openAdminNptel: 'admin',
  openAdminNotices: 'admin',
  openAdminFeedback: 'admin',
  openAdminSubmissions: 'admin',
  openDeveloperPanel: 'admin',
  manageUsers: 'admin',
  adminSyncNptel: 'admin',
  manageSystemSettings: 'admin',

  // Superadmin tools
  openSuperAdminPanel: 'superadmin',
  managePlatformFeatures: 'superadmin',
};

/**
 * Get required role for a path.
 */
export function getRequiredRoleForPage(pathname: string): AppRole {
  const cleanPath = pathname || '/';
  // Match longest matching prefix first
  const sorted = [...PAGE_PERMISSIONS].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const item of sorted) {
    if (item.prefix === '/' && cleanPath === '/') return item.minRole;
    if (item.prefix !== '/' && (cleanPath === item.prefix || cleanPath.startsWith(item.prefix + '/'))) {
      return item.minRole;
    }
  }
  return 'student'; // Default fallback for unknown protected paths
}

/**
 * Get required role for a tool.
 */
export function getRequiredRoleForTool(toolName: string): AppRole {
  return TOOL_PERMISSIONS[toolName] || 'student';
}

export class AgentPermissionManager {
  static getRequiredRole(toolName: string): AppRole | undefined {
    return TOOL_PERMISSIONS[toolName];
  }

  static canUseTool(role: unknown, toolName: string): boolean {
    const requiredRole = this.getRequiredRole(toolName);
    if (!requiredRole) return false;
    const normalizedRole = normalizeAgentRole(role);
    return ROLE_HIERARCHY[normalizedRole] >= ROLE_HIERARCHY[requiredRole];
  }

  static requireToolPermission(
    user: { id: string } | null | undefined,
    userRole: unknown,
    toolName: string
  ): { allowed: boolean; reason?: string; requiredRole?: AppRole } {
    const requiredRole = this.getRequiredRole(toolName);
    if (!requiredRole) {
      return { allowed: false, reason: 'Access denied. This agent tool is not authorized.' };
    }

    const normalizedRole = normalizeAgentRole(userRole);
    if ((!user || normalizedRole === 'guest') && requiredRole !== 'guest') {
      return {
        allowed: false,
        reason: 'Please log in first. This action is available to authenticated users.',
        requiredRole
      };
    }

    if (requiredRole === 'guest') return { allowed: true, requiredRole };

    if (!this.canUseTool(normalizedRole, toolName)) {
      return {
        allowed: false,
        reason: `Access denied. The ${toolName} tool requires ${requiredRole} permissions.`,
        requiredRole
      };
    }

    return { allowed: true, requiredRole };
  }
}

/**
 * Check if a role can access a given pathname.
 */
export function canAccessPage(role: unknown, pathname: string): boolean {
  const userRole = normalizeAgentRole(role);
  const minRequired = getRequiredRoleForPage(pathname);
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRequired];
}

/**
 * Check if a role can execute a given tool.
 */
export function canUseTool(role: unknown, toolName: string): boolean {
  return AgentPermissionManager.canUseTool(role, toolName);
}

/**
 * Check if a role can access a given resource key.
 */
export function canAccessResource(role: unknown, resource: string): boolean {
  const userRole = normalizeAgentRole(role);
  if (userRole === 'guest') return false;
  if (resource.startsWith('/') || resource.includes('/')) {
    return canAccessPage(role, resource);
  }
  return canUseTool(role, resource);
}

/**
 * Central authorization gate for agent actions and tool calls.
 */
export function requireAgentPermission(
  user: { id: string } | null | undefined,
  userRole: unknown,
  targetType: 'page' | 'tool' | 'resource',
  targetName: string
): { allowed: boolean; reason?: string; requiredRole?: AppRole } {
  if (targetType === 'tool') {
    return AgentPermissionManager.requireToolPermission(user, userRole, targetName);
  }

  const normalizedRole = normalizeAgentRole(userRole);

  // Authentication Gate check for unauthenticated users
  if (!user || normalizedRole === 'guest') {
    if (targetType === 'page') {
      const allowed = canAccessPage('guest', targetName);
      if (!allowed) {
        return {
          allowed: false,
          reason: 'Please log in first. This section is available to authenticated users.',
          requiredRole: getRequiredRoleForPage(targetName)
        };
      }
    }
  }

  // Hierarchy role check
  if (targetType === 'page') {
    const allowed = canAccessPage(normalizedRole, targetName);
    const requiredRole = getRequiredRoleForPage(targetName);
    if (!allowed) {
      return {
        allowed: false,
        reason: `Access denied. The ${targetName} page requires ${requiredRole} permissions.`,
        requiredRole
      };
    }
  }

  return { allowed: true };
}
