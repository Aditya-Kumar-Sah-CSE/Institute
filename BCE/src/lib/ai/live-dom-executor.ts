import { InteractiveDOMElement } from './live-page-context';
import { invalidateDOMCache } from './live-dom-reader';

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
 * Enables Smart Agent to discover, verify, click, type into, toggle, submit, and interact
 * with any UI component on the open page while enforcing pre-action & post-action verification.
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

    // 1. Gather all candidate interactive elements using stable selectors
    const rawElements = Array.from(
      document.querySelectorAll(
        'button, a, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="option"], [data-action], [data-testid], .btn, [onclick], details, summary, [tabindex="0"]'
      )
    ) as HTMLElement[];

    const candidates: { 
      el: HTMLElement; 
      text: string; 
      ariaLabel: string; 
      title: string; 
      id: string; 
      name: string; 
      testId: string;
      tag: string; 
      role: string; 
      index: number;
      disabled: boolean;
    }[] = [];

    rawElements.forEach((el) => {
      const isDrawerChild = el.closest('.smart-agent-drawer, .smart-mentor-drawer');
      const rect = el.getBoundingClientRect();
      const isVisible = isDrawerChild || (rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden');
      
      if (!isVisible) return;

      const text = el.textContent?.replace(/\s+/g, ' ').trim() || '';
      const ariaLabel = el.getAttribute('aria-label') || '';
      const title = el.getAttribute('title') || '';
      const id = el.id || '';
      const name = el.getAttribute('name') || '';
      const testId = el.getAttribute('data-testid') || el.getAttribute('data-action') || '';
      const placeholder = (el as HTMLInputElement).placeholder || '';
      const value = (el as HTMLInputElement).value || '';
      const tag = el.tagName.toUpperCase();
      const role = el.getAttribute('role') || '';
      const disabled = Boolean((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true');

      candidates.push({
        el,
        text: text || ariaLabel || title || placeholder || testId || id || name,
        ariaLabel,
        title,
        id,
        name,
        testId,
        tag,
        role,
        disabled,
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

    // 2. Locate target element by index, test ID, exact query, or fuzzy match
    let targetCandidate: typeof candidates[0] | undefined;
    const queryString = String(query).trim().toLowerCase();

    // Strategy A: Direct Index Match
    if (typeof query === 'number' || !isNaN(Number(query))) {
      const idx = Number(query);
      targetCandidate = candidates.find(c => c.index === idx);
    }

    // Strategy B: Data-TestID / ID Exact Match
    if (!targetCandidate) {
      targetCandidate = candidates.find(c => 
        c.testId.toLowerCase() === queryString || 
        c.id.toLowerCase() === queryString ||
        c.ariaLabel.toLowerCase() === queryString
      );
    }

    // Strategy C: Exact text match
    if (!targetCandidate) {
      targetCandidate = candidates.find(c => c.text.toLowerCase() === queryString);
    }

    // Strategy D: Substring / Keyword Match
    if (!targetCandidate) {
      targetCandidate = candidates.find(c => {
        const fullStr = `${c.text} ${c.ariaLabel} ${c.title} ${c.testId} ${c.id} ${c.name}`.toLowerCase();
        return fullStr.includes(queryString);
      });
    }

    // Strategy E: Action-specific Fallback
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
        const fullStr = `${c.text} ${c.ariaLabel} ${c.title} ${c.testId}`.toLowerCase();
        return synonyms.some(s => fullStr.includes(s));
      });
    }

    if (!targetCandidate) {
      const availableLabels = candidates.slice(0, 12).map(c => `"${c.text}"`).join(', ');
      return {
        success: false,
        message: `Could not locate component "${query}" on the active page. Accessible components: ${availableLabels}.`,
        actionType
      };
    }

    const targetEl = targetCandidate.el;
    const targetLabel = targetCandidate.text || queryString;

    // 3. PRE-ACTION VERIFICATION: Check if component is enabled & operable
    if (targetCandidate.disabled) {
      return {
        success: false,
        message: `Cannot execute ${actionType} on "${targetLabel}" because it is currently disabled or unavailable.`,
        actionType,
        targetElementText: targetLabel
      };
    }

    // 3B. Auto-Open Collapsed / Hidden Parents (details, collapsed dropdowns, sidebar accordions)
    const detailsParent = targetEl.closest('details');
    if (detailsParent && !detailsParent.open) {
      console.log('[DOM Executor] Auto-opening collapsed details container for element:', targetLabel);
      detailsParent.open = true;
    }

    const collapsedDropdown = targetEl.closest('[aria-expanded="false"]');
    if (collapsedDropdown && collapsedDropdown !== targetEl) {
      console.log('[DOM Executor] Auto-expanding parent dropdown menu for element:', targetLabel);
      (collapsedDropdown as HTMLElement).click();
    }

    // 4. Perform Action (Type vs Click/Select/Toggle)
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

    // Dispatch full user interaction event sequence
    targetEl.focus();
    targetEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
    targetEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    targetEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));

    if (typeof targetEl.click === 'function') {
      targetEl.click();
    } else {
      targetEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }

    // Automatic Link Navigation Fallback
    const hrefAttr = targetEl.getAttribute('href');
    if (hrefAttr && !hrefAttr.startsWith('#') && !hrefAttr.startsWith('javascript:')) {
      setTimeout(() => {
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath !== hrefAttr && !currentPath.startsWith(hrefAttr)) {
          console.log(`[DOM Executor] Link click did not navigate automatically, enforcing location.assign to ${hrefAttr}`);
          window.location.assign(hrefAttr);
        }
      }, 150);
    }

    // 5. POST-ACTION UI STATE VERIFICATION
    let urlChanged = false;
    let newRoute = window.location.pathname + window.location.search;
    if (newRoute !== currentRoute) {
      urlChanged = true;
    }

    const modalVisible = document.querySelector('.modal, [role="dialog"], .modal-content, .drawer-content') !== null;
    const errorBanner = document.querySelector('.error-banner, [class*="error"], .toast-error');
    const is404 = document.body.textContent?.includes('404') || document.title?.includes('Not Found');

    if (is404) {
      return {
        success: false,
        message: `Clicked "${targetLabel}", but target page resulted in a 404 Not Found error.`,
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

    invalidateDOMCache();

    return {
      success: true,
      message: urlChanged 
        ? `Successfully clicked "${targetLabel}" and navigated to ${newRoute}.`
        : modalVisible
        ? `Successfully executed ${actionType} on "${targetLabel}" and opened modal workspace.`
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
      message: `Failed to interact with component "${query}": ${err.message || 'DOM error'}`,
      actionType,
      errorDetected: true,
      errorMessage: err.message
    };
  }
}
