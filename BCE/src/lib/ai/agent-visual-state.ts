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
