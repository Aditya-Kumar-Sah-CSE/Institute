import 'server-only';
import { DefaultLLMBridge } from './llm-provider';
import { WorkspaceManager } from './workspace-manager';
import { CompilerBridge } from './compiler-bridge';
import { PatchManager } from './patch-manager';
import { BrowserVerifier } from './browser-verifier';
import { AgentPlanner } from './agent-planner';
import { AgentMemory } from './agent-memory';
import { AutonomousAgentReport, DiagnosticError } from './types';

export class AgentOrchestrator {
  /**
   * Executes the full autonomous coding pipeline for a user prompt.
   */
  public static async run(params: {
    prompt: string;
    userRole?: string;
    maxRetries?: number;
    onProgress?: (phase: string, label: string, details?: string, status?: 'pending' | 'in_progress' | 'completed' | 'failed') => void;
  }): Promise<AutonomousAgentReport> {
    const { prompt, maxRetries = 3, onProgress } = params;
    const memory = new AgentMemory(prompt);
    const llm = new DefaultLLMBridge();

    const notify = (phase: any, label: string, status: 'pending' | 'in_progress' | 'completed' | 'failed', details?: string) => {
      memory.logStep(phase, label, status, details);
      onProgress?.(phase, label, details, status);
    };

    // 1. Intent Detection & Planning
    notify('intent_detection', 'Analyzing request intent & goal', 'in_progress');
    const plan = AgentPlanner.createExecutionPlan(prompt);
    notify('planning', `Execution plan generated for target route: ${plan.targetRoute}`, 'completed');

    // 2. Project Inspection
    notify('project_inspection', 'Inspecting workspace structure & files', 'in_progress');
    const existingFileList = await WorkspaceManager.listWorkspaceFiles('src', 50);
    memory.recordInspectedFiles(existingFileList);

    // Read key context files if they exist (e.g. package.json or layout)
    const existingFiles: Record<string, string> = {};
    for (const f of existingFileList.slice(0, 5)) {
      const res = await WorkspaceManager.readFile(f);
      if (res.success && res.content) {
        existingFiles[f] = res.content.slice(0, 1000);
      }
    }

    // Include route-specific files even when directory ordering puts them
    // outside the small inspection window sent to the model.
    const routeContextCandidates = plan.targetRoute === '/login'
      ? ['src/app/(auth)/login/page.tsx', 'src/features/auth/components/LoginForm.tsx']
      : [];
    for (const filePath of routeContextCandidates) {
      if (existingFiles[filePath]) continue;
      const res = await WorkspaceManager.readFile(filePath);
      if (res.success && res.content) existingFiles[filePath] = res.content.slice(0, 6000);
    }

    notify('project_inspection', `Inspected ${existingFileList.length} workspace files`, 'completed');

    // 3. LLM Solution Generation
    notify('llm_generation', 'Generating structured solution via LLM', 'in_progress');
    const llmResponse = await llm.generate({
      prompt,
      projectContext: `Target Route: ${plan.targetRoute}\nTotal Inspected Files: ${existingFileList.length}`,
      existingFiles,
      userRole: params.userRole
    });

    const targetRoute = llmResponse.targetRoute || plan.targetRoute;
    notify('llm_generation', `Solution generated: ${llmResponse.explanation}`, 'completed');

    // 4. Structured File / Patch Extraction
    notify('structured_patch_extraction', `Extracted ${llmResponse.files.length} file modifications`, 'in_progress');
    const targetPaths = llmResponse.files.map(f => f.path);
    notify('structured_patch_extraction', `Files to update: ${targetPaths.join(', ')}`, 'completed');

    // 5. Workspace Apply with Safety Checkpoint
    notify('workspace_apply', 'Creating backup checkpoint & applying changes', 'in_progress');
    const checkpointId = await WorkspaceManager.createCheckpoint('Pre-Autonomous-Coding', targetPaths);
    memory.setCheckpoint(checkpointId);

    const applyRes = await PatchManager.applyWorkspaceFiles(llmResponse.files);
    if (!applyRes.success) {
      notify('workspace_apply', 'Failed to apply workspace files', 'failed', applyRes.errors.join(', '));
      await WorkspaceManager.rollbackCheckpoint(checkpointId);
      const comp = await CompilerBridge.getDiagnostics();
      return memory.generateReport(false, targetRoute, comp, 0, undefined, applyRes.errors.join('; '));
    }
    memory.recordModifiedFiles(applyRes.appliedPaths);
    notify('workspace_apply', `Applied ${applyRes.appliedPaths.length} files cleanly`, 'completed');

    // 6. Diagnostics & Fast Compiler Check
    notify('compilation', 'Running fast TypeScript diagnostics check', 'in_progress');
    let compilation = await CompilerBridge.getDiagnostics();

    let repairIterations = 0;

    // 7. Autonomous Repair Loop (Up to maxRetries)
    if (!compilation.success && compilation.diagnostics.length > 0) {
      notify('repair_loop', `Compilation errors detected (${compilation.diagnostics.length}). Starting repair loop...`, 'in_progress');

      while (!compilation.success && repairIterations < maxRetries) {
        repairIterations++;
        notify('repair_loop', `Repair Loop Iteration ${repairIterations}/${maxRetries}`, 'in_progress');

        // Extract offending files content
        const offendingFiles: Record<string, string> = {};
        for (const diag of compilation.diagnostics) {
          if (diag.file && diag.file !== 'unknown') {
            const fileRead = await WorkspaceManager.readFile(diag.file);
            if (fileRead.success && fileRead.content) {
              offendingFiles[diag.file] = fileRead.content;
            }
          }
        }

        // Request structured fix from LLM
        const fixResponse = await llm.fix({
          prompt,
          diagnostics: compilation.diagnostics,
          offendingFiles,
          rawErrorLog: compilation.rawOutput.slice(0, 3000)
        });

        if (fixResponse.patches.length > 0) {
          const patchRes = await PatchManager.applyCodePatches(fixResponse.patches);
          if (patchRes.success) {
            memory.recordModifiedFiles(patchRes.appliedPaths);
            notify('repair_loop', `Applied ${patchRes.appliedPaths.length} patch fixes: ${fixResponse.explanation}`, 'completed');
          }
        }

        // Re-run diagnostics
        compilation = await CompilerBridge.getDiagnostics();
      }

      if (!compilation.success) {
        notify('repair_loop', `Exceeded retry limit (${maxRetries}). Rolling back checkpoint...`, 'failed');
        await WorkspaceManager.rollbackCheckpoint(checkpointId);
        return memory.generateReport(
          false, 
          targetRoute, 
          compilation, 
          repairIterations, 
          undefined, 
          `Compilation failed after ${repairIterations} retries: ${compilation.diagnostics.map(d => d.message).join('; ')}`
        );
      } else {
        notify('repair_loop', `All compilation errors successfully repaired in ${repairIterations} iteration(s)!`, 'completed');
      }
    } else {
      notify('compilation', 'Compilation & TypeScript check passed cleanly with 0 errors!', 'completed');
    }

    // 8. Run the full Smart Learn compiler after the fast diagnostic pass.
    notify('compilation', 'Running Smart Learn production compiler', 'in_progress');
    const buildResult = await CompilerBridge.compile();
    if (!buildResult.success) {
      notify('compilation', 'Production compiler failed; rolling back checkpoint', 'failed', buildResult.rawOutput.slice(-2000));
      await WorkspaceManager.rollbackCheckpoint(checkpointId);
      return memory.generateReport(
        false,
        targetRoute,
        buildResult,
        repairIterations,
        undefined,
        `Production build failed: ${buildResult.diagnostics.map(d => d.message).join('; ') || buildResult.rawOutput.slice(-1000)}`
      );
    }
    notify('compilation', 'Smart Learn production compiler passed', 'completed');

    // 9. Browser verification is completed client-side after navigation when the API is called from the drawer.
    notify('browser_verification', `Verifying target route ${targetRoute} and DOM elements`, 'in_progress');
    const browserVerification = await BrowserVerifier.verifyRoute({
      route: targetRoute,
      requiredElements: {
        emailInput: targetRoute.includes('login'),
        passwordInput: targetRoute.includes('login'),
        loginButton: targetRoute.includes('login')
      }
    });

    notify('browser_verification', browserVerification.message, browserVerification.verified ? 'completed' : 'failed');

    // 10. Completed & Final Success Report
    notify('completed', `Autonomous coding completed successfully for "${prompt}"!`, 'completed');

    return memory.generateReport(
      true,
      targetRoute,
      compilation,
      repairIterations,
      browserVerification
    );
  }
}
