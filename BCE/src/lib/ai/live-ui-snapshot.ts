export type SemanticColorChannel = 'red' | 'green' | 'yellow' | 'blue' | 'cyan' | 'neutral';

export interface ComputedColorInfo {
  text: string;
  background: string;
  border: string;
  semanticColor: SemanticColorChannel;
}

export interface RuntimeAgentElement {
  id: string; // e.g. "agent-el-001"
  domNode?: HTMLElement;
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
 * Builds computed color info for an element using getComputedStyle
 */
export function getElementComputedColorInfo(el: HTMLElement): ComputedColorInfo | undefined {
  if (typeof window === 'undefined' || !el) return undefined;

  try {
    const style = window.getComputedStyle(el);
    const text = style.color || '';
    const background = style.backgroundColor || '';
    const border = style.borderColor || '';

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
