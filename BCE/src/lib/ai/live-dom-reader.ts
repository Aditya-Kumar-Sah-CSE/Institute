import { LivePageContext, buildDefaultLiveContext, LiveEntityProblem, LiveEntitySheet, LiveEntityCourse } from './live-page-context';

/**
 * Extracts live, rendered DOM context from the active browser window.
 * Scopes read access strictly to visible content on the open page.
 */
export function extractLiveDOMContext(overrideRoute?: string): LivePageContext {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return buildDefaultLiveContext(overrideRoute || '/dashboard');
  }

  const route = overrideRoute || (window.location.pathname + window.location.search);
  const baseContext = buildDefaultLiveContext(route);

  try {
    // 1. Page Title & Headings
    const docTitle = document.title || 'Smart Learn';
    const mainHeadings: string[] = [];
    const headingElements = document.querySelectorAll('h1, h2, h3, .section-title, .stat-card-value, [data-heading]');
    
    headingElements.forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 1 && text.length < 120 && !mainHeadings.includes(text)) {
        mainHeadings.push(text);
      }
    });

    // 2. Visible Text Snippets from main containers
    let visibleTextContent = '';
    const mainContainer = document.querySelector('main, .dashboard-content, .content-wrapper, #main-content, article');
    if (mainContainer) {
      const paragraphs: string[] = [];
      const textNodes = mainContainer.querySelectorAll('p, .stat-card-label, .card-description, .problem-description, .notice-content, .recommendation-why, [data-live-text]');
      textNodes.forEach((el) => {
        const txt = el.textContent?.replace(/\s+/g, ' ').trim();
        if (txt && txt.length > 5 && !paragraphs.includes(txt)) {
          paragraphs.push(txt);
        }
      });
      visibleTextContent = paragraphs.slice(0, 15).join(' | ');
    }

    // 3. Interactive Buttons & Main Actions
    const interactiveElements: string[] = [];
    const btnNodes = document.querySelectorAll('button:not([disabled]), a.btn, a[role="button"], .interactive-action');
    btnNodes.forEach((el) => {
      const label = el.textContent?.replace(/\s+/g, ' ').trim();
      if (label && label.length > 1 && label.length < 40 && !interactiveElements.includes(label)) {
        interactiveElements.push(label);
      }
    });

    // 4. Entity Extraction & Page-Specific State Harvesting
    let currentEntity: LivePageContext['currentEntity'] = undefined;
    const visibleEntities: LivePageContext['visibleEntities'] = {};
    const importantIds: Record<string, string> = {};

    // A. DSA Problem Page (/code-arena/problems/[id])
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
    }

    // B. DSA Sheet Detail Page (/code-arena/sheets/[id])
    else if (route.includes('/code-arena/sheets/')) {
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
        visibleEntities.problems = problemItems.slice(0, 20);
      }
    }

    // C. Courses Page or Detail Page
    else if (route.includes('/courses/')) {
      const courseIdFromUrl = route.split('/courses/')[1]?.split('?')[0];
      const courseTitle = document.querySelector('h1, .course-title')?.textContent?.trim() || mainHeadings[0] || 'Course';
      importantIds['courseId'] = courseIdFromUrl || '';

      currentEntity = {
        type: 'course',
        id: courseIdFromUrl || 'active_course',
        title: courseTitle
      };
    }

    // D. DSA Sheets Catalog (/code-arena/sheets)
    else if (route.includes('/code-arena/sheets')) {
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
        visibleEntities.sheets = sheetCards.slice(0, 15);
      }
    }

    // 5. Detect Page Load / UI State
    const isErrorState = document.querySelector('.error-banner, [class*="error"]') !== null;
    const is404 = document.body.textContent?.includes('404') || document.title?.includes('Not Found');
    const loadState: LivePageContext['loadState'] = is404 ? 'not-found' : isErrorState ? 'error' : 'ready';

    return {
      ...baseContext,
      route,
      pageTitle: docTitle,
      visibleHeadings: mainHeadings.slice(0, 15),
      visibleTextContent: visibleTextContent.slice(0, 1200),
      interactiveElements: interactiveElements.slice(0, 15),
      currentEntity,
      visibleEntities,
      importantIds,
      loadState,
      timestamp: Date.now()
    };
  } catch (err) {
    console.warn('[extractLiveDOMContext] Error scanning DOM:', err);
    return baseContext;
  }
}
