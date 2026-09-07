import { InteractiveDOMElement } from './live-page-context';
import { extractLiveDOMContext, invalidateDOMCache, runtimeElementRegistry } from './live-dom-reader';
import { RuntimeAgentElement, SemanticColorChannel, classifyRGBToSemanticColor } from './live-ui-snapshot';
import { setAgentVisualState } from './agent-visual-state';

export type WhitelistedActionType = 
  | 'click' 
  | 'focus' 
  | 'type' 
  | 'select' 
  | 'scroll' 
  | 'open' 
  | 'close' 
  | 'navigate' 
  | 'toggle' 
  | 'clear';

export interface DOMActionTelemetry {
  snapshotGenTimeMs: number;
  resolutionTimeMs: number;
  executionTimeMs: number;
  verificationTimeMs: number;
  totalLatencyMs: number;
  staleElementDetected: boolean;
  retryAttempted: boolean;
  intentResolutionMs?: number;
  fastPathResolutionMs?: number;
  domResolutionMs?: number;
  executionMs?: number;
  routeNavigationMs?: number;
  pageReadyMs?: number;
  // Execution Telemetry
  targetResolved?: boolean;
  targetRuntimeId?: string;
  targetConnected?: boolean;
  targetVisible?: boolean;
  targetEnabled?: boolean;
  targetRect?: { top: number; left: number; width: number; height: number };
  actionResolved?: boolean;
  actionRuntimeId?: string;
  clickStarted?: boolean;
  clickEventDispatched?: boolean;
  nativeClickCalled?: boolean;
  navigationStarted?: boolean;
  routeChanged?: boolean;
  destinationVerified?: boolean;
}

export interface DOMActionResult {
  success: boolean;
  message: string;
  actionType: WhitelistedActionType;
  targetElementText?: string;
  targetElementId?: string;
  urlChanged?: boolean;
  newRoute?: string;
  expectedRoute?: string;
  expectedEntity?: {
    type: 'sheet' | 'problem' | 'course' | 'certificate';
    id: string;
    title?: string;
  };
  isAmbiguous?: boolean;
  matchingCandidates?: Array<{ id: string; text: string; section?: string }>;
  errorDetected?: boolean;
  errorMessage?: string;
  telemetry?: DOMActionTelemetry;
  data?: any;
}

// Global execution lock to prevent race conditions during concurrent clicks
let globalActionExecutionLock = false;
let lastActionTimestamp = 0;
const ACTION_LOCK_TIMEOUT_MS = 1200;

/**
 * Client-side Live DOM Executor (Hardened Production Architecture).
 * Enforces race condition locks, target revalidation, self-healing retries (max 1),
 * safe whitelisted actions, and honest post-action state verification.
 */
export function executeLiveDOMAction(
  actionType: WhitelistedActionType | string,
  query: string | number,
  valueToType?: string,
  elementIndex?: number
): DOMActionResult {
  const startTime = Date.now();
  let snapshotGenTimeMs = 0;
  let resolutionTimeMs = 0;
  let executionTimeMs = 0;
  let verificationTimeMs = 0;
  let staleElementDetected = false;
  let retryAttempted = false;

  // Normalize action type to whitelisted set
  const normalizedAction: WhitelistedActionType = 
    actionType === 'type' || actionType === 'edit' ? 'type'
    : actionType === 'select' ? 'select'
    : actionType === 'scroll' ? 'scroll'
    : actionType === 'focus' ? 'focus'
    : actionType === 'toggle' ? 'toggle'
    : actionType === 'clear' ? 'clear'
    : actionType === 'open' || actionType === 'close' ? (actionType as WhitelistedActionType)
    : actionType === 'navigate' ? 'navigate'
    : 'click';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      success: false,
      message: 'Client DOM interaction is unavailable outside browser environment.',
      actionType: normalizedAction
    };
  }

  // 1. Race-Condition Lock Protection
  const now = Date.now();
  if (globalActionExecutionLock && (now - lastActionTimestamp < ACTION_LOCK_TIMEOUT_MS)) {
    console.warn('[DOM Executor] Action execution rejected due to active concurrent execution lock.');
    return {
      success: false,
      message: 'Another action is currently executing. Please wait a moment.',
      actionType: normalizedAction
    };
  }

  globalActionExecutionLock = true;
  lastActionTimestamp = now;

  const releaseLock = () => {
    globalActionExecutionLock = false;
  };

  try {
    const currentRoute = window.location.pathname + window.location.search;

    const resolveTargetNode = (forceRefreshSnapshot = false): { targetElement?: RuntimeAgentElement; targetDomNode: HTMLElement | null; isAmbiguous?: boolean; candidates?: any[] } => {
      const snapStart = Date.now();
      const liveCtx = extractLiveDOMContext(currentRoute, forceRefreshSnapshot);
      snapshotGenTimeMs += Date.now() - snapStart;

      const snapshot = liveCtx.snapshot;
      const elementsMap = snapshot?.elementsMap;
      const queryString = String(query).trim();
      const queryLower = queryString.toLowerCase();

      let targetElement: RuntimeAgentElement | undefined = undefined;
      let targetDomNode: HTMLElement | null = null;

      // Strategy A: Direct Runtime ID Match via runtimeElementRegistry (DOM/DTO separation) with DOM fallback
      if (queryString.startsWith('agent-el-') && elementsMap && elementsMap.has(queryString)) {
        targetElement = elementsMap.get(queryString);
        const registered = runtimeElementRegistry.get(queryString);
        if (registered && document.body.contains(registered)) {
          targetDomNode = registered;
        } else {
          targetDomNode = document.querySelector(`[data-agent-runtime-id="${queryString}"]`) as HTMLElement | null;
        }
        if (!targetDomNode) {
          staleElementDetected = true;
        }
      }

      // Strategy B: Query Matching
      if (!targetDomNode && snapshot && snapshot.actionableElements.length > 0) {
        const candidates = snapshot.actionableElements;

        let colorFilter: SemanticColorChannel | undefined = undefined;
        if (queryLower.includes('red') || queryLower.includes('danger') || queryLower.includes('error')) colorFilter = 'red';
        else if (queryLower.includes('green') || queryLower.includes('success')) colorFilter = 'green';
        else if (queryLower.includes('yellow') || queryLower.includes('warning')) colorFilter = 'yellow';
        else if (queryLower.includes('cyan') || queryLower.includes('blue')) colorFilter = 'cyan';

        let sectionFilter: string | undefined = undefined;
        if (queryLower.includes('sidebar')) sectionFilter = 'sidebar';
        else if (queryLower.includes('navbar') || queryLower.includes('header')) sectionFilter = 'navbar';
        else if (queryLower.includes('modal') || queryLower.includes('dialog') || queryLower.includes('popup')) sectionFilter = 'modal';
        else if (queryLower.includes('main')) sectionFilter = 'main';

        const cleanQueryTokens = queryLower
          .replace(/\b(kholo|khol|open|show|dikhao|view|go|navigate|karo|kardo|wala|wali|wale|par|me|mein|ka|ki|ke|ko)\b/gi, ' ')
          .trim()
          .split(/\s+/)
          .filter(t => t.length > 0);

        const matched = candidates.filter((item) => {
          if (sectionFilter && item.parentSection !== sectionFilter) return false;
          if (colorFilter && item.computedColor?.semanticColor !== colorFilter) return false;

          const dataAction = (item.dataAgentAction || '').toLowerCase();
          const dataLabel = (item.dataAgentLabel || '').toLowerCase();
          const aria = (item.ariaLabel || '').toLowerCase();
          const text = item.text.toLowerCase();
          const cardTitle = (item.parentCardTitle || '').toLowerCase();
          const placeholder = (item.placeholder || '').toLowerCase();
          const combinedTargetText = `${text} ${dataLabel} ${dataAction} ${aria} ${cardTitle} ${placeholder}`;

          const fullMatch = Boolean(
            dataAction.includes(queryLower) ||
            dataLabel.includes(queryLower) ||
            aria.includes(queryLower) ||
            text.includes(queryLower) ||
            cardTitle.includes(queryLower) ||
            placeholder.includes(queryLower)
          );

          if (fullMatch) return true;

          // Token-based match: if clean tokens (e.g. "leetcode", "100", "basic") are present
          if (cleanQueryTokens.length > 0) {
            const matchCount = cleanQueryTokens.filter(tok => combinedTargetText.includes(tok)).length;
            return matchCount === cleanQueryTokens.length || (cleanQueryTokens.length > 1 && matchCount >= Math.ceil(cleanQueryTokens.length * 0.6));
          }

          return false;
        });

        if (matched.length > 1) {
          const exactMatch = matched.find(m => 
            m.text.toLowerCase() === queryLower || 
            m.dataAgentLabel?.toLowerCase() === queryLower ||
            m.dataAgentAction?.toLowerCase() === queryLower
          );

          if (exactMatch) {
            targetElement = exactMatch;
          } else {
            const isCardIntent = queryLower.includes('card');
            const isActionIntent = queryLower.includes('start') || queryLower.includes('button') || queryLower.includes('link') || queryLower.includes('open') || queryLower.includes('edit') || queryLower.includes('submit');

            const scored = matched.map((item) => {
              let score = 0;
              if (isCardIntent && item.type === 'card') score += 10;
              if (isActionIntent && item.type !== 'card') score += 10;
              if (item.dataAgentAction?.toLowerCase().includes(queryLower)) score += 8;
              if (item.dataAgentLabel?.toLowerCase().includes(queryLower)) score += 7;
              if (item.text.toLowerCase() === queryLower) score += 6;
              if (item.text.toLowerCase().includes(queryLower)) score += 4;
              if (item.parentCardTitle && queryLower.includes(item.parentCardTitle.toLowerCase())) score += 5;
              return { item, score };
            });

            scored.sort((a, b) => b.score - a.score);

            if (scored[0].score > (scored[1]?.score || 0) + 3) {
              targetElement = scored[0].item;
            } else {
              return {
                isAmbiguous: true,
                candidates: matched.slice(0, 5).map(m => ({
                  id: m.id,
                  text: m.text,
                  section: m.parentCardTitle ? `${m.parentSection} (${m.parentCardTitle})` : m.parentSection
                })),
                targetDomNode: null
              };
            }
          }
        } else if (matched.length === 1) {
          targetElement = matched[0];
        }

        if (targetElement) {
          const registered = runtimeElementRegistry.get(targetElement.id);
          if (registered && document.body.contains(registered)) {
            targetDomNode = registered;
          } else {
            targetDomNode = document.querySelector(`[data-agent-runtime-id="${targetElement.id}"]`) as HTMLElement | null;
          }
        }
      }

      // Fallback
      if (!targetDomNode) {
        const elByAttr = document.querySelector(`[data-agent-action="${queryString}"], [data-agent-label="${queryString}"], #${queryString}`) as HTMLElement;
        if (elByAttr) {
          targetDomNode = elByAttr;
        }
      }

      return { targetElement, targetDomNode };
    };

    // 2. Initial Resolution Attempt
    const resStart = Date.now();
    let resolution = resolveTargetNode(false);
    resolutionTimeMs += Date.now() - resStart;

    // Self-Healing Retry (Max 1 retry with force-refreshed DOM snapshot)
    if (!resolution.targetDomNode && !resolution.isAmbiguous) {
      console.log('[DOM Executor] Target element not found on first scan. Initiating self-healing DOM snapshot refresh...');
      retryAttempted = true;
      invalidateDOMCache();
      const retryStart = Date.now();
      resolution = resolveTargetNode(true);
      resolutionTimeMs += Date.now() - retryStart;
    }

    if (resolution.isAmbiguous && resolution.candidates) {
      releaseLock();
      return {
        success: false,
        message: `Multiple matching elements found for "${query}". Please specify which one you would like to interact with.`,
        actionType: normalizedAction,
        isAmbiguous: true,
        matchingCandidates: resolution.candidates
      };
    }

    const { targetElement, targetDomNode } = resolution;

    if (!targetDomNode) {
      releaseLock();
      return {
        success: false,
        message: `I couldn't complete that action because component "${query}" is unavailable or re-rendered.`,
        actionType: normalizedAction,
        telemetry: {
          intentResolutionMs: 0,
          fastPathResolutionMs: Date.now() - startTime,
          domResolutionMs: resolutionTimeMs,
          executionMs: 0,
          executionTimeMs: 0,
          routeNavigationMs: 0,
          pageReadyMs: 0,
          snapshotGenTimeMs,
          resolutionTimeMs,
          verificationTimeMs: 0,
          totalLatencyMs: Date.now() - startTime,
          staleElementDetected,
          retryAttempted
        }
      };
    }

    // 3. PRE-ACTION VERIFICATION: Target Revalidation
    const style = window.getComputedStyle(targetDomNode);
    const rect = targetDomNode.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    const isDisabled = Boolean((targetDomNode as HTMLButtonElement).disabled || targetDomNode.getAttribute('aria-disabled') === 'true');

    if (!isVisible || !document.body.contains(targetDomNode)) {
      releaseLock();
      return {
        success: false,
        message: `Cannot execute ${normalizedAction} because "${targetElement?.text || query}" is currently hidden or re-rendered.`,
        actionType: normalizedAction,
        targetElementId: targetElement?.id,
        targetElementText: targetElement?.text || String(query)
      };
    }

    if (isDisabled) {
      releaseLock();
      return {
        success: false,
        message: `Cannot execute ${normalizedAction} because "${targetElement?.text || query}" is currently disabled.`,
        actionType: normalizedAction,
        targetElementId: targetElement?.id,
        targetElementText: targetElement?.text || String(query)
      };
    }

    // Auto-open parent collapsed accordions/details
    const detailsParent = targetDomNode.closest('details');
    if (detailsParent && !detailsParent.open) {
      detailsParent.open = true;
    }
    const collapsedDropdown = targetDomNode.closest('[aria-expanded="false"]');
    if (collapsedDropdown && collapsedDropdown !== targetDomNode) {
      (collapsedDropdown as HTMLElement).click();
    }

    // 4. EXECUTE WHITELISTED ACTION
    const execStart = Date.now();
    const labelText = targetElement?.text || targetDomNode.textContent?.trim() || String(query);

    setAgentVisualState('targeting', {
      targetText: labelText,
      targetDomNode,
      targetElementId: targetElement?.id
    });

    if (normalizedAction === 'scroll') {
      setAgentVisualState('scrolling', { targetText: labelText, targetDomNode });
      targetDomNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
      invalidateDOMCache();
      executionTimeMs = Date.now() - execStart;
      releaseLock();
      setAgentVisualState('success', { message: `Scrolled to "${labelText}"` });
      return {
        success: true,
        message: `Scrolled to element "${labelText}".`,
        actionType: normalizedAction,
        targetElementId: targetElement?.id,
        targetElementText: labelText,
        telemetry: {
          snapshotGenTimeMs,
          resolutionTimeMs,
          executionTimeMs,
          verificationTimeMs: 0,
          totalLatencyMs: Date.now() - startTime,
          staleElementDetected,
          retryAttempted
        }
      };
    }

    if (normalizedAction === 'focus') {
      targetDomNode.focus();
      executionTimeMs = Date.now() - execStart;
      releaseLock();
      return {
        success: true,
        message: `Focused element "${labelText}".`,
        actionType: normalizedAction,
        targetElementId: targetElement?.id,
        targetElementText: labelText,
        telemetry: {
          snapshotGenTimeMs,
          resolutionTimeMs,
          executionTimeMs,
          verificationTimeMs: 0,
          totalLatencyMs: Date.now() - startTime,
          staleElementDetected,
          retryAttempted
        }
      };
    }

    if (normalizedAction === 'type' || targetDomNode.tagName === 'INPUT' || targetDomNode.tagName === 'TEXTAREA') {
      setAgentVisualState('typing', { targetText: labelText, targetDomNode });
      if (valueToType !== undefined) {
        targetDomNode.focus();
        if ('value' in targetDomNode) {
          (targetDomNode as HTMLInputElement).value = valueToType;
        }
        targetDomNode.dispatchEvent(new Event('input', { bubbles: true }));
        targetDomNode.dispatchEvent(new Event('change', { bubbles: true }));
        targetDomNode.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      }
    } else if (normalizedAction === 'clear') {
      targetDomNode.focus();
      if ('value' in targetDomNode) {
        (targetDomNode as HTMLInputElement).value = '';
      }
      targetDomNode.dispatchEvent(new Event('input', { bubbles: true }));
      targetDomNode.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      setAgentVisualState('clicking', { targetText: labelText, targetDomNode });
    }

    // Interaction Event Sequence
    // Card-to-child-action resolution: If target is a card container, find the preferred
    // child navigation action (e.g., "View Sheet" link) to ensure deterministic specific navigation
    let effectiveClickTarget = targetDomNode;
    let childActionResolved = false;

    if (targetElement && (targetElement.type === 'card' || targetElement.type === 'other') && targetDomNode) {
      const childActions = targetDomNode.querySelectorAll('a[href], button, [role="button"], [data-agent-action]');
      if (childActions.length > 0) {
        // Prioritize: "View Sheet" > any link with href > first button
        let preferredChild: HTMLElement | null = null;
        childActions.forEach((child) => {
          const childText = (child.textContent || '').toLowerCase().trim();
          const childHref = child.getAttribute('href') || '';
          if (
            childText.includes('view') ||
            childText.includes('sheet') ||
            childText.includes('open') ||
            childText.includes('start') ||
            childHref.includes('/sheets/') ||
            childHref.includes('/courses/')
          ) {
            if (!preferredChild) preferredChild = child as HTMLElement;
          }
        });
        // Fallback: first link with an href (most likely the navigation action)
        if (!preferredChild) {
          const firstLink = targetDomNode.querySelector('a[href]') as HTMLElement;
          if (firstLink) preferredChild = firstLink;
        }
        if (preferredChild) {
          effectiveClickTarget = preferredChild;
          childActionResolved = true;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[DOM Executor] Card-to-child resolved:', {
              cardTitle: targetElement.text?.slice(0, 40),
              childText: effectiveClickTarget.textContent?.trim()?.slice(0, 40),
              childHref: effectiveClickTarget.getAttribute('href')
            });
          }
        }
      }
    }

    // Visual Cursor Non-Blocking Movement:
    // 1) First emit card target highlight if card container
    if (childActionResolved && targetDomNode !== effectiveClickTarget) {
      setAgentVisualState('targeting', {
        targetText: targetElement?.text || 'Target Card',
        targetDomNode,
        targetElementId: targetElement?.id
      });
    }

    // 2) Emit action target highlight on effective click element (e.g. View Sheet button)
    const effectiveLabelText = effectiveClickTarget.textContent?.trim() || labelText;
    setAgentVisualState('targeting', {
      targetText: effectiveLabelText,
      targetDomNode: effectiveClickTarget,
      targetElementId: targetElement?.id
    });

    setAgentVisualState('clicking', {
      targetText: effectiveLabelText,
      targetDomNode: effectiveClickTarget
    });

    // Scroll into view if needed before dispatching click
    try {
      effectiveClickTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch {
      // Fallback
    }

    // Extract expected route & entity if target is a link or contains href
    const hrefAttr = effectiveClickTarget.getAttribute('href') || effectiveClickTarget.closest('a')?.getAttribute('href');
    let expectedRoute: string | undefined = undefined;
    let expectedEntity: DOMActionResult['expectedEntity'] = undefined;

    if (hrefAttr && !hrefAttr.startsWith('#') && !hrefAttr.startsWith('javascript:')) {
      expectedRoute = hrefAttr;
      if (hrefAttr.includes('/sheets/')) {
        const sheetId = hrefAttr.split('/sheets/')[1]?.split('?')[0];
        if (sheetId) {
          expectedEntity = {
            type: 'sheet',
            id: sheetId,
            title: labelText
          };
        }
      }
    }

    // Dispatch Event Sequence
    effectiveClickTarget.focus();
    effectiveClickTarget.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
    effectiveClickTarget.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    effectiveClickTarget.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));

    const clickEventDispatched = true;
    let nativeClickCalled = false;

    if (typeof effectiveClickTarget.click === 'function') {
      nativeClickCalled = true;
      effectiveClickTarget.click();
    } else {
      effectiveClickTarget.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }

    executionTimeMs = Date.now() - execStart;

    // Build Execution Telemetry
    const effectiveRect = effectiveClickTarget.getBoundingClientRect();
    const fullTelemetry: DOMActionTelemetry = {
      snapshotGenTimeMs,
      resolutionTimeMs,
      executionTimeMs,
      verificationTimeMs: 0,
      totalLatencyMs: Date.now() - startTime,
      staleElementDetected,
      retryAttempted,
      targetResolved: true,
      targetRuntimeId: targetElement?.id || 'dom-query',
      targetConnected: effectiveClickTarget.isConnected,
      targetVisible: effectiveRect.width > 0 && effectiveRect.height > 0,
      targetEnabled: !((effectiveClickTarget as HTMLButtonElement).disabled || effectiveClickTarget.getAttribute('aria-disabled') === 'true'),
      targetRect: {
        top: Math.round(effectiveRect.top),
        left: Math.round(effectiveRect.left),
        width: Math.round(effectiveRect.width),
        height: Math.round(effectiveRect.height)
      },
      actionResolved: true,
      actionRuntimeId: effectiveClickTarget.getAttribute('data-agent-runtime-id') || targetElement?.id,
      clickStarted: true,
      clickEventDispatched,
      nativeClickCalled,
      navigationStarted: Boolean(expectedRoute),
      routeChanged: false,
      destinationVerified: false
    };

    // Automatic Link Navigation Fallback if router event didn't trigger immediately
    if (expectedRoute) {
      setAgentVisualState('navigating', { targetText: effectiveLabelText, targetDomNode: effectiveClickTarget });
      setTimeout(() => {
        const pathNow = window.location.pathname + window.location.search;
        if (pathNow !== expectedRoute && !pathNow.startsWith(expectedRoute)) {
          window.location.assign(expectedRoute);
        }
      }, 150);
    }

    // 5. POST-ACTION VERIFICATION
    const verStart = Date.now();
    setAgentVisualState('verifying', { targetDomNode: effectiveClickTarget });
    invalidateDOMCache();

    let urlChanged = false;
    let newRoute = window.location.pathname + window.location.search;
    if (newRoute !== currentRoute) {
      urlChanged = true;
      fullTelemetry.routeChanged = true;
    }

    const errorBanner = document.querySelector('.error-banner, [class*="error"], .toast-error');
    verificationTimeMs = Date.now() - verStart;

    releaseLock();

    if (errorBanner) {
      setAgentVisualState('error', { message: 'Action error encountered' });
    } else {
      setAgentVisualState('success', { message: 'Action completed' });
    }

    if (errorBanner) {
      const errTxt = errorBanner.textContent?.trim() || 'Error encountered after execution';
      return {
        success: false,
        message: `Executed ${normalizedAction} on "${effectiveLabelText}", but encountered error: ${errTxt}`,
        actionType: normalizedAction,
        targetElementId: targetElement?.id,
        targetElementText: effectiveLabelText,
        errorDetected: true,
        errorMessage: errTxt,
        telemetry: fullTelemetry
      };
    }

    return {
      success: true,
      message: urlChanged
        ? `Successfully executed ${normalizedAction} on "${effectiveLabelText}" and navigated to ${newRoute}.`
        : `Successfully executed ${normalizedAction} on "${effectiveLabelText}".`,
      actionType: normalizedAction,
      targetElementId: targetElement?.id,
      targetElementText: effectiveLabelText,
      expectedRoute,
      expectedEntity,
      urlChanged,
      newRoute,
      telemetry: fullTelemetry
    };
  } catch (err: any) {
    releaseLock();
    console.error('[executeLiveDOMAction] Error:', err);
    return {
      success: false,
      message: `Failed to execute action on "${query}": ${err.message || 'DOM action error'}`,
      actionType: 'click',
      errorDetected: true,
      errorMessage: err.message,
      telemetry: {
        snapshotGenTimeMs,
        resolutionTimeMs,
        executionTimeMs,
        verificationTimeMs: 0,
        totalLatencyMs: Date.now() - startTime,
        staleElementDetected,
        retryAttempted
      }
    };
  }
}


