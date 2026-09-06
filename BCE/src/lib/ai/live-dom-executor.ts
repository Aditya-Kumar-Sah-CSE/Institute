import { InteractiveDOMElement } from './live-page-context';
import { extractLiveDOMContext, invalidateDOMCache } from './live-dom-reader';
import { RuntimeAgentElement, SemanticColorChannel, classifyRGBToSemanticColor } from './live-ui-snapshot';

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
}

export interface DOMActionResult {
  success: boolean;
  message: string;
  actionType: WhitelistedActionType;
  targetElementText?: string;
  targetElementId?: string;
  urlChanged?: boolean;
  newRoute?: string;
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

      // Strategy A: Direct Runtime ID Match
      if (queryString.startsWith('agent-el-') && elementsMap && elementsMap.has(queryString)) {
        targetElement = elementsMap.get(queryString);
        const cachedNode = targetElement?.domNode as HTMLElement | undefined;
        if (cachedNode && document.body.contains(cachedNode)) {
          targetDomNode = cachedNode;
        } else {
          staleElementDetected = true;
          targetDomNode = document.querySelector(`[data-agent-runtime-id="${queryString}"]`) as HTMLElement | null;
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

        const matched = candidates.filter((item) => {
          if (sectionFilter && item.parentSection !== sectionFilter) return false;
          if (colorFilter && item.computedColor?.semanticColor !== colorFilter) return false;

          const dataActionMatch = item.dataAgentAction?.toLowerCase().includes(queryLower);
          const dataLabelMatch = item.dataAgentLabel?.toLowerCase().includes(queryLower);
          const ariaMatch = item.ariaLabel?.toLowerCase().includes(queryLower);
          const textMatch = item.text.toLowerCase().includes(queryLower);
          const cardMatch = item.parentCardTitle?.toLowerCase().includes(queryLower);
          const placeholderMatch = item.placeholder?.toLowerCase().includes(queryLower);

          return Boolean(dataActionMatch || dataLabelMatch || ariaMatch || textMatch || cardMatch || placeholderMatch);
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
          targetDomNode = (targetElement.domNode as HTMLElement) || document.querySelector(`[data-agent-runtime-id="${targetElement.id}"]`);
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
          snapshotGenTimeMs,
          resolutionTimeMs,
          executionTimeMs: 0,
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

    if (normalizedAction === 'scroll') {
      targetDomNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
      invalidateDOMCache();
      executionTimeMs = Date.now() - execStart;
      releaseLock();
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
    }

    // Interaction Event Sequence
    targetDomNode.focus();
    targetDomNode.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
    targetDomNode.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    targetDomNode.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));

    if (typeof targetDomNode.click === 'function') {
      targetDomNode.click();
    } else {
      targetDomNode.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }

    executionTimeMs = Date.now() - execStart;

    // Automatic Link Navigation Fallback
    const hrefAttr = targetDomNode.getAttribute('href') || targetDomNode.closest('a')?.getAttribute('href');
    if (hrefAttr && !hrefAttr.startsWith('#') && !hrefAttr.startsWith('javascript:')) {
      setTimeout(() => {
        const pathNow = window.location.pathname + window.location.search;
        if (pathNow !== hrefAttr && !pathNow.startsWith(hrefAttr)) {
          window.location.assign(hrefAttr);
        }
      }, 120);
    }

    // 5. POST-ACTION VERIFICATION
    const verStart = Date.now();
    invalidateDOMCache();

    let urlChanged = false;
    let newRoute = window.location.pathname + window.location.search;
    if (newRoute !== currentRoute) {
      urlChanged = true;
    }

    const errorBanner = document.querySelector('.error-banner, [class*="error"], .toast-error');
    verificationTimeMs = Date.now() - verStart;

    releaseLock();

    if (errorBanner) {
      const errTxt = errorBanner.textContent?.trim() || 'Error encountered after execution';
      return {
        success: false,
        message: `Executed ${normalizedAction} on "${labelText}", but encountered error: ${errTxt}`,
        actionType: normalizedAction,
        targetElementId: targetElement?.id,
        targetElementText: labelText,
        errorDetected: true,
        errorMessage: errTxt,
        telemetry: {
          snapshotGenTimeMs,
          resolutionTimeMs,
          executionTimeMs,
          verificationTimeMs,
          totalLatencyMs: Date.now() - startTime,
          staleElementDetected,
          retryAttempted
        }
      };
    }

    return {
      success: true,
      message: urlChanged
        ? `Successfully executed ${normalizedAction} on "${labelText}" and navigated to ${newRoute}.`
        : `Successfully executed ${normalizedAction} on "${labelText}".`,
      actionType: normalizedAction,
      targetElementId: targetElement?.id,
      targetElementText: labelText,
      urlChanged,
      newRoute,
      telemetry: {
        snapshotGenTimeMs,
        resolutionTimeMs,
        executionTimeMs,
        verificationTimeMs,
        totalLatencyMs: Date.now() - startTime,
        staleElementDetected,
        retryAttempted
      }
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


