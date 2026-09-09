import { executeLiveDOMAction, DOMActionResult } from './live-dom-executor';
import { extractLiveDOMContext, invalidateDOMCache } from './live-dom-reader';
import { setAgentVisualState, emitScanSequence } from './agent-visual-state';

// ─── Types ───

export interface AgentActionStep {
  id: string;
  action: 'scan' | 'read' | 'click' | 'type' | 'scroll' | 'wait' | 'verify' | 'navigate'
    | 'web_search' | 'web_scrape' | 'file_read' | 'file_write' | 'terminal'
    | 'screen_capture' | 'memory_save' | 'memory_recall' | 'set_reminder';
  target?: string;
  value?: string;
  waitMs?: number;
  status: 'pending' | 'executing' | 'success' | 'failed' | 'skipped';
  result?: string;
  label?: string;
}

export interface AgentActionPlan {
  planId: string;
  goal: string;
  steps: AgentActionStep[];
  currentStepIndex: number;
  status: 'planning' | 'executing' | 'completed' | 'failed';
}

export interface ActionPlanCallbacks {
  onPlanCreated?: (plan: AgentActionPlan) => void;
  onStepStart?: (plan: AgentActionPlan, step: AgentActionStep) => void;
  onStepComplete?: (plan: AgentActionPlan, step: AgentActionStep) => void;
  onPlanComplete?: (plan: AgentActionPlan) => void;
  onPlanFailed?: (plan: AgentActionPlan, failedStep: AgentActionStep) => void;
  executeDOMAction?: (actionType: string, query: string, valueToType?: string, elementIndex?: number) => DOMActionResult;
  performNavigation?: (route: string) => Promise<boolean>;
}

// ─── Plan Generation ───

let planCounter = 0;

function generateStepId(): string {
  return `step_${++planCounter}_${Date.now().toString(36)}`;
}

/**
 * Generate a deterministic action plan for common multi-step workflows.
 * Falls back to a simple single-step plan if no multi-step pattern is detected.
 */
export function planActionSequence(
  goal: string,
  currentRoute: string
): AgentActionPlan | null {
  const g = goal.toLowerCase().trim();

  // Pattern: "open [sheet] ka problem [N]" — requires navigating to sheet then finding problem
  const sheetProblemMatch = g.match(/(.+?)\s+(?:ka|ke|ki|wala|wali)\s+problem\s+(\d+)/i) ||
                            g.match(/problem\s+(\d+)\s+(?:in|of|from)\s+(.+)/i);
  if (sheetProblemMatch) {
    const sheetName = sheetProblemMatch[1].replace(/open\s+/i, '').trim();
    const problemNum = sheetProblemMatch[2] || sheetProblemMatch[1];
    return {
      planId: `plan_${Date.now().toString(36)}`,
      goal,
      steps: [
        { id: generateStepId(), action: 'scan', label: 'Scanning page for sheet cards', status: 'pending' },
        { id: generateStepId(), action: 'click', target: sheetName, label: `Finding & clicking "${sheetName}" sheet`, status: 'pending' },
        { id: generateStepId(), action: 'wait', waitMs: 800, label: 'Waiting for sheet page to load', status: 'pending' },
        { id: generateStepId(), action: 'scan', label: 'Scanning problem list', status: 'pending' },
        { id: generateStepId(), action: 'click', target: `problem ${problemNum}`, label: `Finding Problem ${problemNum}`, status: 'pending' },
        { id: generateStepId(), action: 'verify', label: 'Verifying problem opened', status: 'pending' }
      ],
      currentStepIndex: 0,
      status: 'planning'
    };
  }

  // Pattern: "search [query] on page" or "type [text] in search"
  const searchTypeMatch = g.match(/(?:search|type|likho|likh)\s+(?:me\s+)?(?:\"([^\"]+)\"|'([^']+)'|(.+?))\s*(?:in\s+search|search\s+me|search\s+box)?$/i);
  if (searchTypeMatch) {
    const searchText = searchTypeMatch[1] || searchTypeMatch[2] || searchTypeMatch[3];
    return {
      planId: `plan_${Date.now().toString(36)}`,
      goal,
      steps: [
        { id: generateStepId(), action: 'scan', label: 'Scanning for search input', status: 'pending' },
        { id: generateStepId(), action: 'click', target: 'search', label: 'Focusing search input', status: 'pending' },
        { id: generateStepId(), action: 'type', target: 'search', value: searchText.trim(), label: `Typing "${searchText.trim()}"`, status: 'pending' },
        { id: generateStepId(), action: 'verify', label: 'Verifying search results', status: 'pending' }
      ],
      currentStepIndex: 0,
      status: 'planning'
    };
  }

  // Pattern: multi-step "open X then do Y"
  const thenMatch = g.match(/(.+?)\s+(?:then|phir|fir|aur)\s+(.+)/i);
  if (thenMatch) {
    const steps: AgentActionStep[] = [
      { id: generateStepId(), action: 'scan', label: 'Scanning current page', status: 'pending' },
      { id: generateStepId(), action: 'click', target: thenMatch[1].replace(/^open\s+/i, '').trim(), label: `Executing: ${thenMatch[1].trim()}`, status: 'pending' },
      { id: generateStepId(), action: 'wait', waitMs: 600, label: 'Waiting for transition', status: 'pending' },
      { id: generateStepId(), action: 'scan', label: 'Scanning new page', status: 'pending' },
      { id: generateStepId(), action: 'click', target: thenMatch[2].replace(/^open\s+/i, '').trim(), label: `Executing: ${thenMatch[2].trim()}`, status: 'pending' },
      { id: generateStepId(), action: 'verify', label: 'Verifying final state', status: 'pending' }
    ];
    return {
      planId: `plan_${Date.now().toString(36)}`,
      goal,
      steps,
      currentStepIndex: 0,
      status: 'planning'
    };
  }

  // No multi-step pattern detected
  return null;
}

// ─── Plan Execution ───

const INTER_STEP_DELAY_MS = 200;

/**
 * Execute an action plan step-by-step with visual cursor tracking.
 * Each step emits visual state updates so the cursor follows the agent's actions.
 */
export async function executeActionPlan(
  plan: AgentActionPlan,
  callbacks: ActionPlanCallbacks
): Promise<AgentActionPlan> {
  plan.status = 'executing';
  callbacks.onPlanCreated?.(plan);

  const executeDom = callbacks.executeDOMAction || executeLiveDOMAction;

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    plan.currentStepIndex = i;
    step.status = 'executing';
    callbacks.onStepStart?.({ ...plan }, step);

    try {
      switch (step.action) {
        case 'scan': {
          setAgentVisualState('scanning', { message: step.label || 'Scanning page...' });
          invalidateDOMCache();
          const currentRoute = typeof window !== 'undefined' ? window.location.pathname : '/';
          const ctx = extractLiveDOMContext(currentRoute, true);

          // Emit scan sequence for visible cursor tracking
          if (ctx.snapshot?.actionableElements && typeof document !== 'undefined') {
            const scanTargets = ctx.snapshot.actionableElements
              .slice(0, 15)
              .map(el => {
                const domNode = document.querySelector(`[data-agent-runtime-id="${el.id}"]`) as HTMLElement;
                return domNode ? { el: domNode, label: el.text || el.id } : null;
              })
              .filter(Boolean) as Array<{ el: HTMLElement; label: string }>;

            if (scanTargets.length > 0) {
              emitScanSequence(scanTargets, 100);
              // Wait for scan sequence to partially complete for visual effect
              await delay(Math.min(scanTargets.length * 100, 1200));
            }
          }

          step.status = 'success';
          step.result = `Scanned ${ctx.snapshot?.actionableElements?.length || 0} elements`;
          break;
        }

        case 'click': {
          if (!step.target) {
            step.status = 'failed';
            step.result = 'No click target specified';
            break;
          }
          setAgentVisualState('targeting', { targetText: step.target, message: step.label });
          await delay(150);

          const clickResult = executeDom('click', step.target);
          if (clickResult.success) {
            step.status = 'success';
            step.result = clickResult.message;
          } else {
            step.status = 'failed';
            step.result = clickResult.message;
          }
          break;
        }

        case 'type': {
          if (!step.target || !step.value) {
            step.status = 'failed';
            step.result = 'No type target or value specified';
            break;
          }
          setAgentVisualState('targeting', { targetText: step.target, message: `Finding: ${step.target}` });
          await delay(100);

          const typeResult = executeDom('type', step.target, step.value);
          if (typeResult.success) {
            step.status = 'success';
            step.result = `Typed "${step.value}"`;
            // Wait for typing animation to finish
            await delay((step.value.length * 30) + 100);
          } else {
            step.status = 'failed';
            step.result = typeResult.message;
          }
          break;
        }

        case 'scroll': {
          if (!step.target) {
            step.status = 'failed';
            step.result = 'No scroll target specified';
            break;
          }
          const scrollResult = executeDom('scroll', step.target);
          step.status = scrollResult.success ? 'success' : 'failed';
          step.result = scrollResult.message;
          break;
        }

        case 'wait': {
          const waitTime = step.waitMs || 500;
          setAgentVisualState('reading', { message: step.label || 'Waiting...' });
          await delay(waitTime);
          step.status = 'success';
          step.result = `Waited ${waitTime}ms`;
          break;
        }

        case 'verify': {
          setAgentVisualState('verifying', { message: step.label || 'Verifying...' });
          await delay(200);
          // Simple route-based verification
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
          step.status = 'success';
          step.result = `Current page: ${currentPath}`;
          break;
        }

        case 'navigate': {
          if (!step.target) {
            step.status = 'failed';
            step.result = 'No navigation target';
            break;
          }
          setAgentVisualState('navigating', { targetText: step.target, message: `Navigating to ${step.target}` });
          if (callbacks.performNavigation) {
            const navResult = await callbacks.performNavigation(step.target);
            step.status = navResult ? 'success' : 'failed';
            step.result = navResult ? `Navigated to ${step.target}` : `Navigation failed`;
          } else if (typeof window !== 'undefined') {
            window.location.assign(step.target);
            step.status = 'success';
            step.result = `Navigated to ${step.target}`;
          }
          break;
        }

        default:
          step.status = 'skipped';
          step.result = `Unknown action: ${step.action}`;
      }
    } catch (err: any) {
      step.status = 'failed';
      step.result = err?.message || 'Step execution error';
    }

    callbacks.onStepComplete?.({ ...plan }, step);

    // If step failed, stop execution (don't continue with broken chain)
    if (step.status === 'failed') {
      // Skip remaining steps
      for (let j = i + 1; j < plan.steps.length; j++) {
        plan.steps[j].status = 'skipped';
      }
      plan.status = 'failed';
      setAgentVisualState('error', { message: `Step failed: ${step.result}` });
      callbacks.onPlanFailed?.({ ...plan }, step);
      return plan;
    }

    // Inter-step delay for visual continuity
    if (i < plan.steps.length - 1) {
      await delay(INTER_STEP_DELAY_MS);
    }
  }

  plan.status = 'completed';
  setAgentVisualState('success', { message: `✓ ${plan.goal}` });
  callbacks.onPlanComplete?.({ ...plan });
  return plan;
}

// ─── Multi-Step Detection ───

/**
 * Check if a user prompt likely requires a multi-step autonomous action chain.
 */
export function isMultiStepIntent(prompt: string): boolean {
  const p = prompt.toLowerCase().trim();

  // "X ka problem Y" pattern
  if (/(.+?)\s+(?:ka|ke|ki|wala)\s+problem\s+\d+/i.test(p)) return true;

  // "then/phir" chaining
  if (/\b(then|phir|fir|aur\s+then)\b/i.test(p)) return true;

  // "search X in Y" / "type X in search"
  if (/(?:search|type|likho)\s+.+\s+(?:in\s+search|search\s+me|search\s+box)/i.test(p)) return true;

  return false;
}

// ─── Utility ───

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
