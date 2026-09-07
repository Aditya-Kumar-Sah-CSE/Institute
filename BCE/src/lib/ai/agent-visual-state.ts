export type AgentInteractionState =
  | 'idle'
  | 'scanning'
  | 'reading'
  | 'resolving'
  | 'targeting'
  | 'clicking'
  | 'typing'
  | 'selecting'
  | 'scrolling'
  | 'navigating'
  | 'verifying'
  | 'success'
  | 'error';

export interface AgentVisualStatePayload {
  state: AgentInteractionState;
  targetText?: string;
  targetRect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
  targetElementId?: string;
  message?: string;
  timestamp: number;
}

type Listener = (payload: AgentVisualStatePayload) => void;

let currentStatePayload: AgentVisualStatePayload = {
  state: 'idle',
  timestamp: Date.now()
};

// Persistent agent session flag — cursor stays visible while true
let _agentSessionActive = false;

export function setAgentSessionActive(active: boolean): void {
  _agentSessionActive = active;
  if (active && currentStatePayload.state === 'idle') {
    // Emit a scanning state so the cursor becomes visible immediately
    setAgentVisualState('scanning', { message: 'Agent active' });
  } else if (!active) {
    setAgentVisualState('idle');
  }
}

export function isAgentSessionActive(): boolean {
  return _agentSessionActive;
}

const listeners = new Set<Listener>();

export function getAgentVisualState(): AgentVisualStatePayload {
  return currentStatePayload;
}

export function setAgentVisualState(
  state: AgentInteractionState,
  options: {
    targetText?: string;
    targetDomNode?: HTMLElement | null;
    targetRect?: { top: number; left: number; width: number; height: number } | null;
    targetElementId?: string;
    message?: string;
  } = {}
): void {
  let rect = options.targetRect || null;

  if (!rect && options.targetDomNode && typeof window !== 'undefined') {
    try {
      const r = options.targetDomNode.getBoundingClientRect();
      rect = {
        top: r.top + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width,
        height: r.height
      };
    } catch (e) {
      rect = null;
    }
  }

  currentStatePayload = {
    state,
    targetText: options.targetText,
    targetRect: rect,
    targetElementId: options.targetElementId,
    message: options.message,
    timestamp: Date.now()
  };

  listeners.forEach(fn => {
    try {
      fn(currentStatePayload);
    } catch (err) {
      console.error('[AgentVisualState Listener Error]:', err);
    }
  });
}

export function subscribeAgentVisualState(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetAgentVisualState(): void {
  setAgentVisualState('idle');
}

/**
 * Emit a single scanning/reading event for one DOM element.
 * Called from live-dom-reader during DOM scanning to make the cursor
 * visually track which element the agent is currently reading.
 */
export function emitScanEvent(
  element: HTMLElement,
  label: string,
  state: 'scanning' | 'reading' = 'reading'
): void {
  if (!_agentSessionActive) return;
  setAgentVisualState(state, {
    targetText: label,
    targetDomNode: element,
    message: state === 'scanning' ? 'Scanning page...' : `Reading: ${label}`
  });
}

/**
 * Batch-emit scanning events for a list of DOM elements with staggered timing.
 * Uses requestAnimationFrame for smooth cursor movement.
 * Returns a cancel function.
 */
export function emitScanSequence(
  elements: Array<{ el: HTMLElement; label: string }>,
  intervalMs = 60
): () => void {
  if (!_agentSessionActive || elements.length === 0) return () => {};
  let cancelled = false;
  let idx = 0;

  const step = () => {
    if (cancelled || idx >= elements.length || !_agentSessionActive) return;
    const { el, label } = elements[idx];
    emitScanEvent(el, label, idx === 0 ? 'scanning' : 'reading');
    idx++;
    if (idx < elements.length) {
      setTimeout(() => requestAnimationFrame(step), intervalMs);
    }
  };

  requestAnimationFrame(step);
  return () => { cancelled = true; };
}
