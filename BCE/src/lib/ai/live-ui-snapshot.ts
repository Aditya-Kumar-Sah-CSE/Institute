export type SemanticColorChannel = 'red' | 'green' | 'yellow' | 'blue' | 'cyan' | 'neutral';

export interface ComputedColorInfo {
  text: string;
  background: string;
  border: string;
  semanticColor: SemanticColorChannel;
}

export interface RuntimeAgentElement {
  id: string; // e.g. "agent-el-001"
  tag: string;
  role?: string;
  text: string;
  ariaLabel?: string;
  title?: string;
  dataAgentLabel?: string;
  dataAgentAction?: string;
  dataAgentDescription?: string;
  type: 'button' | 'link' | 'card' | 'input' | 'select' | 'textarea' | 'toggle' | 'tab' | 'menu_item' | 'modal_action' | 'other';
  computedColor?: ComputedColorInfo;
  parentSection?: 'sidebar' | 'navbar' | 'modal' | 'drawer' | 'main' | 'other';
  parentCardTitle?: string;
  href?: string;
  value?: string;
  placeholder?: string;
  disabled: boolean;
  visible: boolean;
  ariaExpanded?: boolean;
  ariaChecked?: boolean;
}

export interface LiveUISection {
  id: string;
  title?: string;
  role?: string;
  type: 'section' | 'card' | 'modal' | 'sidebar' | 'navbar' | 'drawer' | 'grid' | 'other';
  elementsCount: number;
}

export interface LiveUIMetric {
  label: string;
  value: string;
  color?: ComputedColorInfo;
}

export interface LiveUIPageBadge {
  text: string;
  semanticColor: SemanticColorChannel;
  elementId?: string;
}

export interface LiveUICard {
  id: string;
  title?: string;
  subtitle?: string;
  metrics?: LiveUIMetric[];
  badges?: LiveUIPageBadge[];
  parentSection?: string;
  actionableElementIds: string[];
  href?: string;
}

export interface LiveUIAlert {
  type: 'error' | 'warning' | 'info' | 'success';
  text: string;
  semanticColor: SemanticColorChannel;
}

export interface LiveUISnapshot {
  route: string;
  pageTitle: string;
  scrollPosition: { top: number; left: number };
  viewport: { width: number; height: number };
  sidebarState: 'expanded' | 'collapsed' | 'hidden';
  activeTab?: string;
  focusedElementId?: string;
  dialogs: Array<{ title?: string; type: 'modal' | 'drawer' | 'toast' | 'popover' }>;
  visibleSections: LiveUISection[];
  cards: LiveUICard[];
  elementsMap: Map<string, RuntimeAgentElement>;
  actionableElements: RuntimeAgentElement[];
  visibleText: string[];
  alerts: LiveUIAlert[];
  timestamp: number;
}

/**
  Classifies computed RGB/RGBA/Hex color values into high-level semantic color channels.
 */
export function classifyRGBToSemanticColor(colorStr: string): SemanticColorChannel {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') {
    return 'neutral';
  }

  const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!rgbMatch) {
    const lower = colorStr.toLowerCase();
    if (lower.includes('red') || lower.includes('ff4d') || lower.includes('ff00') || lower.includes('ef44')) return 'red';
    if (lower.includes('green') || lower.includes('lime') || lower.includes('22c5') || lower.includes('39ff')) return 'green';
    if (lower.includes('yellow') || lower.includes('gold') || lower.includes('f59e') || lower.includes('facc')) return 'yellow';
    if (lower.includes('cyan') || lower.includes('blue') || lower.includes('06b6') || lower.includes('00e5')) return 'cyan';
    return 'neutral';
  }

  const r = parseInt(rgbMatch[1], 10);
  const g = parseInt(rgbMatch[2], 10);
  const b = parseInt(rgbMatch[3], 10);

  // Red / Pink dominant (e.g., danger, error, needs improvement)
  if (r > 180 && g < 140 && b < 140) return 'red';
  if (r > 200 && g < 100) return 'red';

  // Green / Lime dominant (e.g., success, key strength)
  if (g > 180 && r < 160 && b < 160) return 'green';
  if (g > 200 && r < 200) return 'green';

  // Gold / Yellow dominant (e.g., warning, pending, gap)
  if (r > 200 && g > 170 && b < 100) return 'yellow';

  // Cyan / Bright Blue dominant (e.g., action, primary button, cyan highlight)
  if (b > 180 && g > 150 && r < 120) return 'cyan';
  if (b > 180 && r < 140) return 'blue';
  if (g > 180 && b > 180 && r < 140) return 'cyan';

  return 'neutral';
}

/**
 * Builds computed color info for an element using getComputedStyle.
 * ALWAYS returns a pure JSON DTO containing string primitives.
 */
export function getElementComputedColorInfo(el: HTMLElement): ComputedColorInfo | undefined {
  if (typeof window === 'undefined' || !el) return undefined;

  try {
    const style = window.getComputedStyle(el);
    const text = String(style.color || '');
    const background = String(style.backgroundColor || '');
    const border = String(style.borderColor || '');

    let semanticColor: SemanticColorChannel = 'neutral';
    
    // Check border first (often used for badges/alerts), then background, then text
    const borderSemantic = classifyRGBToSemanticColor(border);
    const bgSemantic = classifyRGBToSemanticColor(background);
    const textSemantic = classifyRGBToSemanticColor(text);

    if (borderSemantic !== 'neutral') semanticColor = borderSemantic;
    else if (bgSemantic !== 'neutral') semanticColor = bgSemantic;
    else if (textSemantic !== 'neutral') semanticColor = textSemantic;

    return {
      text,
      background,
      border,
      semanticColor
    };
  } catch {
    return undefined;
  }
}

/**
 * Developer & Runtime assertion specifically for LiveUISnapshot.
 * Verifies JSON.stringify(snapshot) succeeds and recursively detects non-serializable DOM/CSS/Fiber objects or functions.
 */
export function validateLiveUISnapshotSerializable(snapshot: LiveUISnapshot): void {
  if (!snapshot) return;

  // 1. Hard JSON stringify assertion
  try {
    JSON.stringify(snapshot, (key, value) => {
      if (value instanceof Map) {
        const obj: Record<string, any> = {};
        value.forEach((v, k) => { obj[k] = v; });
        return obj;
      }
      return value;
    });
  } catch (err: any) {
    console.error('[Agent Serialization Guard] Hard JSON.stringify failure on LiveUISnapshot:', err);
    throw new Error(`[Agent Serialization Guard] LiveUISnapshot failed JSON.stringify: ${err.message}`);
  }

  // 2. Recursive inspection for forbidden types
  function inspectValue(val: any, path: string, visited: Set<any>): void {
    if (val === undefined || val === null) return;
    if (typeof val === 'function') {
      console.error(`[Agent Serialization Guard] Non-serializable Function detected at path: "${path}"`);
      return;
    }
    if (typeof val !== 'object') return;

    if (visited.has(val)) {
      return;
    }
    visited.add(val);

    if (typeof window !== 'undefined') {
      if (val instanceof Node || val instanceof Element || val instanceof HTMLElement || val instanceof Event || val instanceof Window || val instanceof Document) {
        console.error(`[Agent Serialization Guard] Non-serializable DOM object detected at path: "${path}"`);
        return;
      }
      if (val instanceof CSSStyleDeclaration || (typeof CSSRule !== 'undefined' && val instanceof CSSRule)) {
        console.error(`[Agent Serialization Guard] Non-serializable CSS object detected at path: "${path}"`);
        return;
      }
    }

    const ctorName = val.constructor && typeof val.constructor.name === 'string' ? val.constructor.name : '';
    if (
      ctorName.includes('Element') ||
      ctorName.includes('Node') ||
      ctorName.includes('Fiber') ||
      ctorName.includes('HTML') ||
      ctorName.includes('CSSStyleDeclaration')
    ) {
      console.error(`[Agent Serialization Guard] Non-serializable object (${ctorName}) detected at path: "${path}"`);
      return;
    }

    if (Array.isArray(val)) {
      val.forEach((item, idx) => inspectValue(item, `${path}[${idx}]`, visited));
      return;
    }

    if (val instanceof Map) {
      val.forEach((mapVal, mapKey) => inspectValue(mapVal, `${path}.${mapKey}`, visited));
      return;
    }

    for (const key of Object.keys(val)) {
      inspectValue(val[key], path ? `${path}.${key}` : key, visited);
    }
  }

  try {
    inspectValue(snapshot, 'snapshot', new Set());
  } catch (err) {
    console.error('[Agent Serialization Guard] Diagnostic inspection error:', err);
  }
}

