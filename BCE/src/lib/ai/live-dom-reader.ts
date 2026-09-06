import { LivePageContext, buildDefaultLiveContext, LiveEntityProblem, LiveEntitySheet, LiveEntityCourse, InteractiveDOMElement } from './live-page-context';
import {
  LiveUISnapshot,
  RuntimeAgentElement,
  LiveUISection,
  LiveUICard,
  LiveUIMetric,
  LiveUIPageBadge,
  LiveUIAlert,
  getElementComputedColorInfo,
  classifyRGBToSemanticColor,
  validateLiveUISnapshotSerializable
} from './live-ui-snapshot';

let cachedDOMContext: LivePageContext | null = null;
let cachedDOMRoute: string | null = null;
let lastDOMScanTimestamp = 0;
const DOM_CACHE_TTL_MS = 2000; // Cache DOM index for 2s unless forced

export const runtimeElementRegistry = new Map<string, HTMLElement>();
export let isScanningDOM = false;

export function getClassNameString(el: Element | null | undefined): string {
  if (!el) return '';
  if (typeof el.className === 'string') return el.className;
  if (el.className && typeof (el.className as any).baseVal === 'string') {
    return (el.className as any).baseVal;
  }
  return '';
}

/**
 * Invalidate cached DOM context manually on route change, modal open, or action execution.
 */
export function invalidateDOMCache(): void {
  cachedDOMContext = null;
  cachedDOMRoute = null;
  lastDOMScanTimestamp = 0;
  runtimeElementRegistry.clear();
}

/**
 * Extracts live, rendered DOM context from the active browser window.
 * Scans document.body top to bottom, including header, sidebar, modals, popovers, and main content.
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
  isScanningDOM = true;

  try {
    runtimeElementRegistry.clear();

    // 1. Page Title & Headings
    const docTitle = document.title || 'Smart Learn Platform';
    const mainHeadings: string[] = [];
    const headingElements = document.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, .section-title, .stat-card-value, .stat-card-label, [data-heading], [class*="title"], [class*="heading"]'
    );
    
    headingElements.forEach((el) => {
      if (el.closest('.smart-agent-drawer, .smart-mentor-drawer, style, script, noscript, svg')) return;
      const text = el.textContent?.trim();
      if (text && text.length >= 1 && text.length < 120 && !mainHeadings.includes(text)) {
        mainHeadings.push(text);
      }
    });

    // 2. Whole Body Text Extraction
    const fullPageLines: string[] = [];
    const seenTexts = new Set<string>();

    const textNodes = document.body.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, li, td, th, label, blockquote, pre, code, span, div, [data-agent-label], [data-live-text]'
    );

    textNodes.forEach((el) => {
      if (el.closest('.smart-agent-drawer, .smart-mentor-drawer, style, script, noscript, svg')) return;

      const hasChildTextElements = el.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, label, span, code').length > 0;
      const isLeaf = !hasChildTextElements || ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH', 'LABEL', 'SPAN', 'CODE', 'B', 'STRONG'].includes(el.tagName);

      if (!isLeaf) return;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const txt = el.textContent?.replace(/\s+/g, ' ').trim();
      if (txt && txt.length >= 1 && txt.length < 300 && !seenTexts.has(txt)) {
        seenTexts.add(txt);
        fullPageLines.push(txt);
      }
    });

    const visibleTextContent = fullPageLines.slice(0, 200).join('\n• ');

    // 3. Whole-Body Actionable & Semantic Element Discovery with Stable Runtime IDs
    const elementsMap = new Map<string, RuntimeAgentElement>();
    const actionableElementsList: RuntimeAgentElement[] = [];
    const interactiveElementsSummary: string[] = [];
    const interactiveElementsList: InteractiveDOMElement[] = [];

    const candidateNodes = Array.from(
      document.body.querySelectorAll(
        'button, a, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="option"], [data-agent-action], [data-agent-label], [data-action], [data-testid], .btn, [onclick], details, summary, [tabindex="0"], [class*="card"], [class*="badge"], [class*="stat"], [class*="score"], [class*="alert"]'
      )
    ) as HTMLElement[];

    let elementCounter = 1;

    candidateNodes.forEach((el) => {
      const isDrawerChild = Boolean(el.closest('.smart-agent-drawer, .smart-mentor-drawer'));
      if (isDrawerChild) return; // Do not index the agent's own drawer controls as target page elements

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const isVisible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';

      if (!isVisible) return;

      const tag = el.tagName.toUpperCase();
      const text = el.textContent?.replace(/\s+/g, ' ').trim() || '';
      
      const dataAgentLabel = el.getAttribute('data-agent-label') || undefined;
      const dataAgentAction = el.getAttribute('data-agent-action') || undefined;
      const dataAgentDescription = el.getAttribute('data-agent-description') || undefined;
      const ariaLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || undefined;
      const title = el.getAttribute('title') || undefined;
      const role = el.getAttribute('role') || undefined;
      const testId = el.getAttribute('data-testid') || el.getAttribute('data-action') || undefined;
      const href = el.getAttribute('href') || undefined;
      const value = (el as HTMLInputElement).value || undefined;
      const placeholder = (el as HTMLInputElement).placeholder || undefined;
      const disabled = (el as HTMLButtonElement).disabled || el.hasAttribute('aria-disabled') || el.getAttribute('aria-disabled') === 'true';
      const ariaExpanded = el.hasAttribute('aria-expanded') ? el.getAttribute('aria-expanded') === 'true' : undefined;
      const ariaChecked = el.hasAttribute('aria-checked') ? el.getAttribute('aria-checked') === 'true' : ((el as HTMLInputElement).type === 'checkbox' ? (el as HTMLInputElement).checked : undefined);

      // Determine parent section
      let parentSection: RuntimeAgentElement['parentSection'] = 'other';
      if (el.closest('.sidebar-wrapper, aside, .sidebar, [class*="sidebar"]')) parentSection = 'sidebar';
      else if (el.closest('.navbar-wrapper, header, nav, .navbar, [class*="navbar"]')) parentSection = 'navbar';
      else if (el.closest('.modal, [role="dialog"], .modal-content, [class*="modal"], [class*="dialog"]')) parentSection = 'modal';
      else if (el.closest('main, .dashboard-main-container, .dashboard-content, .content-wrapper, #main-content')) parentSection = 'main';

      // Find parent card title if applicable
      const parentCardEl = el.closest('[class*="card"], article, section');
      const parentCardTitle = parentCardEl?.querySelector('h1, h2, h3, h4, h5, [class*="title"]')?.textContent?.trim();

      // Compute visual sentiment color via getComputedStyle
      const computedColor = getElementComputedColorInfo(el);

      const label = dataAgentLabel || dataAgentAction || ariaLabel || text || title || placeholder || testId || el.id || 'Interactive Element';

      if (label && label.length >= 1 && label.length < 150) {
        const runtimeId = `agent-el-${String(elementCounter).padStart(3, '0')}`;
        elementCounter++;

        // Attach runtime ID to live DOM element and store in registry (DOM/DTO separation)
        if (el.getAttribute('data-agent-runtime-id') !== runtimeId) {
          el.setAttribute('data-agent-runtime-id', runtimeId);
        }
        runtimeElementRegistry.set(runtimeId, el);

        const classNameStr = getClassNameString(el);

        let type: RuntimeAgentElement['type'] = 'other';
        if (tag === 'BUTTON' || role === 'button' || el.classList.contains('btn')) type = 'button';
        else if (tag === 'A' || href) type = 'link';
        else if (role === 'tab' || el.classList.contains('tab')) type = 'tab';
        else if (tag === 'INPUT' && (el as HTMLInputElement).type === 'checkbox') type = 'toggle';
        else if (tag === 'INPUT') type = 'input';
        else if (tag === 'TEXTAREA') type = 'textarea';
        else if (tag === 'SELECT') type = 'select';
        else if (role === 'menuitem') type = 'menu_item';
        else if (el.closest('.modal, [role="dialog"]')) type = 'modal_action';
        else if (el.classList.contains('card') || classNameStr.includes('card')) type = 'card';

        const agentEl: RuntimeAgentElement = {
          id: runtimeId,
          tag,
          role,
          text: label,
          ariaLabel,
          title,
          dataAgentLabel,
          dataAgentAction,
          dataAgentDescription,
          type,
          computedColor: computedColor ? { ...computedColor } : undefined,
          parentSection,
          parentCardTitle,
          href,
          value,
          placeholder,
          disabled: Boolean(disabled),
          visible: true,
          ariaExpanded,
          ariaChecked
        };

        elementsMap.set(runtimeId, agentEl);
        actionableElementsList.push({ ...agentEl });

        if (!interactiveElementsSummary.includes(label)) {
          interactiveElementsSummary.push(label);
        }

        interactiveElementsList.push({
          id: runtimeId,
          index: actionableElementsList.length,
          tag,
          type: type as InteractiveDOMElement['type'],
          text: label,
          ariaLabel,
          title,
          role,
          testId,
          dataAgentLabel,
          dataAgentAction,
          dataAgentDescription,
          computedColor: computedColor ? { ...computedColor } : undefined,
          href,
          value,
          placeholder,
          disabled: Boolean(disabled),
          visible: true,
          ariaExpanded,
          ariaChecked,
          parentSection: parentSection as InteractiveDOMElement['parentSection'],
          parentCardTitle
        });
      }
    });

    // 4. Modals, Dialogs, Popovers, Toasts, Drawers Detection
    const dialogs: LiveUISnapshot['dialogs'] = [];
    document.querySelectorAll('.modal, [role="dialog"], .toast, [class*="popover"], [class*="dialog"]').forEach((d) => {
      const rect = d.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && window.getComputedStyle(d).display !== 'none') {
        const modalTitle = d.querySelector('h1, h2, h3, h4, .modal-title, [class*="title"]')?.textContent?.trim();
        const dClassStr = getClassNameString(d);
        const isToast = d.classList.contains('toast') || dClassStr.includes('toast');
        const isPopover = dClassStr.includes('popover');
        dialogs.push({
          title: modalTitle,
          type: isToast ? 'toast' : isPopover ? 'popover' : 'modal'
        });
      }
    });

    // 5. Cards & Metrics Aggregation
    const cards: LiveUICard[] = [];
    const cardNodes = document.querySelectorAll('[class*="card"], article, section.stat-section, section.dashboard-section');
    
    cardNodes.forEach((cardEl, idx) => {
      if (cardEl.closest('.smart-agent-drawer, .smart-mentor-drawer')) return;
      const rect = cardEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const title = cardEl.querySelector('h1, h2, h3, h4, .card-title, [class*="title"]')?.textContent?.trim();
      const subtitle = cardEl.querySelector('p, .card-subtitle, .card-description, [class*="subtitle"], [class*="desc"]')?.textContent?.trim();

      const metrics: LiveUIMetric[] = [];
      cardEl.querySelectorAll('.stat-card-value, [class*="stat-value"], [class*="score"], [class*="metric"]').forEach((mEl) => {
        const valText = mEl.textContent?.trim();
        const lblText = mEl.previousElementSibling?.textContent?.trim() || mEl.nextElementSibling?.textContent?.trim() || mEl.parentElement?.querySelector('h3, h4, span, label')?.textContent?.trim() || 'Metric';
        if (valText) {
          const mColor = getElementComputedColorInfo(mEl as HTMLElement);
          metrics.push({
            label: lblText,
            value: valText,
            color: mColor ? { ...mColor } : undefined
          });
        }
      });

      const badges: LiveUIPageBadge[] = [];
      cardEl.querySelectorAll('[class*="badge"], [class*="tag"], [class*="status"], [data-badge]').forEach((bEl) => {
        const bText = bEl.textContent?.trim();
        if (bText) {
          const colorInfo = getElementComputedColorInfo(bEl as HTMLElement);
          badges.push({
            text: bText,
            semanticColor: colorInfo?.semanticColor || 'neutral',
            elementId: bEl.getAttribute('data-agent-runtime-id') || undefined
          });
        }
      });

      const actionableElementIds: string[] = [];
      cardEl.querySelectorAll('[data-agent-runtime-id]').forEach((actionable) => {
        const id = actionable.getAttribute('data-agent-runtime-id');
        if (id) actionableElementIds.push(id);
      });

      const href = cardEl.getAttribute('href') || cardEl.querySelector('a')?.getAttribute('href') || undefined;

      if (title || metrics.length > 0 || badges.length > 0 || actionableElementIds.length > 0) {
        cards.push({
          id: cardEl.id || `card_${idx + 1}`,
          title,
          subtitle,
          metrics: metrics.length > 0 ? metrics : undefined,
          badges: badges.length > 0 ? badges : undefined,
          parentSection: cardEl.closest('main') ? 'main' : 'other',
          actionableElementIds,
          href
        });
      }
    });

    // 6. Visible Alerts Detection
    const alerts: LiveUIAlert[] = [];
    document.querySelectorAll('[role="alert"], .alert, .notice-banner, .error-banner, [class*="alert"], [class*="banner"]').forEach((alertEl) => {
      const rect = alertEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const text = alertEl.textContent?.trim();
      if (text) {
        const colorInfo = getElementComputedColorInfo(alertEl as HTMLElement);
        const lowerClass = getClassNameString(alertEl).toLowerCase();
        let type: LiveUIAlert['type'] = 'info';
        if (lowerClass.includes('error') || colorInfo?.semanticColor === 'red') type = 'error';
        else if (lowerClass.includes('warn') || colorInfo?.semanticColor === 'yellow') type = 'warning';
        else if (lowerClass.includes('success') || colorInfo?.semanticColor === 'green') type = 'success';

        alerts.push({
          type,
          text,
          semanticColor: colorInfo?.semanticColor || (type === 'error' ? 'red' : type === 'success' ? 'green' : type === 'warning' ? 'yellow' : 'cyan')
        });
      }
    });

    // 7. Active Tab & Focused Element
    let activeTab: string | undefined = undefined;
    const activeTabEl = document.querySelector('[role="tab"][aria-selected="true"], .tab.active, [class*="tab"][class*="active"]');
    if (activeTabEl) {
      activeTab = activeTabEl.textContent?.trim();
    }

    const focusedElementId = document.activeElement?.getAttribute('data-agent-runtime-id') || document.activeElement?.id || undefined;

    // 8. Sidebar State
    const sidebarEl = document.querySelector('.sidebar-wrapper, aside, .sidebar');
    let sidebarState: LiveUISnapshot['sidebarState'] = 'hidden';
    if (sidebarEl) {
      const sRect = sidebarEl.getBoundingClientRect();
      sidebarState = sRect.width > 200 ? 'expanded' : sRect.width > 0 ? 'collapsed' : 'hidden';
    }

    // 9. Create LiveUISnapshot
    const snapshot: LiveUISnapshot = {
      route,
      pageTitle: docTitle,
      scrollPosition: { top: window.scrollY, left: window.scrollX },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      sidebarState,
      activeTab,
      focusedElementId,
      dialogs,
      visibleSections: [
        { id: 'sec_navbar', title: 'Navbar', type: 'navbar', elementsCount: actionableElementsList.filter(e => e.parentSection === 'navbar').length },
        { id: 'sec_sidebar', title: 'Sidebar', type: 'sidebar', elementsCount: actionableElementsList.filter(e => e.parentSection === 'sidebar').length },
        { id: 'sec_main', title: 'Main Content', type: 'section', elementsCount: actionableElementsList.filter(e => e.parentSection === 'main').length },
        ...(dialogs.length > 0 ? [{ id: 'sec_modal', title: dialogs[0].title || 'Modal Dialog', type: 'modal' as const, elementsCount: actionableElementsList.filter(e => e.parentSection === 'modal').length }] : [])
      ],
      cards,
      elementsMap,
      actionableElements: actionableElementsList,
      visibleText: fullPageLines.slice(0, 150),
      alerts,
      timestamp: now
    };

    // Assert serializability in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      validateLiveUISnapshotSerializable(snapshot);
    }

    // 10. Entity Extraction
    let currentEntity: LivePageContext['currentEntity'] = undefined;
    const visibleEntities: LivePageContext['visibleEntities'] = {};
    const importantIds: Record<string, string> = {};

    if (route.includes('/code-arena/problems/')) {
      const probIdFromUrl = route.split('/code-arena/problems/')[1]?.split('?')[0];
      const h1Title = document.querySelector('h1')?.textContent?.trim() || mainHeadings[0] || 'DSA Problem';
      const difficultyBadge = document.querySelector('[class*="difficulty"], [data-difficulty]')?.textContent?.trim();
      const solvedBadge = Boolean(document.querySelector('[class*="solved"], [data-solved]'));
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
      cards.forEach((card, idx) => {
        if (card.title) {
          sheetCards.push({
            id: card.id || `sheet_${idx + 1}`,
            title: card.title
          });
        }
      });
      if (sheetCards.length > 0) {
        visibleEntities.sheets = sheetCards.slice(0, 25);
      }
    }

    const isErrorState = alerts.some(a => a.type === 'error') || document.querySelector('.error-banner') !== null;
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
      snapshot,
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
  } finally {
    isScanningDOM = false;
  }
}

/**
 * Validates whether the provided LivePageContext is fresh, matching the expected route,
 * and populated with interactive elements/sections. If stale, missing, or empty unexpectedly,
 * synchronously invalidates cache and extracts a fresh LiveUISnapshot with 1 retry.
 */
export function validateAndRefreshSnapshot(liveContext?: LivePageContext, expectedRoute?: string): LivePageContext {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return liveContext || buildDefaultLiveContext(expectedRoute || '/dashboard');
  }

  const currentRoute = window.location.pathname + window.location.search;
  const targetRoute = expectedRoute || currentRoute;
  
  const normCurrent = targetRoute.split('?')[0].split('#')[0].replace(/\/$/, '').toLowerCase();
  const normCtxRoute = (liveContext?.route || '').split('?')[0].split('#')[0].replace(/\/$/, '').toLowerCase();

  const isMissing = !liveContext || !liveContext.snapshot;
  const snap = liveContext?.snapshot;
  const hasContent = Boolean(
    snap && (
      (snap.visibleSections && snap.visibleSections.length > 0) ||
      (snap.cards && snap.cards.length > 0) ||
      (snap.actionableElements && snap.actionableElements.length > 0) ||
      (snap.visibleText && snap.visibleText.length > 0)
    )
  );

  const isEmpty = !hasContent || !liveContext?.interactiveElementsList || liveContext.interactiveElementsList.length === 0;
  const isStale = liveContext?.timestamp ? (Date.now() - liveContext.timestamp > 2500) : true;
  const isRouteMismatch = normCtxRoute !== normCurrent;

  if (isMissing || isEmpty || isStale || isRouteMismatch) {
    invalidateDOMCache();
    const fresh = extractLiveDOMContext(targetRoute, true);
    if (!fresh.interactiveElementsList || fresh.interactiveElementsList.length === 0) {
      // Retry once if first scan returned empty
      invalidateDOMCache();
      return extractLiveDOMContext(targetRoute, true);
    }
    return fresh;
  }

  return liveContext;
}

/**
 * Formats a concise, structured markdown summary from a live page context / LiveUISnapshot.
 * Output structure:
 * Page: [Title/Route]
 *
 * Sections:
 * - Section 1
 *
 * Cards:
 * - Card 1
 *
 * Actions:
 * - Action 1
 */
export function formatLiveSnapshotSummary(liveCtx?: LivePageContext, targetFilter?: 'all' | 'sidebar' | 'strengths'): string {
  if (!liveCtx || !liveCtx.snapshot) {
    return "I couldn't read the current page. Please try again.";
  }

  const snapshot = liveCtx.snapshot;
  const pageName = liveCtx.pageTitle || snapshot.pageTitle || liveCtx.route || 'Current Page';

  if (targetFilter === 'sidebar') {
    const sidebarEls = (liveCtx.interactiveElementsList || []).filter(e => e.parentSection === 'sidebar');
    const items = Array.from(new Set(
      sidebarEls
        .map(e => e.text || e.ariaLabel || e.title)
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 1)
    ));
    if (items.length > 0) {
      return `**Page:** ${pageName} (Sidebar)\n\n**Sidebar Navigation Items:**\n` + items.map(i => `- ${i}`).join('\n');
    }
  }

  if (targetFilter === 'strengths') {
    const strengthCards = (snapshot.cards || []).filter(c => {
      const title = (c.title || '').toLowerCase();
      const sub = (c.subtitle || '').toLowerCase();
      return title.includes('strength') || title.includes('readiness') || title.includes('improve') || sub.includes('strength');
    });

    const metrics = (snapshot.cards || []).flatMap(c => c.metrics || []).filter(m => {
      const lbl = (m.label || '').toLowerCase();
      return lbl.includes('strength') || lbl.includes('readiness') || m.color?.semanticColor === 'green' || m.color?.semanticColor === 'yellow';
    });

    const badges = (snapshot.cards || []).flatMap(c => c.badges || []);

    if (strengthCards.length > 0 || metrics.length > 0 || badges.length > 0) {
      const cardsStr = strengthCards.length > 0 
        ? `**Strength & Learning Cards:**\n` + strengthCards.map(c => `- **${c.title}**: ${c.subtitle || ''} ${c.metrics ? c.metrics.map(m => `${m.label}: ${m.value}`).join(', ') : ''}`).join('\n')
        : '';
      
      const metricsStr = metrics.length > 0
        ? `\n\n**Key Performance Metrics:**\n` + metrics.map(m => `- ${m.label}: **${m.value}**`).join('\n')
        : '';

      const badgesStr = badges.length > 0
        ? `\n\n**Badges & Strengths:**\n` + badges.slice(0, 10).map(b => `- [${b.semanticColor.toUpperCase()}] ${b.text}`).join('\n')
        : '';

      return `**Page:** ${pageName}\n\n${cardsStr}${metricsStr}${badgesStr}`.trim();
    }
  }

  const sections = (snapshot.visibleSections || [])
    .map(s => s.title)
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0);

  const cards = (snapshot.cards || [])
    .map(c => c.title)
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0);

  const elementsList = liveCtx.interactiveElementsList || [];
  const actions = Array.from(new Set(
    elementsList
      .map(e => e.text || e.ariaLabel || e.dataAgentLabel || e.title)
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 1 && t.trim().length < 60)
  )).slice(0, 15);

  const sectionsStr = sections.length > 0 
    ? `**Sections:**\n` + sections.map(s => `- ${s}`).join('\n') 
    : '';

  const cardsStr = cards.length > 0 
    ? `**Cards:**\n` + cards.map(c => `- ${c}`).join('\n') 
    : '';

  const actionsStr = actions.length > 0 
    ? `**Actions:**\n` + actions.map(a => `- ${a}`).join('\n') 
    : '';

  const parts = [
    `**Page:** ${pageName}`,
    sectionsStr,
    cardsStr,
    actionsStr
  ].filter(Boolean);

  if (parts.length <= 1) {
    const headings = (liveCtx.visibleHeadings || []).slice(0, 10);
    if (headings.length > 0) {
      return `**Page:** ${pageName}\n\n**Headings:**\n` + headings.map(h => `- ${h}`).join('\n');
    }
    const visibleText = liveCtx.visibleTextContent?.slice(0, 400);
    if (visibleText) {
      return `**Page:** ${pageName}\n\n**Content:**\n${visibleText}`;
    }
  }

  return parts.join('\n\n');
}



