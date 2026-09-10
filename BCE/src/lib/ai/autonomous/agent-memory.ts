import { AutonomousStepProgress, AutonomousPhase, AutonomousAgentReport } from './types';

export class AgentMemory {
  private planId: string;
  private goal: string;
  private steps: AutonomousStepProgress[] = [];
  private logs: string[] = [];
  private inspectedFiles: Set<string> = new Set();
  private modifiedFiles: Set<string> = new Set();
  private checkpointId?: string;

  constructor(goal: string) {
    this.planId = `plan_auto_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.goal = goal;
  }

  public logStep(phase: AutonomousPhase, label: string, status: 'pending' | 'in_progress' | 'completed' | 'failed', details?: string) {
    const step: AutonomousStepProgress = {
      phase,
      label,
      status,
      details,
      timestamp: Date.now()
    };
    this.steps.push(step);
    this.logs.push(`[${new Date().toISOString()}] [${phase.toUpperCase()}] ${label} (${status})${details ? `: ${details}` : ''}`);
  }

  public recordInspectedFiles(files: string[]) {
    files.forEach(f => this.inspectedFiles.add(f));
  }

  public recordModifiedFiles(files: string[]) {
    files.forEach(f => this.modifiedFiles.add(f));
  }

  public setCheckpoint(checkpointId: string) {
    this.checkpointId = checkpointId;
  }

  public getPlanId(): string {
    return this.planId;
  }

  public getGoal(): string {
    return this.goal;
  }

  public getSteps(): AutonomousStepProgress[] {
    return [...this.steps];
  }

  public getLogs(): string[] {
    return [...this.logs];
  }

  public generateReport(
    success: boolean,
    targetRoute: string,
    compilation: any,
    repairIterations: number,
    browserVerification?: any,
    errorMessage?: string
  ): AutonomousAgentReport {
    return {
      success,
      planId: this.planId,
      goal: this.goal,
      targetRoute,
      inspectedFiles: Array.from(this.inspectedFiles),
      modifiedFiles: Array.from(this.modifiedFiles),
      compilation,
      repairIterations,
      browserVerification,
      steps: this.steps,
      logs: this.logs,
      checkpointId: this.checkpointId,
      errorMessage
    };
  }
}
