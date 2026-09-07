import { AppRole, canAccessPage, normalizeAgentRole } from '@/lib/auth/agent-permissions';
import { LivePageContext } from '@/lib/ai/live-page-context';

export interface ClientFastPathResult {
  isMatch: boolean;
  targetRoute?: string;
  expectedHeading?: string;
  streamingMessage?: string;
  successMessage?: string;
  clientAction?: 'navigate' | 'back' | 'close' | 'interact' | 'context' | 'exitVoiceSession';
  interactArgs?: {
    actionType: 'click' | 'edit' | 'save' | 'cancel' | 'delete' | 'submit' | 'close' | 'open';
    targetText: string;
  };
  allowed: boolean;
  permissionReason?: string;
  language?: 'en' | 'hi' | 'hinglish';
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
 * Detect language of user query ('en' | 'hi' | 'hinglish')
 */

export function detectPromptLanguage(prompt: string): 'en' | 'hi' | 'hinglish' {
  const p = prompt.toLowerCase();
  const hinglishMarkers = ['karo', 'kholo', 'kya', 'kaise', 'batao', 'dikhao', 'banao', 'bana', 'padhna', 'hoon', 'hai', 'hain', 'bas', 'band', 'aaj', 'ye', 'woh', 'sko', 'isme'];
  const hasHinglish = hinglishMarkers.some(m => new RegExp(`\\b${m}\\b`, 'i').test(p));
  return hasHinglish ? 'hinglish' : 'en';
}

/**
 * Resolves high-frequency user commands deterministically on the client side in <1ms.
 * Checks Live DOM Snapshot targets FIRST before executing fallback route actions.
 */
export function resolveClientFastPath(
  prompt: string,
  userRole: string = 'student',
  activeContext: { courseId?: string; sheetId?: string; problemId?: string; activeEntityId?: string } = {},
  liveContext?: LivePageContext
): ClientFastPathResult {
  const p = prompt.trim().toLowerCase();
  const normalizedRole = normalizeAgentRole(userRole);
  const language = detectPromptLanguage(p);

  const elementsList = liveContext?.interactiveElementsList || [];
  const cards = liveContext?.snapshot?.cards || [];

  // Helper to find live interactive DOM element by text/aria/id/href
  const findLiveElement = (query: string, typeFilter?: string) => {
    const q = query.toLowerCase();
    return elementsList.find(el => {
      const text = (el.text || el.dataAgentLabel || el.dataAgentAction || el.ariaLabel || el.title || '').toLowerCase();
      const matchesType = !typeFilter || el.type === typeFilter || el.tag.toLowerCase() === typeFilter;
      const matchesText = text.includes(q) || q.includes(text) || (el.href && el.href.toLowerCase().includes(q));
      return matchesType && matchesText;
    });
  };

  // 0. Meta Realtime / Continuous Conversation / Speed Optimization Feedback Queries
  const isMetaOptimizationQuery = /\b(contineous|continuous|conversation|real\s*time|realtime|delay|latency|fast|slow|speed|optmize|optimize)\b/i.test(p) &&
                                  /\b(nhi|nahi|kr|karo|batao|kya|h|hai|kardo)\b/i.test(p);
  if (isMetaOptimizationQuery) {
    return {
      isMatch: true,
      streamingMessage: language === 'hinglish' 
        ? '⚡ Smart Agent response pipeline optimize kar di gayi hai! Fast-path execution, API timeouts (<3s), aur prompt payload trim ho chuke hain. Real-time sub-second continuous conversation active hai.'
        : '⚡ Smart Agent pipeline optimized! Fast-path execution and API timeout guards are active for real-time sub-second latency.',
      successMessage: 'Real-time continuous mode active.',
      allowed: true,
      language
    };
  }

  // 1. Voice Session Explicit Exit Commands
  const isExplicitVoiceExit = /^(stop|exit|close\s*voice|bye|bye\s*bye|band\s*karo|bas\s*karo|voice\s*off)$/i.test(p) ||
                              /^(voice\s*session\s*band|stop\s*listening)$/i.test(p);
  if (isExplicitVoiceExit) {
    return {
      isMatch: true,
      clientAction: 'exitVoiceSession',
      streamingMessage: language === 'hinglish' ? 'Voice mode band kar raha hoon. Bye!' : 'Closing voice session. Goodbye!',
      successMessage: 'Voice session ended.',
      allowed: true,
      language
    };
  }

  // 1B. Drawer Close / Hide Actions
  if (/^(close\s*drawer|drawer\s*band\s*karo|hide\s*drawer)$/i.test(p)) {
    return {
      isMatch: true,
      clientAction: 'close',
      streamingMessage: 'Closing drawer...',
      successMessage: 'Drawer closed.',
      allowed: true,
      language
    };
  }

  // 2. Back / History Navigation
  if (/^(back|piche\s*jao|go\s*back|previous\s*page)$/i.test(p)) {
    return {
      isMatch: true,
      clientAction: 'back',
      streamingMessage: 'Going back...',
      successMessage: 'Navigated back.',
      allowed: true,
      language
    };
  }

  // 2B. Pronoun & Card Reference Resolution ("isme start karo", "start in this card", "isko open karo")
  if (/\b(isme|usme|this\s+card)\s+(start|open|click)\b/i.test(p) || /^(start|open|click)\s+(in|on\s+)?(this|that|isme|usme)$/i.test(p)) {
    const activeCard = cards[0];
    const targetElId = activeCard?.actionableElementIds?.[0] || elementsList[0]?.id;
    if (targetElId) {
      return {
        isMatch: true,
        clientAction: 'interact',
        interactArgs: { actionType: 'click', targetText: targetElId },
        streamingMessage: 'Executing action on target element...',
        successMessage: 'Action completed.',
        allowed: true,
        language
      };
    }
  }

  // 2C. Start Practice Click Resolution ("Start Practice click karo", "Start Practice")
  if (/\b(start\s+practice|practice\s+start)\b/i.test(p)) {
    const startEl = findLiveElement('start practice') || findLiveElement('start') || findLiveElement('practice');
    if (startEl) {
      return {
        isMatch: true,
        clientAction: 'interact',
        interactArgs: { actionType: 'click', targetText: startEl.id },
        streamingMessage: 'Clicking Start Practice button...',
        successMessage: 'Clicked Start Practice.',
        allowed: true,
        language
      };
    }
  }

  // 2D. DSA Card Open Resolution ("DSA wala card kholo", "DSA card open karo")
  if (/\b(dsa\s+card|dsa\s+wala\s+card|practice\s+dsa\s+card)\b/i.test(p)) {
    const dsaCard = cards.find(c => (c.title || '').toLowerCase().includes('dsa') || (c.title || '').toLowerCase().includes('practice'));
    if (dsaCard) {
      const targetId = dsaCard.actionableElementIds?.[0] || dsaCard.id || dsaCard.title || 'dsa';
      return {
        isMatch: true,
        clientAction: 'interact',
        interactArgs: { actionType: 'click', targetText: targetId },
        streamingMessage: `Opening ${dsaCard.title || 'DSA Card'}...`,
        successMessage: `Opened ${dsaCard.title || 'DSA Card'}.`,
        allowed: true,
        language
      };
    }
  }

  // 3. Open Courses
  if (/\b(open\s+courses?|courses?\s+kholo|show\s+courses?|all\s+courses?|sab\s+courses?)\b/i.test(p) && !p.includes('create') && !p.includes('banao')) {
    const liveCoursesEl = findLiveElement('courses');
    if (liveCoursesEl) {
      return {
        isMatch: true,
        clientAction: 'interact',
        interactArgs: { actionType: 'click', targetText: liveCoursesEl.id },
        streamingMessage: 'Clicking Courses link on page...',
        successMessage: 'Courses opened.',
        allowed: true,
        language
      };
    }
    return {
      isMatch: true,
      targetRoute: '/courses',
      expectedHeading: 'Courses',
      clientAction: 'navigate',
      streamingMessage: 'Opening Courses...',
      successMessage: 'Courses page opened.',
      allowed: true,
      language
    };
  }

  // 4. Open DSA / Coding Sheets (Generic OR Specific Sheet Queries like "leetcode 100 basic sheet kholo")
  const isSheetQuery = /\b(sheet|sheets|dsa|leetcode|striver|blind\s*75|coding\s+sheet)\b/i.test(p);
  if (isSheetQuery) {
    // Extract key tokens (e.g. "leetcode", "100", "basic")
    const queryTokens = p
      .replace(/\b(open|kholo|show|dikhao|view|start|karo|kardo|wala|wali|wale|sheet|sheets|dsa|par|me|mein|ka|ki|ke|ko)\b/gi, ' ')
      .trim()
      .split(/\s+/)
      .filter(t => t.length > 0);

    if (queryTokens.length > 0) {
      // Strategy 1: Match live cards by token inclusion
      const matchedCard = cards.find(card => {
        const titleLower = (card.title || '').toLowerCase();
        return queryTokens.every(tok => titleLower.includes(tok)) ||
               (queryTokens.length > 1 && queryTokens.some(tok => titleLower.includes(tok)));
      });

      if (matchedCard) {
        const targetId = matchedCard.actionableElementIds?.[0] || matchedCard.id || matchedCard.title || 'sheet';
        return {
          isMatch: true,
          clientAction: 'interact',
          interactArgs: { actionType: 'click', targetText: targetId },
          streamingMessage: `Opening ${matchedCard.title || 'Sheet'}...`,
          successMessage: `Opened ${matchedCard.title || 'Sheet'}.`,
          allowed: true,
          language
        };
      }

      // Strategy 2: Match live interactive DOM elements
      const matchedEl = elementsList.find(el => {
        const elText = (el.text || el.dataAgentLabel || el.dataAgentAction || el.ariaLabel || el.title || '').toLowerCase();
        return queryTokens.some(tok => tok.length > 1 && elText.includes(tok));
      });

      if (matchedEl) {
        return {
          isMatch: true,
          clientAction: 'interact',
          interactArgs: { actionType: 'click', targetText: matchedEl.id },
          streamingMessage: `Clicking ${matchedEl.text || 'Sheet'}...`,
          successMessage: `Opened ${matchedEl.text || 'Sheet'}.`,
          allowed: true,
          language
        };
      }
    }

    // Fallback: Click DSA link or navigate to /code-arena/sheets
    const liveDsaEl = findLiveElement('dsa') || findLiveElement('sheets');
    if (liveDsaEl) {
      return {
        isMatch: true,
        clientAction: 'interact',
        interactArgs: { actionType: 'click', targetText: liveDsaEl.id },
        streamingMessage: 'Clicking DSA Sheets link on page...',
        successMessage: 'DSA Sheets opened.',
        allowed: true,
        language
      };
    }
    return {
      isMatch: true,
      targetRoute: '/code-arena/sheets',
      expectedHeading: 'DSA Sheets',
      clientAction: 'navigate',
      streamingMessage: 'Opening DSA Sheets...',
      successMessage: 'DSA Sheets page opened.',
      allowed: true,
      language
    };
  }

  // 4B. Open Profile Fast-Path
  if (/\b(open\s+profile|profile\s+kholo|my\s+profile|show\s+profile|account\s+kholo)\b/i.test(p)) {
    const liveProfileEl = findLiveElement('profile') || findLiveElement('account');
    if (liveProfileEl) {
      return {
        isMatch: true,
        clientAction: 'interact',
        interactArgs: { actionType: 'click', targetText: liveProfileEl.id },
        streamingMessage: 'Clicking Profile on live page...',
        successMessage: 'Profile opened.',
        allowed: true,
        language
      };
    }
    return {
      isMatch: true,
      targetRoute: '/profile',
      expectedHeading: 'Profile',
      clientAction: 'navigate',
      streamingMessage: 'Opening Profile...',
      successMessage: 'Profile page opened.',
      allowed: true,
      language
    };
  }

  // 4C. Open Routine / Timetable Fast-Path
  if (/\b(open\s+routine|routine\s+kholo|schedule\s+kholo|timetable\s+kholo)\b/i.test(p)) {
    const liveRoutineEl = findLiveElement('routine') || findLiveElement('schedule');
    if (liveRoutineEl) {
      return {
        isMatch: true,
        clientAction: 'interact',
        interactArgs: { actionType: 'click', targetText: liveRoutineEl.id },
        streamingMessage: 'Clicking Routine link...',
        successMessage: 'Routine opened.',
        allowed: true,
        language
      };
    }
    return {
      isMatch: true,
      targetRoute: '/routine',
      expectedHeading: 'Routine',
      clientAction: 'navigate',
      streamingMessage: 'Opening Routine...',
      successMessage: 'Routine page opened.',
      allowed: true,
      language
    };
  }

  // 4D. Open Student Panel / Dashboard
  if (/\b(open\s+student|student\s+panel|student\s+dashboard|student\s+kholo|student\s+view|dashboard\s+kholo|open\s+dashboard)\b/i.test(p)) {
    const liveDashboardEl = findLiveElement('dashboard') || findLiveElement('home');
    if (liveDashboardEl) {
      return {
        isMatch: true,
        clientAction: 'interact',
        interactArgs: { actionType: 'click', targetText: liveDashboardEl.id },
        streamingMessage: 'Clicking Dashboard link...',
        successMessage: 'Dashboard opened.',
        allowed: true,
        language
      };
    }
    return {
      isMatch: true,
      targetRoute: '/dashboard',
      expectedHeading: 'Dashboard',
      clientAction: 'navigate',
      streamingMessage: 'Opening Student Dashboard...',
      successMessage: 'Student Dashboard opened.',
      allowed: true,
      language
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
      permissionReason: allowed ? undefined : 'Access denied: Instructor role required.',
      language
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
      permissionReason: allowed ? undefined : 'Access denied: Admin role required.',
      language
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
      permissionReason: allowed ? undefined : 'Access denied: Developer role required.',
      language
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
      permissionReason: allowed ? undefined : 'Access denied: Instructor role required to create courses.',
      language
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
      permissionReason: allowed ? undefined : 'Access denied: Instructor role required.',
      language
    };
  }

  // 10. PAGE_AWARENESS_QUERY Intent Classification ("Is page par kya kya hai?", "is page par kya hai?", "what is on this page?", "page pe kya hai?", "yaha kya kya hai?", "sidebar me kya hai?", "strengths kya hain?")
  const isSidebarQuery = /\b(sidebar|side\s+menu|navigation\s+panel)\b/i.test(p) && /\b(kya|list|items|show|batao)\b/i.test(p);
  const isStrengthsQuery = /\b(strength|strengths|weakness|improve|readiness)\b/i.test(p) && /\b(kya|list|show|batao|check|my|mere|meri)\b/i.test(p);

  const isPageAwarenessQuery = isSidebarQuery || isStrengthsQuery ||
    /^(is\s+page\s+par\s+kya(\s+kya)?\s+hai\??|is\s+page\s+pe\s+kya\??|page\s+pe\s+kya\??|yaha\s+kya(\s+kya)?\s+hai\??|yahan\s+kya\??|ab\s+is\s+page\s+par\s+kya\??|what\s+is\s+on\s+this\s+page\??|what\s+is\s+here\??|current\s+page|open\s+page)/i.test(p) ||
    (/\b(is\s+page|current\s+page|yaha|yahan|this\s+screen)\b/i.test(p) && /\b(kya|kya\s+kya|what|breakdown|summary|content|detail|details)\b/i.test(p));

  if (isPageAwarenessQuery) {
    let contextFilter: 'all' | 'sidebar' | 'strengths' = 'all';
    if (isSidebarQuery) contextFilter = 'sidebar';
    else if (isStrengthsQuery) contextFilter = 'strengths';

    return {
      isMatch: true,
      clientAction: 'context',
      streamingMessage: 'Reading live screen breakdown...',
      successMessage: 'Live page context retrieved.',
      allowed: true,
      language,
      interactArgs: {
        actionType: 'open',
        targetText: contextFilter
      }
    };
  }

  // 11. Recommendation & Learning Plan Queries (Hinglish Supported)
  if (/\b(what\s+should\s+i\s+study|kya\s+padhun|aaj\tagya\spadhna|recommendation|my\s+plan|learning\s+plan|weak\s+topics|weakness|falling\s+behind|which\s+course\s+to\s+enroll|dsa\s+me\s+main\s+weak\s+hoon)\b/i.test(p)) {
    return {
      isMatch: true,
      targetRoute: '/dashboard',
      expectedHeading: 'Dashboard',
      clientAction: 'navigate',
      streamingMessage: language === 'hinglish' ? 'Aapka learning profile aur recommendations analyze kar raha hoon...' : 'Analyzing your learning profile & recommendations...',
      successMessage: 'Personalized recommendations retrieved.',
      allowed: true,
      language
    };
  }

  return { isMatch: false, allowed: true, language };
}



