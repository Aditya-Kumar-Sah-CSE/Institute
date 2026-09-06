import { InteractiveDOMElement } from './live-page-context';

export interface DOMActionResult {
  success: boolean;
  message: string;
  actionType: string;
  targetElementText?: string;
  urlChanged?: boolean;
  newRoute?: string;
  errorDetected?: boolean;
  errorMessage?: string;
  data?: any;
}

/**
 * Client-side Live DOM Executor.
 * Enables Smart Agent to discover, click, type into, toggle, submit, and interact
 * with any interactive DOM element on the open page while verifying resulting state.
 */
export function executeLiveDOMAction(
  actionType: 'click' | 'open' | 'edit' | 'save' | 'cancel' | 'delete' | 'select' | 'toggle' | 'submit' | 'close' | 'type' | 'clear' | 'navigate',
  query: string | number,
  valueToType?: string,
  elementIndex?: number
): DOMActionResult {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      success: false,
      message: 'Client DOM interaction is unavailable outside browser environment.',
      actionType
    };
  }

  try {
    const currentRoute = window.location.pathname + window.location.search;

    // 1. Gather all candidate interactive elements currently in the DOM
    const rawElements = Array.from(
      document.querySelectorAll(
        'button, a, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="option"], [data-action], .btn, [onclick], details, summary, [tabindex="0"]'
      )
    ) as HTMLElement[];

    const candidates: { el: HTMLElement; text: string; ariaLabel: string; title: string; id: string; name: string; tag: string; role: string; index: number }[] = [];

    rawElements.forEach((el, idx) => {
      // Filter out invisible elements except drawer buttons
      const isDrawerChild = el.closest('.smart-agent-drawer, .smart-mentor-drawer');
      const rect = el.getBoundingClientRect();
      const isVisible = isDrawerChild || (rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden');
      
      if (!isVisible) return;

      const text = el.textContent?.replace(/\s+/g, ' ').trim() || '';
      const ariaLabel = el.getAttribute('aria-label') || '';
      const title = el.getAttribute('title') || '';
      const id = el.id || '';
      const name = el.getAttribute('name') || '';
      const placeholder = (el as HTMLInputElement).placeholder || '';
      const value = (el as HTMLInputElement).value || '';
      const tag = el.tagName.toUpperCase();
      const role = el.getAttribute('role') || '';

      const compositeSearchStr = `${text} ${ariaLabel} ${title} ${id} ${name} ${placeholder} ${value}`.toLowerCase();

      candidates.push({
        el,
        text: text || ariaLabel || title || placeholder || id || name,
        ariaLabel,
        title,
        id,
        name,
        tag,
        role,
        index: candidates.length + 1
      });
    });

    if (candidates.length === 0) {
      return {
        success: false,
        message: 'No interactive elements found on the open page.',
        actionType
      };
    }

    // 2. Locate target element by index, exact query, or fuzzy match
    let targetCandidate: typeof candidates[0] | undefined;

    const queryString = String(query).trim().toLowerCase();

    // Strategy A: Direct Index Match
    if (typeof query === 'number' || !isNaN(Number(query))) {
      const idx = Number(query);
      targetCandidate = candidates.find(c => c.index === idx);
    }

    // Strategy B: Exact text / label match
    if (!targetCandidate) {
      targetCandidate = candidates.find(c => {
        const t = c.text.toLowerCase();
        return t === queryString || c.ariaLabel.toLowerCase() === queryString || c.id.toLowerCase() === queryString;
      });
    }

    // Strategy C: Substring / Keyword Match
    if (!targetCandidate) {
      targetCandidate = candidates.find(c => {
        const fullStr = `${c.text} ${c.ariaLabel} ${c.title} ${c.id} ${c.name}`.toLowerCase();
        return fullStr.includes(queryString);
      });
    }

    // Strategy D: Action-specific Fallback (e.g. "submit", "save", "cancel", "close")
    if (!targetCandidate) {
      const actionSynonyms: Record<string, string[]> = {
        save: ['save', 'submit', 'update', 'done', 'apply'],
        cancel: ['cancel', 'close', 'back', 'dismiss', 'discard'],
        close: ['close', 'x', 'cancel', 'dismiss', 'hide'],
        edit: ['edit', 'modify', 'change', 'update'],
        delete: ['delete', 'remove', 'trash', 'clear']
      };

      const synonyms = actionSynonyms[actionType] || [queryString];
      targetCandidate = candidates.find(c => {
        const fullStr = `${c.text} ${c.ariaLabel} ${c.title}`.toLowerCase();
        return synonyms.some(s => fullStr.includes(s));
      });
    }

    if (!targetCandidate) {
      const availableLabels = candidates.slice(0, 12).map(c => `"${c.text}"`).join(', ');
      return {
        success: false,
        message: `Could not locate element "${query}" on the current page. Available interactive elements: ${availableLabels}.`,
        actionType
      };
    }

    const targetEl = targetCandidate.el;
    const targetLabel = targetCandidate.text || queryString;

    // 3. Perform Action (Type vs Click/Select/Toggle)
    if (actionType === 'type' || targetEl.tagName === 'INPUT' || targetEl.tagName === 'TEXTAREA') {
      if (valueToType !== undefined) {
        targetEl.focus();
        if ('value' in targetEl) {
          (targetEl as HTMLInputElement).value = valueToType;
        }
        targetEl.dispatchEvent(new Event('input', { bubbles: true }));
        targetEl.dispatchEvent(new Event('change', { bubbles: true }));
        targetEl.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      }
    }

    // Dispatch full click & mouse event sequence
    targetEl.focus();
    targetEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
    targetEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    targetEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));

    if (typeof targetEl.click === 'function') {
      targetEl.click();
    } else {
      targetEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }

    // 4. Verify Immediate Resulting UI State
    let urlChanged = false;
    let newRoute = window.location.pathname + window.location.search;
    if (newRoute !== currentRoute) {
      urlChanged = true;
    }

    // Check for error banner or 404
    const errorBanner = document.querySelector('.error-banner, [class*="error"], .toast-error');
    const is404 = document.body.textContent?.includes('404') || document.title?.includes('Not Found');

    if (is404) {
      return {
        success: false,
        message: `Clicked "${targetLabel}", but the target page resulted in a 404 Not Found error.`,
        actionType,
        targetElementText: targetLabel,
        errorDetected: true,
        errorMessage: '404 Page Not Found'
      };
    }

    if (errorBanner) {
      const errTxt = errorBanner.textContent?.trim() || 'Error encountered after action.';
      return {
        success: false,
        message: `Executed "${actionType}" on "${targetLabel}", but encountered an error: ${errTxt}`,
        actionType,
        targetElementText: targetLabel,
        errorDetected: true,
        errorMessage: errTxt
      };
    }

    return {
      success: true,
      message: urlChanged 
        ? `Successfully clicked "${targetLabel}" and navigated to ${newRoute}.`
        : `Successfully executed ${actionType} on "${targetLabel}".`,
      actionType,
      targetElementText: targetLabel,
      urlChanged,
      newRoute
    };
  } catch (err: any) {
    console.error('[executeLiveDOMAction] Failure:', err);
    return {
      success: false,
      message: `Failed to interact with element "${query}": ${err.message || 'DOM error'}`,
      actionType,
      errorDetected: true,
      errorMessage: err.message
    };
  }
}
