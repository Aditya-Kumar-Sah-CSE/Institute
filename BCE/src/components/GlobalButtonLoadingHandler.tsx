'use client';

import { useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface ActiveButton {
  element: HTMLElement;
  startTime: number;
  pendingRequests: number;
  minTimePassed: boolean;
  isNavigation: boolean;
  overlay: HTMLElement;
}

function GlobalButtonLoadingHandlerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeButtonsRef = useRef<Set<ActiveButton>>(new Set());
  const lastClickedRef = useRef<{ element: HTMLElement; timestamp: number } | null>(null);

  // Stop animations when Next.js path or search params change (navigation complete)
  useEffect(() => {
    activeButtonsRef.current.forEach((btn) => {
      if (btn.isNavigation) {
        stopButtonAnimation(btn);
      }
    });
  }, [pathname, searchParams]);

  const stopButtonAnimation = (btn: ActiveButton) => {
    btn.element.classList.remove('premium-loading-active');
    if (btn.element.contains(btn.overlay)) {
      btn.element.removeChild(btn.overlay);
    }
    activeButtonsRef.current.delete(btn);
  };

  const checkAndStopButton = (btn: ActiveButton) => {
    if (btn.minTimePassed && btn.pendingRequests === 0 && !btn.isNavigation) {
      stopButtonAnimation(btn);
    }
  };

  const triggerGlow = (element: HTMLElement) => {
    // Avoid double animation or triggering on disabled elements
    if (element.classList.contains('premium-loading-active') || (element as any).disabled) {
      return;
    }

    // Determine if it's a link or triggers navigation
    const isNavigation = 
      element.tagName === 'A' || 
      element.closest('a') !== null ||
      element.getAttribute('href') !== null ||
      element.closest('[href]') !== null;

    // Create premium border flow elements
    const overlay = document.createElement('span');
    overlay.className = 'premium-border-flow-overlay';
    
    const glow = document.createElement('span');
    glow.className = 'premium-border-flow-glow';
    overlay.appendChild(glow);

    element.classList.add('premium-loading-active');
    element.appendChild(overlay);

    const btnObj: ActiveButton = {
      element,
      startTime: Date.now(),
      pendingRequests: 0,
      minTimePassed: false,
      isNavigation,
      overlay,
    };

    activeButtonsRef.current.add(btnObj);

    // Track last clicked button to associate with incoming fetches/requests
    lastClickedRef.current = { element, timestamp: Date.now() };

    // Minimum animation duration: 500ms
    setTimeout(() => {
      btnObj.minTimePassed = true;
      checkAndStopButton(btnObj);
      
      // Fallback: Auto-stop navigation buttons after 4 seconds to prevent infinite locks
      if (btnObj.isNavigation) {
        setTimeout(() => {
          if (activeButtonsRef.current.has(btnObj)) {
            stopButtonAnimation(btnObj);
          }
        }, 3500);
      }
    }, 500);
  };

  useEffect(() => {
    // 1. Intercept document-level click events
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactiveEl = target.closest('button, a, [role="button"]') as HTMLElement;

      if (interactiveEl) {
        // Prevent click if currently loading
        if (interactiveEl.classList.contains('premium-loading-active')) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        // Trigger loading border flow
        triggerGlow(interactiveEl);
      }
    };

    // 2. Intercept form submits (e.g. Enter key submits)
    const handleSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      const submitBtn = e.submitter || form.querySelector('button[type="submit"]') as HTMLElement;
      if (submitBtn) {
        triggerGlow(submitBtn);
      }
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('submit', handleSubmit, true);

    // 3. Patch window.fetch to associate requests with active buttons
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const lastClicked = lastClickedRef.current;
      let associatedBtn: ActiveButton | null = null;

      // If a fetch starts within 80ms of a button click, associate it
      if (lastClicked && Date.now() - lastClicked.timestamp < 80) {
        associatedBtn = Array.from(activeButtonsRef.current).find(
          (btn) => btn.element === lastClicked.element
        ) || null;
      }

      if (associatedBtn) {
        associatedBtn.pendingRequests++;
      }

      try {
        return await originalFetch.apply(this, args);
      } finally {
        if (associatedBtn) {
          associatedBtn.pendingRequests = Math.max(0, associatedBtn.pendingRequests - 1);
          checkAndStopButton(associatedBtn);
        }
      }
    };

    // 4. Patch XMLHttpRequest to capture XHR-based requests
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
      const lastClicked = lastClickedRef.current;
      let associatedBtn: ActiveButton | null = null;

      if (lastClicked && Date.now() - lastClicked.timestamp < 80) {
        associatedBtn = Array.from(activeButtonsRef.current).find(
          (btn) => btn.element === lastClicked.element
        ) || null;
      }

      if (associatedBtn) {
        associatedBtn.pendingRequests++;
        
        const handleResponse = () => {
          if (associatedBtn) {
            associatedBtn.pendingRequests = Math.max(0, associatedBtn.pendingRequests - 1);
            checkAndStopButton(associatedBtn);
          }
        };

        this.addEventListener('loadend', handleResponse);
      }

      return originalSend.call(this, body);
    };

    // 5. Intercept Next.js navigation push/replace state
    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      // Short delay to let state transition and stop any active navigation animations
      setTimeout(() => {
        activeButtonsRef.current.forEach((btn) => {
          if (btn.isNavigation) {
            stopButtonAnimation(btn);
          }
        });
      }, 100);
    };

    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      setTimeout(() => {
        activeButtonsRef.current.forEach((btn) => {
          if (btn.isNavigation) {
            stopButtonAnimation(btn);
          }
        });
      }, 100);
    };

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.send = originalSend;
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  return null;
}

export default function GlobalButtonLoadingHandler() {
  return (
    <Suspense fallback={null}>
      <GlobalButtonLoadingHandlerInner />
    </Suspense>
  );
}
