import { AppRole, canAccessPage, normalizeAgentRole } from '@/lib/auth/agent-permissions';

export interface ClientFastPathResult {
  isMatch: boolean;
  targetRoute?: string;
  expectedHeading?: string;
  streamingMessage?: string;
  successMessage?: string;
  clientAction?: 'navigate' | 'back' | 'close' | 'interact' | 'context';
  interactArgs?: {
    actionType: 'click' | 'edit' | 'save' | 'cancel' | 'delete' | 'submit' | 'close' | 'open';
    targetText: string;
  };
  allowed: boolean;
  permissionReason?: string;
}

// Client-side routes cache map for instant resolution
const KNOWN_ROUTES_CACHE: Record<string, { route: string; heading: string; requiredRole?: AppRole }> = {
  courses: { route: '/courses', heading: 'Courses' },
  dsa: { route: '/code-arena/sheets', heading: 'DSA Sheets' },
  sheets: { route: '/code-arena/sheets', heading: 'DSA Sheets' },
  routine: { route: '/routine', heading: 'Routine' },
  goals: { route: '/goals', heading: 'Goals' },
  profile: { route: '/profile', heading: 'Profile' },
  dashboard: { route: '/dashboard', heading: 'Dashboard' },
  instructor: { route: '/instructor', heading: 'Instructor Dashboard', requiredRole: 'instructor' },
  'instructor-courses': { route: '/instructor/courses', heading: 'Instructor Courses', requiredRole: 'instructor' },
  admin: { route: '/admin', heading: 'Admin Panel', requiredRole: 'admin' },
  'admin-users': { route: '/admin/users', heading: 'User Management', requiredRole: 'admin' },
  'admin-courses': { route: '/admin/courses', heading: 'Admin Courses', requiredRole: 'admin' },
  developer: { route: '/developer', heading: 'Developer Tools', requiredRole: 'developer' }
};

/**
 * Resolves high-frequency user commands deterministically on the client side in <1ms.
 * Bypasses network requests and LLM calls entirely.
 */
export function resolveClientFastPath(
  prompt: string,
  userRole: string = 'student',
  activeContext: { courseId?: string; sheetId?: string; problemId?: string } = {}
): ClientFastPathResult {
  const p = prompt.trim().toLowerCase();
  const normalizedRole = normalizeAgentRole(userRole);

  // 1. Close / Drawer Actions
  if (/^(close|band\s*karo|drawer\s*band|exit)$/i.test(p)) {
    return {
      isMatch: true,
      clientAction: 'close',
      streamingMessage: 'Closing drawer...',
      successMessage: 'Drawer closed.',
      allowed: true
    };
  }

  // 2. Back / History Navigation
  if (/^(back|piche\s*jao|go\s*back|previous\s*page)$/i.test(p)) {
    return {
      isMatch: true,
      clientAction: 'back',
      streamingMessage: 'Going back...',
      successMessage: 'Navigated back.',
      allowed: true
    };
  }

  // 3. Open Courses
  if (/\b(open\s+courses|courses?\s+kholo|show\s+courses|all\s+courses)\b/i.test(p) && !p.includes('create') && !p.includes('banao')) {
    return {
      isMatch: true,
      targetRoute: '/courses',
      expectedHeading: 'Courses',
      clientAction: 'navigate',
      streamingMessage: 'Opening Courses...',
      successMessage: 'Courses page opened.',
      allowed: true
    };
  }

  // 4. Open DSA / Coding Sheets
  if (/\b(open\s+dsa|dsa\s+kholo|open\s+sheets?|sheets?\s+kholo|coding\s+sheet)\b/i.test(p) && !p.includes('problem') && !p.includes('create') && !p.includes('banao')) {
    return {
      isMatch: true,
      targetRoute: '/code-arena/sheets',
      expectedHeading: 'DSA Sheets',
      clientAction: 'navigate',
      streamingMessage: 'Opening DSA Sheets...',
      successMessage: 'DSA Sheets page opened.',
      allowed: true
    };
  }

  // 4B. Open Student Panel / Dashboard
  if (/\b(open\s+student|student\s+panel|student\s+dashboard|student\s+kholo|student\s+view)\b/i.test(p)) {
    return {
      isMatch: true,
      targetRoute: '/dashboard',
      expectedHeading: 'Dashboard',
      clientAction: 'navigate',
      streamingMessage: 'Opening Student Dashboard...',
      successMessage: 'Student Dashboard opened.',
      allowed: true
    };
  }

  // 5. Open Instructor Panel
  if (/\b(open\s+instructor|instructor\s+panel|instructor\s+dashboard|instructor\s+kholo)\b/i.test(p)) {
    const allowed = canAccessPage(normalizedRole, '/instructor');
    return {
      isMatch: true,
      targetRoute: '/instructor',
      expectedHeading: 'Instructor Dashboard',
      clientAction: 'navigate',
      streamingMessage: allowed ? 'Opening Instructor Panel...' : 'Checking permissions...',
      successMessage: 'Instructor Panel opened.',
      allowed,
      permissionReason: allowed ? undefined : 'Access denied: Instructor role required.'
    };
  }

  // 6. Open Admin Panel
  if (/\b(open\s+admin|admin\s+panel|admin\s+dashboard|admin\s+kholo)\b/i.test(p)) {
    const allowed = canAccessPage(normalizedRole, '/admin');
    return {
      isMatch: true,
      targetRoute: '/admin',
      expectedHeading: 'Admin Panel',
      clientAction: 'navigate',
      streamingMessage: allowed ? 'Opening Admin Panel...' : 'Checking permissions...',
      successMessage: 'Admin Panel opened.',
      allowed,
      permissionReason: allowed ? undefined : 'Access denied: Admin role required.'
    };
  }

  // 7. Open Developer Panel
  if (/\b(open\s+developer|developer\s+panel|developer\s+tools|developer\s+kholo)\b/i.test(p)) {
    const allowed = canAccessPage(normalizedRole, '/developer');
    return {
      isMatch: true,
      targetRoute: '/developer',
      expectedHeading: 'Developer Tools',
      clientAction: 'navigate',
      streamingMessage: allowed ? 'Opening Developer Panel...' : 'Checking permissions...',
      successMessage: 'Developer Panel opened.',
      allowed,
      permissionReason: allowed ? undefined : 'Access denied: Developer role required.'
    };
  }

  // 8. Create Course Fast-Path
  if (/\b(create\s+course|course\s+banao|new\s+course|add\s+course)\b/i.test(p)) {
    const allowed = canAccessPage(normalizedRole, '/instructor/courses/new');
    return {
      isMatch: true,
      targetRoute: '/instructor/courses/new',
      expectedHeading: 'Create Course',
      clientAction: 'navigate',
      streamingMessage: allowed ? 'Opening Course Creator...' : 'Checking permissions...',
      successMessage: 'Course Creator opened.',
      allowed,
      permissionReason: allowed ? undefined : 'Access denied: Instructor role required to create courses.'
    };
  }

  // 9. Edit Course Fast-Path
  if (/\b(edit\s+course|course\s+edit\s+karo|modify\s+course)\b/i.test(p)) {
    const allowed = canAccessPage(normalizedRole, '/instructor/courses');
    const targetRoute = activeContext.courseId ? `/instructor/courses/${activeContext.courseId}/edit` : '/instructor/courses';
    return {
      isMatch: true,
      targetRoute,
      expectedHeading: 'Courses',
      clientAction: 'navigate',
      streamingMessage: allowed ? 'Opening Course Editor...' : 'Checking permissions...',
      successMessage: 'Course Editor opened.',
      allowed,
      permissionReason: allowed ? undefined : 'Access denied: Instructor role required.'
    };
  }

  // 10. Create MCQ Fast-Path
  if (/\b(create\s+mcq|mcq\s+banao|new\s+mcq|add\s+mcq|create\s+question)\b/i.test(p)) {
    const allowed = canAccessPage(normalizedRole, '/instructor/mcqs/new');
    return {
      isMatch: true,
      targetRoute: '/instructor/mcqs/new',
      expectedHeading: 'MCQ Management',
      clientAction: 'navigate',
      streamingMessage: allowed ? 'Opening MCQ Creator...' : 'Checking permissions...',
      successMessage: 'MCQ Creator opened.',
      allowed,
      permissionReason: allowed ? undefined : 'Access denied: Instructor role required.'
    };
  }

  // 11. Open Current Page Context
  if (/^(current\s+page|open\s+page|isme\s+kya\s+hai|is\s+page\s+par\s+kya\s+hai)$/i.test(p)) {
    return {
      isMatch: true,
      clientAction: 'context',
      streamingMessage: 'Reading page details...',
      successMessage: 'Page details retrieved.',
      allowed: true
    };
  }

  return { isMatch: false, allowed: true };
}
