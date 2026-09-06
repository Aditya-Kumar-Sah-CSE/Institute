import { LivePageContext, buildDefaultLiveContext, LiveEntityProblem, LiveEntitySheet, LiveEntityCourse, InteractiveDOMElement } from './live-page-context';

let cachedDOMContext: LivePageContext | null = null;
let cachedDOMRoute: string | null = null;
let lastDOMScanTimestamp = 0;
const DOM_CACHE_TTL_MS = 2500; // Cache DOM index for 2.5s unless forced

/**
 * Invalidate cached DOM context manually on route change, modal open, or action execution.
 */
export function invalidateDOMCache(): void {
  cachedDOMContext = null;
  cachedDOMRoute = null;
  lastDOMScanTimestamp = 0;
}

/**
 * Extracts live, rendered DOM context from the active browser window.
 * Uses lightweight indexed representation and updates only when route/state changes.
 */
export function extractLiveDOMContext(overrideRoute?: string, forceRefresh = false): LivePageContext {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return buildDefaultLiveContext(overrideRoute || '/dashboard');
  }

  const route = overrideRoute || (window.location.pathname + window.location.search);
  const now = Date.now();

  // Return cached representation if route hasn't changed and within TTL
  if (!forceRefresh && cachedDOMContext && cachedDOMRoute === route && (now - lastDOMScanTimestamp < DOM_CACHE_TTL_MS)) {
    return cachedDOMContext;
  }

  const baseContext = buildDefaultLiveContext(route);

  try {
    // 1. Page Title & Headings
    const docTitle = document.title || 'Smart Learn';
    const mainHeadings: string[] = [];
    const headingElements = document.querySelectorAll(
      'h1, h2, h3, h4, h5, .section-title, .stat-card-value, .stat-card-label, [data-heading], [class*="title"], [class*="heading"]'
    );
    
    headingElements.forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length >= 1 && text.length < 120 && !mainHeadings.includes(text)) {
        mainHeadings.push(text);
      }
    });

    // 2. Complete Scroll Screen Text Content Access (Scans all scrollable sections top to bottom)
    let visibleTextContent = '';
    const textContainers = document.querySelectorAll(
      'main, .dashboard-main-container, .dashboard-content, .content-wrapper, #main-content, article, section, .code-arena-page, .problem-statement-body, .sheet-detail-container, .course-detail-container, .discussion-thread, .reviews-container, .intelligence-card, .dashboard-stats-grid, [class*="dashboard"], [class*="card"]'
    );

    const fullPageLines: string[] = [];
    const seenTexts = new Set<string>();

    const processElement = (el: Element) => {
      if (el.closest('.smart-agent-drawer, .smart-mentor-drawer, style, script, noscript, svg')) return;
      
      // If element has element children of target types, let child elements provide fine-grained text
      const hasChildTextElements = el.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, label, span, code, [data-live-text]').length > 0;
      const isLeafOrTextTag = !hasChildTextElements || ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH', 'LABEL', 'SPAN', 'CODE', 'PRE', 'B', 'STRONG'].includes(el.tagName);

      if (!isLeafOrTextTag) return;

      const txt = el.textContent?.replace(/\s+/g, ' ').trim();
      if (txt && txt.length >= 1 && txt.length < 300 && !seenTexts.has(txt)) {
        seenTexts.add(txt);
        fullPageLines.push(txt);
      }
    };

    if (textContainers.length > 0) {
      textContainers.forEach((container) => {
        const nodes = container.querySelectorAll(
          'p, h1, h2, h3, h4, h5, h6, li, td, th, label, blockquote, pre, code, span, div, .stat-card-value, .stat-card-label, .card-description, .problem-description, .notice-content, .recommendation-why, .comment-text, .review-text, .course-description, .lesson-title, [class*="badge"], [class*="tag"], [class*="score"], [class*="detail"], [data-live-text]'
        );
        nodes.forEach(processElement);
      });
    }

    if (fullPageLines.length < 5) {
      const allNodes = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, label, span, div, pre, code');
      allNodes.forEach(processElement);
    }

    visibleTextContent = fullPageLines.slice(0, 150).join('\n• ');

    // 3. Lightweight Indexed Discovery of Interactive Elements
    const interactiveElementsSummary: string[] = [];
    const interactiveElementsList: InteractiveDOMElement[] = [];

    const candidateNodes = Array.from(
      document.querySelectorAll(
        'button, a, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="option"], [data-action], [data-testid], .btn, .stat-card, .hover-lift, [onclick], details, summary, [tabindex="0"], [class*="card"], [class*="badge"]'
      )
    ) as HTMLElement[];

    candidateNodes.forEach((el) => {
      const isDrawerChild = el.closest('.smart-agent-drawer, .smart-mentor-drawer');
      const rect = el.getBoundingClientRect();
      const isVisible = isDrawerChild || (rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden');
      if (!isVisible) return;

      const tag = el.tagName.toUpperCase();
      const text = el.textContent?.replace(/\s+/g, ' ').trim() || '';
      const ariaLabel = el.getAttribute('aria-label') || undefined;
      const title = el.getAttribute('title') || undefined;
      const role = el.getAttribute('role') || undefined;
      const testId = el.getAttribute('data-testid') || el.getAttribute('data-action') || undefined;
      const href = el.getAttribute('href') || undefined;
      const value = (el as HTMLInputElement).value || undefined;
      const placeholder = (el as HTMLInputElement).placeholder || undefined;
      const disabled = (el as HTMLButtonElement).disabled || el.hasAttribute('aria-disabled');
      const ariaExpanded = el.hasAttribute('aria-expanded') ? el.getAttribute('aria-expanded') === 'true' : undefined;
      const ariaChecked = el.hasAttribute('aria-checked') ? el.getAttribute('aria-checked') === 'true' : ((el as HTMLInputElement).type === 'checkbox' ? (el as HTMLInputElement).checked : undefined);

      let parentSection: InteractiveDOMElement['parentSection'] = 'other';
      if (el.closest('.sidebar-wrapper, aside, .sidebar')) parentSection = 'sidebar';
      else if (el.closest('.navbar-wrapper, header, .navbar')) parentSection = 'navbar';
      else if (el.closest('.modal, [role="dialog"], .modal-content')) parentSection = 'modal';
      else if (isDrawerChild) parentSection = 'drawer';
      else if (el.closest('main, .dashboard-main-container, .dashboard-content, .content-wrapper')) parentSection = 'main';

      const label = text || ariaLabel || title || placeholder || testId || el.id || 'Interactive Element';

      if (label && label.length >= 1 && label.length < 120) {
        if (!interactiveElementsSummary.includes(label)) {
          interactiveElementsSummary.push(label);
        }

        let type: InteractiveDOMElement['type'] = 'other';
        if (tag === 'BUTTON' || role === 'button' || el.classList.contains('btn')) type = 'button';
        else if (tag === 'A' || href) type = 'link';
        else if (role === 'tab') type = 'tab';
        else if (tag === 'INPUT' && (el as HTMLInputElement).type === 'checkbox') type = 'toggle';
        else if (tag === 'INPUT' || tag === 'TEXTAREA') type = 'input';
        else if (tag === 'SELECT') type = 'select';
        else if (role === 'menuitem') type = 'menu_item';

        interactiveElementsList.push({
          id: el.id || `el_${interactiveElementsList.length + 1}`,
          index: interactiveElementsList.length + 1,
          tag,
          type,
          text: label,
          ariaLabel,
          title,
          role,
          testId,
          href,
          value,
          placeholder,
          disabled: Boolean(disabled),
          visible: true,
          ariaExpanded,
          ariaChecked,
          parentSection
        });
      }
    });

    // 4. Entity Extraction
    let currentEntity: LivePageContext['currentEntity'] = undefined;
    const visibleEntities: LivePageContext['visibleEntities'] = {};
    const importantIds: Record<string, string> = {};

    if (route.includes('/code-arena/problems/')) {
      const probIdFromUrl = route.split('/code-arena/problems/')[1]?.split('?')[0];
      const h1Title = document.querySelector('h1')?.textContent?.trim() || mainHeadings[0] || 'DSA Problem';
      const difficultyBadge = document.querySelector('[class*="difficulty"], [data-difficulty]')?.textContent?.trim();
      const solvedBadge = document.querySelector('[class*="solved"], [data-solved]') ? true : false;
      const topicTag = document.querySelector('[class*="tag"], [class*="topic"]')?.textContent?.trim();

      importantIds['problemId'] = probIdFromUrl || '';
      currentEntity = {
        type: 'problem',
        id: probIdFromUrl || 'active_problem',
        title: h1Title,
        metadata: {
          difficulty: difficultyBadge,
          solved: solvedBadge,
          topic: topicTag,
          route
        }
      };
    } else if (route.includes('/code-arena/sheets/')) {
      const sheetIdFromUrl = route.split('/code-arena/sheets/')[1]?.split('?')[0];
      const sheetTitle = document.querySelector('h1, h2.sheet-title')?.textContent?.trim() || mainHeadings[0] || 'DSA Sheet';
      importantIds['sheetId'] = sheetIdFromUrl || '';

      const problemItems: LiveEntityProblem[] = [];
      const probRows = document.querySelectorAll('[data-problem-row], .problem-item, tr.problem-row');
      probRows.forEach((row, idx) => {
        const title = row.querySelector('.problem-title, a, td:nth-child(2)')?.textContent?.trim();
        const diff = row.querySelector('[class*="difficulty"]')?.textContent?.trim();
        if (title) {
          problemItems.push({
            id: row.getAttribute('data-problem-id') || `p_${idx + 1}`,
            number: idx + 1,
            title,
            difficulty: diff
          });
        }
      });

      currentEntity = {
        type: 'sheet',
        id: sheetIdFromUrl || 'active_sheet',
        title: sheetTitle,
        metadata: {
          totalProblems: problemItems.length || undefined
        }
      };
      if (problemItems.length > 0) {
        visibleEntities.problems = problemItems.slice(0, 30);
      }
    } else if (route.includes('/courses/')) {
      const courseIdFromUrl = route.split('/courses/')[1]?.split('?')[0];
      const courseTitle = document.querySelector('h1, .course-title')?.textContent?.trim() || mainHeadings[0] || 'Course';
      importantIds['courseId'] = courseIdFromUrl || '';

      currentEntity = {
        type: 'course',
        id: courseIdFromUrl || 'active_course',
        title: courseTitle
      };
    } else if (route.includes('/code-arena/sheets')) {
      const sheetCards: LiveEntitySheet[] = [];
      document.querySelectorAll('[data-sheet-card], .sheet-card, .card').forEach((card, idx) => {
        const title = card.querySelector('h3, h4, .sheet-card-title')?.textContent?.trim();
        const countText = card.querySelector('.problem-count, .card-meta')?.textContent?.trim();
        const countMatch = countText?.match(/\d+/);
        if (title) {
          sheetCards.push({
            id: card.getAttribute('data-sheet-id') || `sheet_${idx + 1}`,
            title,
            totalProblems: countMatch ? parseInt(countMatch[0], 10) : undefined
          });
        }
      });
      if (sheetCards.length > 0) {
        visibleEntities.sheets = sheetCards.slice(0, 25);
      }
    }

    // 5. Detect Page Load / UI State
    const isErrorState = document.querySelector('.error-banner, [class*="error"]') !== null;
    const is404 = document.body.textContent?.includes('404') || document.title?.includes('Not Found');
    const loadState: LivePageContext['loadState'] = is404 ? 'not-found' : isErrorState ? 'error' : 'ready';

    const freshCtx: LivePageContext = {
      ...baseContext,
      route,
      pageTitle: docTitle,
      visibleHeadings: mainHeadings.slice(0, 60),
      visibleTextContent: visibleTextContent.slice(0, 10000),
      interactiveElements: interactiveElementsSummary.slice(0, 150),
      interactiveElementsList: interactiveElementsList.slice(0, 200),
      currentEntity,
      visibleEntities,
      importantIds,
      loadState,
      timestamp: now
    };

    cachedDOMContext = freshCtx;
    cachedDOMRoute = route;
    lastDOMScanTimestamp = now;

    return freshCtx;
  } catch (err) {
    console.warn('[extractLiveDOMContext] Error scanning DOM:', err);
    return baseContext;
  }
}
