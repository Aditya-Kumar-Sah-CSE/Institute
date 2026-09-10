import { AutonomousPhase } from './types';

export interface PlannedStep {
  phase: AutonomousPhase;
  label: string;
  target?: string;
}

export class AgentPlanner {
  /**
   * Analyzes user prompt and generates deterministic execution plan.
   */
  public static createExecutionPlan(prompt: string): {
    goal: string;
    targetRoute: string;
    steps: PlannedStep[];
  } {
    const p = prompt.toLowerCase().trim();

    let targetRoute = '/';
    if (p.includes('login') || p.includes('login page')) {
      targetRoute = '/login';
    } else if (p.includes('signup') || p.includes('sign up')) {
      targetRoute = '/signup';
    } else if (p.includes('profile')) {
      targetRoute = '/profile';
    } else if (p.includes('dashboard')) {
      targetRoute = '/dashboard';
    }

    const steps: PlannedStep[] = [
      { phase: 'intent_detection', label: `Detect intent & target route (${targetRoute})` },
      { phase: 'project_inspection', label: 'Inspect workspace files & UI components' },
      { phase: 'llm_generation', label: 'Generate structured solution via LLM' },
      { phase: 'structured_patch_extraction', label: 'Extract file creations and patches' },
      { phase: 'workspace_apply', label: 'Apply workspace changes with safety checkpoint' },
      { phase: 'compilation', label: 'Run TypeScript diagnostic & build checks' },
      { phase: 'repair_loop', label: 'Autonomous error repair loop (if required)' },
      { phase: 'browser_verification', label: `Verify route ${targetRoute} and DOM elements in browser` },
      { phase: 'completed', label: 'Generate final success report' }
    ];

    return {
      goal: prompt,
      targetRoute,
      steps
    };
  }
}
