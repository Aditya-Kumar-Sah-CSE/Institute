export type FileActionType = 'create' | 'modify' | 'delete';

export interface WorkspaceFile {
  path: string;
  action: FileActionType;
  content?: string;
  previousContent?: string;
}

export interface CodePatch {
  path: string;
  action: FileActionType;
  content?: string;
  targetContent?: string;
  replacementContent?: string;
}

export interface DiagnosticError {
  file: string;
  line: number;
  column: number;
  message: string;
  code?: string;
  severity: 'error' | 'warning';
  snippet?: string;
}

export interface CompilationResult {
  success: boolean;
  diagnostics: DiagnosticError[];
  rawOutput: string;
  exitCode?: number;
}

export interface BrowserVerificationRequest {
  route: string;
  requiredElements?: {
    emailInput?: boolean;
    passwordInput?: boolean;
    loginButton?: boolean;
    customSelectors?: string[];
  };
}

export interface BrowserVerificationResult {
  route: string;
  verified: boolean;
  foundElements: string[];
  missingElements: string[];
  consoleErrors: string[];
  uiState: string;
  message: string;
}

export interface LLMGenerationRequest {
  prompt: string;
  projectContext: string;
  existingFiles: Record<string, string>;
  userRole?: string;
}

export interface StructuredLLMGenerationResponse {
  plan: string[];
  explanation: string;
  files: WorkspaceFile[];
  targetRoute?: string;
}

export interface LLMFixRequest {
  prompt: string;
  diagnostics: DiagnosticError[];
  offendingFiles: Record<string, string>;
  rawErrorLog: string;
}

export interface StructuredLLMFixResponse {
  explanation: string;
  patches: CodePatch[];
}

export interface LLMProvider {
  name: string;
  generate(request: LLMGenerationRequest): Promise<StructuredLLMGenerationResponse>;
  fix(request: LLMFixRequest): Promise<StructuredLLMFixResponse>;
}

export type AutonomousPhase = 
  | 'idle'
  | 'intent_detection'
  | 'planning'
  | 'project_inspection'
  | 'llm_generation'
  | 'structured_patch_extraction'
  | 'workspace_apply'
  | 'compilation'
  | 'diagnostics'
  | 'repair_loop'
  | 'browser_verification'
  | 'completed'
  | 'failed';

export interface AutonomousStepProgress {
  phase: AutonomousPhase;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  details?: string;
  timestamp: number;
}

export interface AutonomousProgressEvent {
  phase: AutonomousPhase;
  label: string;
  status: AutonomousStepProgress['status'];
  details?: string;
  timestamp: number;
}

export interface AutonomousAgentReport {
  success: boolean;
  planId: string;
  goal: string;
  targetRoute: string;
  inspectedFiles: string[];
  modifiedFiles: string[];
  compilation: CompilationResult;
  repairIterations: number;
  browserVerification?: BrowserVerificationResult;
  steps: AutonomousStepProgress[];
  logs: string[];
  checkpointId?: string;
  errorMessage?: string;
}
