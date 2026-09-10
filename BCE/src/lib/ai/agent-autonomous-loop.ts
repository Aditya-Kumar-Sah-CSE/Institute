/**
 * Smart Learn Autonomous AI Agent Loop Engine
 * 
 * Implements: Perceive → Reason → Plan → Tool Select → Safety Check → Execute → Observe → Verify → Continue
 * 
 * Reuses existing: AGENT_TOOLS registry, AgentVisualState, autonomous-executor patterns,
 * agent-memory, live-dom-reader, BYOK pipeline, and AgentController session state.
 */

import { AGENT_TOOLS, AgentToolResult, AgentToolDefinition, RiskLevel } from './agent-tools-client';
import { AgentPageContext } from './agent-context';
import { setAgentVisualState, setAgentSessionActive } from './agent-visual-state';
import { invalidateDOMCache } from './live-dom-reader';

// ─── Types ───

export type AutonomousPhase =
  | 'perceiving'
  | 'reasoning'
  | 'planning'
  | 'safety_check'
  | 'awaiting_confirmation'
  | 'executing'
  | 'observing'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface AutonomousStep {
  id: string;
  toolName: string;
  args: Record<string, any>;
  riskLevel: RiskLevel;
  label: string;
  status: 'pending' | 'awaiting_confirmation' | 'executing' | 'success' | 'failed' | 'skipped' | 'cancelled';
  result?: AgentToolResult;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface AutonomousTask {
  taskId: string;
  goal: string;
  maxIterations: number;
  timeoutMs: number;
  currentPhase: AutonomousPhase;
  iterations: number;
  steps: AutonomousStep[];
  currentStepIndex: number;
  observations: string[];
  finalResult?: string;
  startedAt: number;
  completedAt?: number;
  cancelled: boolean;
}

export interface AutonomousLoopCallbacks {
  onPhaseChange?: (task: AutonomousTask, phase: AutonomousPhase) => void;
  onStepStart?: (task: AutonomousTask, step: AutonomousStep) => void;
  onStepComplete?: (task: AutonomousTask, step: AutonomousStep) => void;
  onConfirmationRequired?: (task: AutonomousTask, step: AutonomousStep) => Promise<boolean>;
  onTaskComplete?: (task: AutonomousTask) => void;
  onTaskFailed?: (task: AutonomousTask, reason: string) => void;
  onObservation?: (task: AutonomousTask, observation: string) => void;
  getPageContext?: () => AgentPageContext | undefined;
  performNavigation?: (route: string) => Promise<boolean>;
  executeDOMAction?: (actionType: string, query: string, valueToType?: string, elementIndex?: number) => any;
}

// ─── Constants ───

const DEFAULT_MAX_ITERATIONS = 5;
const DEFAULT_TIMEOUT_MS = 60_000; // 60 seconds
const INTER_STEP_DELAY_MS = 200;
const MAX_OBSERVATIONS = 20;

// Tools that NEVER require confirmation (read-only, navigation, search)
const AUTO_APPROVE_TOOLS = new Set([
  // Navigation
  'openDashboard', 'openProfile', 'openCourses', 'openMyCourses', 'openCourse',
  'openDSASheets', 'openDSASheet', 'openDSAProblem', 'openCodingArena', 'openCodingProfile',
  'openRoutine', 'openGoals', 'openCertificate', 'openBadges', 'openLatexEditor',
  'openNotifications', 'openLeaderboard', 'openDoubts', 'openInstructorDashboard',
  'openInstructorCourses', 'openAdminDashboard', 'openAdminCourses', 'openAdminUsers',
  'openAdminNptel', 'openDeveloperPanel',
  // Read Operations
  'queryLivePage', 'getCurrentPageContext', 'scanLivePageElements',
  'getStudent360', 'getWeakAreas', 'getRecommendations', 'getMyDSAProgress',
  'getMyRoutine', 'getMyGoals', 'getNotices', 'getAvailableDSASheets',
  'getDSASheetDetails', 'getLeaderboardRank', 'readLatexCode',
  // Search
  'searchYouTube', 'searchWeb', 'searchGPT', 'searchProgramSeats',
  // DOM Interaction (read/click)
  'interactWithPageElement', 'fillFormInput',
  // New Autonomous Read Tools
  'webSearch', 'webScrape', 'summarizeURL',
  'readFile', 'listDirectory', 'getSystemInfo',
  'captureScreenContext', 'readScreenRegion',
  'inspectLocalComputer', 'readLocalWorkspaceFile',
  'observeBrowserState',
  'recallFromMemory', 'listReminders',
  'openWeakestDSAProblem',
]);

// Tools that ALWAYS require user confirmation (destructive / side-effects)
const REQUIRE_CONFIRMATION_TOOLS = new Set([
  'writeFile', 'deleteFile',
  'runTerminalCommand',
  'launchPermittedApp', 'writeLocalWorkspaceFile',
  'openBrowserUrl',
  'clearMemory',
]);

let stepCounter = 0;
function generateStepId(): string {
  return `auto_step_${++stepCounter}_${Date.now().toString(36)}`;
}

// Active task registry for cancellation support
const activeTasks = new Map<string, AutonomousTask>();

// ─── Core Functions ───

/**
 * Determine if a tool requires user confirmation before execution.
 * LOW risk tools auto-execute. HIGH risk tools always confirm.
 * MEDIUM risk tools confirm only if not in auto-approve set.
 */
export function requiresConfirmation(toolName: string, riskLevel: RiskLevel): boolean {
  if (REQUIRE_CONFIRMATION_TOOLS.has(toolName)) return true;
  if (AUTO_APPROVE_TOOLS.has(toolName)) return false;
  return riskLevel === 'HIGH';
}

/**
 * Build an autonomous step from a tool name and arguments.
 */
export function buildStep(toolName: string, args: Record<string, any>, label?: string): AutonomousStep {
  const toolDef = AGENT_TOOLS[toolName];
  const risk: RiskLevel = toolDef?.riskLevel || 'MEDIUM';
  return {
    id: generateStepId(),
    toolName,
    args,
    riskLevel: risk,
    label: label || toolDef?.description?.slice(0, 60) || `Execute ${toolName}`,
    status: 'pending',
  };
}

/**
 * Create an autonomous task from a goal and planned steps.
 */
export function createAutonomousTask(
  goal: string,
  steps: AutonomousStep[],
  options?: { maxIterations?: number; timeoutMs?: number }
): AutonomousTask {
  const taskId = `task_${Date.now().toString(36)}_${Math.random().toString(36).substring(7)}`;
  return {
    taskId,
    goal,
    maxIterations: options?.maxIterations || DEFAULT_MAX_ITERATIONS,
    timeoutMs: options?.timeoutMs || DEFAULT_TIMEOUT_MS,
    currentPhase: 'perceiving',
    iterations: 0,
    steps,
    currentStepIndex: 0,
    observations: [],
    startedAt: Date.now(),
    cancelled: false,
  };
}

/**
 * Cancel a running autonomous task by ID.
 */
export function cancelAutonomousTask(taskId: string): boolean {
  const task = activeTasks.get(taskId);
  if (task) {
    task.cancelled = true;
    task.currentPhase = 'cancelled';
    // Mark remaining pending steps as cancelled
    for (const step of task.steps) {
      if (step.status === 'pending' || step.status === 'executing' || step.status === 'awaiting_confirmation') {
        step.status = 'cancelled';
      }
    }
    activeTasks.delete(taskId);
    return true;
  }
  return false;
}

/**
 * Get a running task by ID.
 */
export function getAutonomousTask(taskId: string): AutonomousTask | undefined {
  return activeTasks.get(taskId);
}

// ─── Main Autonomous Loop ───

/**
 * Execute the autonomous perceive→reason→plan→execute→observe→verify→continue loop.
 * 
 * This is the core engine. It:
 * 1. Perceives current state (page context, observations from previous iterations)
 * 2. Iterates over planned steps
 * 3. For each step: safety check → confirm if needed → execute → observe
 * 4. After all steps: verify goal completion
 * 5. If goal not met and iterations remain: re-plan and continue
 */
export async function runAutonomousLoop(
  task: AutonomousTask,
  callbacks: AutonomousLoopCallbacks,
  user: { id: string },
  pageContext?: AgentPageContext
): Promise<AutonomousTask> {
  activeTasks.set(task.taskId, task);
  setAgentSessionActive(true);

  const emitPhase = (phase: AutonomousPhase) => {
    task.currentPhase = phase;
    callbacks.onPhaseChange?.(task, phase);
  };

  const addObservation = (obs: string) => {
    if (task.observations.length >= MAX_OBSERVATIONS) {
      task.observations.shift(); // Rolling window
    }
    task.observations.push(obs);
    callbacks.onObservation?.(task, obs);
  };

  try {
    while (task.iterations < task.maxIterations && !task.cancelled) {
      task.iterations++;

      // ─── TIMEOUT CHECK ───
      if (Date.now() - task.startedAt > task.timeoutMs) {
        emitPhase('timeout');
        task.finalResult = `Task timed out after ${Math.round((Date.now() - task.startedAt) / 1000)}s.`;
        callbacks.onTaskFailed?.(task, task.finalResult);
        activeTasks.delete(task.taskId);
        return task;
      }

      // ─── PHASE 1: PERCEIVE ───
      emitPhase('perceiving');
      setAgentVisualState('scanning', { message: 'Perceiving current state...' });
      
      const currentContext = callbacks.getPageContext?.() || pageContext;
      addObservation(`[Iteration ${task.iterations}] Route: ${currentContext?.route || 'unknown'}`);

      // ─── PHASE 2: REASONING ───
      emitPhase('reasoning');
      setAgentVisualState('reading', { message: 'Reasoning about next action...' });

      // Check if there are remaining steps to execute
      const pendingSteps = task.steps.filter(s => s.status === 'pending');
      if (pendingSteps.length === 0) {
        // All steps completed — verify
        emitPhase('verifying');
        setAgentVisualState('verifying', { message: 'Verifying task completion...' });

        const successCount = task.steps.filter(s => s.status === 'success').length;
        const failedCount = task.steps.filter(s => s.status === 'failed').length;

        if (failedCount === 0 && successCount > 0) {
          emitPhase('completed');
          task.finalResult = `✅ Task completed successfully. ${successCount} steps executed.`;
          task.completedAt = Date.now();
          setAgentVisualState('success', { message: task.finalResult });
          callbacks.onTaskComplete?.(task);
        } else if (failedCount > 0) {
          emitPhase('failed');
          const failedSteps = task.steps.filter(s => s.status === 'failed');
          task.finalResult = `❌ Task completed with ${failedCount} failure(s): ${failedSteps.map(s => s.error || s.toolName).join(', ')}`;
          task.completedAt = Date.now();
          setAgentVisualState('error', { message: task.finalResult });
          callbacks.onTaskFailed?.(task, task.finalResult);
        } else {
          emitPhase('completed');
          task.finalResult = 'Task completed (no steps executed).';
          task.completedAt = Date.now();
          callbacks.onTaskComplete?.(task);
        }

        activeTasks.delete(task.taskId);
        return task;
      }

      // ─── PHASE 3: PLANNING ───
      emitPhase('planning');
      setAgentVisualState('reading', { message: `Planning: ${pendingSteps.length} steps remaining` });

      // ─── PHASE 4-6: ITERATE OVER STEPS ───
      for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i];
        if (step.status !== 'pending') continue;
        if (task.cancelled) break;

        task.currentStepIndex = i;

        // ─── SAFETY CHECK ───
        emitPhase('safety_check');
        const needsConfirm = requiresConfirmation(step.toolName, step.riskLevel);

        if (needsConfirm) {
          // ─── AWAITING CONFIRMATION ───
          emitPhase('awaiting_confirmation');
          step.status = 'awaiting_confirmation';
          setAgentVisualState('verifying', { message: `⚠️ Confirmation required: ${step.label}` });
          callbacks.onStepStart?.(task, step);

          if (callbacks.onConfirmationRequired) {
            const approved = await callbacks.onConfirmationRequired(task, step);
            if (!approved) {
              step.status = 'cancelled';
              step.error = 'User declined confirmation';
              addObservation(`Step "${step.toolName}" cancelled by user.`);
              callbacks.onStepComplete?.(task, step);
              continue;
            }
          } else {
            // No confirmation handler — skip HIGH risk tools for safety
            step.status = 'skipped';
            step.error = 'No confirmation handler available';
            addObservation(`Step "${step.toolName}" skipped (no confirmation handler).`);
            callbacks.onStepComplete?.(task, step);
            continue;
          }
        }

        // ─── EXECUTE ───
        emitPhase('executing');
        step.status = 'executing';
        step.startedAt = Date.now();
        setAgentVisualState('targeting', { targetText: step.label, message: `Executing: ${step.toolName}` });
        callbacks.onStepStart?.(task, step);

        try {
          const toolDef = AGENT_TOOLS[step.toolName];
          if (!toolDef) {
            step.status = 'failed';
            step.error = `Tool "${step.toolName}" not found in registry.`;
            step.completedAt = Date.now();
            addObservation(`❌ Tool not found: ${step.toolName}`);
            callbacks.onStepComplete?.(task, step);
            continue;
          }

          // Execute the tool with real args
          const result: AgentToolResult = await toolDef.execute(
            step.args,
            user,
            {
              ...(callbacks.getPageContext?.() || pageContext),
              __agentConfirmation: needsConfirm
            }
          );

          step.result = result;
          step.completedAt = Date.now();

          // ─── OBSERVE ───
          emitPhase('observing');

          if (result.success) {
            step.status = 'success';
            addObservation(`✅ ${step.toolName}: ${result.message?.slice(0, 120) || 'Success'}`);
            setAgentVisualState('success', { message: `✓ ${step.label}` });

            // Handle navigation if the tool triggered it
            if (result.url && callbacks.performNavigation) {
              setAgentVisualState('navigating', { message: `Navigating to ${result.url}` });
              await callbacks.performNavigation(result.url);
              invalidateDOMCache();
            }

            // Handle DOM actions if the tool returned one
            if (result.data?.clientDOMAction && callbacks.executeDOMAction) {
              const { actionType, query, valueToType, elementIndex } = result.data.clientDOMAction;
              callbacks.executeDOMAction(actionType, query, valueToType, elementIndex);
            }
          } else {
            step.status = 'failed';
            step.error = result.message || result.error || 'Tool execution failed';
            addObservation(`❌ ${step.toolName}: ${step.error.slice(0, 120)}`);
            setAgentVisualState('error', { message: `✗ ${step.label}` });
          }

          callbacks.onStepComplete?.(task, step);
        } catch (err: any) {
          step.status = 'failed';
          step.error = err?.message || 'Unexpected execution error';
          step.completedAt = Date.now();
          const errorMessage = typeof step.error === 'string' ? step.error : 'Unexpected execution error';
          addObservation(`❌ ${step.toolName} threw: ${errorMessage.slice(0, 120)}`);
          setAgentVisualState('error', { message: `Error: ${errorMessage.slice(0, 60)}` });
          callbacks.onStepComplete?.(task, step);
        }

        // Inter-step delay for visual continuity
        if (i < task.steps.length - 1) {
          await delay(INTER_STEP_DELAY_MS);
        }
      }

      // ─── VERIFY ───
      emitPhase('verifying');
      setAgentVisualState('verifying', { message: 'Verifying results...' });

      const allDone = task.steps.every(s => s.status !== 'pending');
      if (allDone) {
        // All steps processed — exit loop
        break;
      }

      // If some steps still pending (shouldn't happen but safety), continue loop
      addObservation(`Iteration ${task.iterations} complete. Re-evaluating remaining steps...`);
      await delay(300);
    }

    // Final status
    if (task.cancelled) {
      emitPhase('cancelled');
      task.finalResult = 'Task cancelled by user.';
      callbacks.onTaskFailed?.(task, task.finalResult);
    } else if (task.currentPhase !== 'completed' && task.currentPhase !== 'failed') {
      const successCount = task.steps.filter(s => s.status === 'success').length;
      const totalSteps = task.steps.length;
      if (successCount === totalSteps) {
        emitPhase('completed');
        task.finalResult = `✅ All ${totalSteps} steps completed successfully.`;
        task.completedAt = Date.now();
        setAgentVisualState('success', { message: task.finalResult });
        callbacks.onTaskComplete?.(task);
      } else {
        emitPhase('failed');
        task.finalResult = `Completed ${successCount}/${totalSteps} steps. Max iterations (${task.maxIterations}) reached.`;
        task.completedAt = Date.now();
        callbacks.onTaskFailed?.(task, task.finalResult);
      }
    }
  } catch (err: any) {
    emitPhase('failed');
    task.finalResult = `Autonomous loop error: ${err?.message || 'Unknown error'}`;
    task.completedAt = Date.now();
    setAgentVisualState('error', { message: task.finalResult });
    callbacks.onTaskFailed?.(task, task.finalResult);
  }

  activeTasks.delete(task.taskId);
  return task;
}

// ─── Intent Detection for Autonomous Mode ───

/**
 * Detect if a user prompt requires the autonomous multi-tool loop
 * (vs a single fast-path tool call).
 */
export function isAutonomousIntent(prompt: string): boolean {
  const p = prompt.toLowerCase().trim();

  // Multi-step chaining keywords
  if (/\b(then|phir|fir|aur\s+then|and\s+then|after\s+that|iske\s+baad)\b/i.test(p)) return true;

  // Research + action combos
  if (/\b(search|find|research)\b/i.test(p) && /\b(save|write|create|add|open|summarize)\b/i.test(p)) return true;

  // File operations with context
  if (/\b(read|write|create|delete|list)\b/i.test(p) && /\b(file|directory|folder)\b/i.test(p)) return true;

  // Terminal commands
  if (/\b(run|execute|terminal|command|cmd|shell|npm|node|git|pip)\b/i.test(p)) return true;

  // Memory + recall combos
  if (/\b(remember|remind|recall|forget)\b/i.test(p)) return true;

  // Web research
  if (/\b(web\s+search|scrape|fetch\s+url|browse|research\s+online)\b/i.test(p)) return true;

  // Screen capture
  if (/\b(screenshot|capture\s+screen|screen\s+context)\b/i.test(p)) return true;

  return false;
}

/**
 * Build a plan of autonomous steps from a user prompt.
 * Returns null if the prompt doesn't need autonomous execution.
 */
export function planAutonomousSteps(prompt: string, sessionState?: any): AutonomousStep[] | null {
  const p = prompt.toLowerCase().trim();

  const steps: AutonomousStep[] = [];

  // Web search intent
  if (/\b(web\s*search|search\s*(the\s+)?web|online\s+search|google|search\s+for)\b/i.test(p) && AGENT_TOOLS['webSearch']) {
    const queryMatch = prompt.match(/(?:search|find|look\s+up|google)\s+(?:for\s+|the\s+web\s+for\s+)?(.+)/i);
    const q = queryMatch?.[1]?.replace(/\b(on|the|web|internet|online)\b/gi, '').trim() || prompt;
    steps.push(buildStep('webSearch', { query: q }, `Search web for "${q}"`));
  }

  // URL scrape intent
  if (/\b(scrape|fetch|read\s+url|open\s+url|browse)\b/i.test(p) && AGENT_TOOLS['webScrape']) {
    const urlMatch = prompt.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      steps.push(buildStep('webScrape', { url: urlMatch[1] }, `Scrape ${urlMatch[1]}`));
    }
  }

  // File read
  if (/\b(read|show|cat|view)\s+(file|contents?\s+of)\b/i.test(p) && AGENT_TOOLS['readFile']) {
    const pathMatch = prompt.match(/(?:read|show|cat|view)\s+(?:file\s+|contents?\s+of\s+)?([^\s]+\.\w+)/i);
    const filePath = pathMatch?.[1] || '';
    if (filePath) {
      steps.push(buildStep('readFile', { filePath }, `Read file: ${filePath}`));
    }
  }

  // File write
  if (/\b(write|create|save)\s+(file|to)\b/i.test(p) && AGENT_TOOLS['writeFile']) {
    const pathMatch = prompt.match(/(?:write|create|save)\s+(?:file\s+|to\s+)?([^\s]+\.\w+)/i);
    const filePath = pathMatch?.[1] || 'output.txt';
    steps.push(buildStep('writeFile', { filePath, content: '' }, `Write file: ${filePath}`));
  }

  // List directory
  if (/\b(list|ls|dir|show)\s+(directory|folder|files)\b/i.test(p) && AGENT_TOOLS['listDirectory']) {
    const pathMatch = prompt.match(/(?:list|ls|dir|show)\s+(?:directory|folder|files\s+in)\s*([^\s]*)/i);
    steps.push(buildStep('listDirectory', { dirPath: pathMatch?.[1] || '.' }, `List directory`));
  }

  // Terminal command
  if (/\b(run|execute|terminal|command)\b/i.test(p) && AGENT_TOOLS['runTerminalCommand']) {
    const cmdMatch = prompt.match(/(?:run|execute)\s+(?:command\s+|terminal\s+)?[`"']?(.+?)[`"']?\s*$/i);
    if (cmdMatch) {
      steps.push(buildStep('runTerminalCommand', { command: cmdMatch[1] }, `Run: ${cmdMatch[1]}`));
    }
  }

  // Memory save
  if (/\b(remember|save\s+(?:to\s+)?memory|note\s+(?:that|down))\b/i.test(p) && AGENT_TOOLS['saveToMemory']) {
    const factMatch = prompt.match(/(?:remember|save|note)\s+(?:that\s+|to\s+memory\s+|down\s+)?(.+)/i);
    const fact = factMatch?.[1] || prompt;
    steps.push(buildStep('saveToMemory', { key: 'user_fact', value: fact, category: 'general' }, `Save to memory`));
  }

  // Memory recall
  if (/\b(recall|what\s+did\s+i|do\s+you\s+remember|retrieve)\b/i.test(p) && AGENT_TOOLS['recallFromMemory']) {
    steps.push(buildStep('recallFromMemory', { query: prompt }, `Recall from memory`));
  }

  // Reminder
  if (/\b(remind|reminder|set\s+reminder)\b/i.test(p) && AGENT_TOOLS['setReminder']) {
    const msgMatch = prompt.match(/(?:remind\s+(?:me\s+)?(?:to\s+|about\s+)?|reminder\s+(?:for\s+|about\s+)?)(.+)/i);
    steps.push(buildStep('setReminder', { message: msgMatch?.[1] || prompt }, `Set reminder`));
  }

  // Screen capture context
  if (/\b(screenshot|capture\s+screen|screen\s+context|screen\s+state)\b/i.test(p) && AGENT_TOOLS['captureScreenContext']) {
    steps.push(buildStep('captureScreenContext', {}, 'Capture screen context'));
  }

  // System info
  if (/\b(system\s+info|os|hostname|disk|memory\s+usage)\b/i.test(p) && AGENT_TOOLS['getSystemInfo']) {
    steps.push(buildStep('getSystemInfo', {}, 'Get system information'));
  }

  return steps.length > 0 ? steps : null;
}

// ─── Utility ───

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
