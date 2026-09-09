export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AgentToolResult {
  success: boolean;
  message: string;
  url?: string;
  externalUrl?: string;
  data?: any;
  requiresConfirmation?: {
    toolName: string;
    args: any;
    promptMessage: string;
  };
  error?: string;
  pendingNavigation?: boolean;
  navigationId?: string;
  expectedRoute?: string;
  expectedEntity?: {
    type: 'sheet' | 'problem' | 'course' | 'certificate';
    id: string;
    title?: string;
    number?: number;
  };
  successMessage?: string;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  category: string;
  riskLevel: RiskLevel;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
  execute: (args: any, user: { id: string }, context?: any) => Promise<AgentToolResult>;
}

const HIGH_RISK_TOOLS = new Set([
  'writeFile', 'deleteFile', 'runTerminalCommand', 'clearPersistentMemory', 'clearMemory'
]);

const TOOL_NAMES = [
  'openDashboard', 'openProfile', 'openCourses', 'openMyCourses', 'openCourse',
  'openDSASheets', 'openDSASheet', 'getAvailableDSASheets', 'openDSAProblem',
  'queryLivePage', 'getCurrentPageContext', 'interactWithPageElement', 'fillFormInput',
  'scanLivePageElements', 'openWeakestDSAProblem', 'openCodingArena', 'openCodingProfile',
  'openRoutine', 'openGoals', 'openCertificate', 'openBadges', 'openLatexEditor',
  'openNotifications', 'openLeaderboard', 'openDoubts', 'searchYouTube', 'searchWeb',
  'searchGPT', 'searchProgramSeats', 'getStudent360', 'getWeakAreas', 'getRecommendations',
  'getMyDSAProgress', 'getMyRoutine', 'generateTomorrowRoutine', 'createRoutine', 'getMyGoals',
  'createGoal', 'createCodingSheet', 'addProblemsToSheet', 'runSafeSQLQuery', 'getNotices',
  'createNotice', 'getDSASheetDetails', 'readLatexCode', 'editLatexCode',
  'openInstructorDashboard', 'openInstructorCourses', 'createCourse', 'editCourse',
  'createModule', 'createMCQ', 'openAdminDashboard', 'openAdminCourses', 'openAdminUsers',
  'openAdminNptel', 'openDeveloperPanel', 'getLeaderboardRank', 'webSearch', 'webScrape',
  'summarizeURL', 'readFile', 'writeFile', 'listDirectory', 'deleteFile', 'getSystemInfo',
  'runTerminalCommand', 'captureScreenContext', 'readScreenRegion', 'saveToMemory',
  'recallFromMemory', 'setReminder', 'listReminders', 'clearPersistentMemory'
] as const;

const descriptions: Record<string, string> = {
  readFile: 'Read a local file through the authenticated server.',
  writeFile: 'Write a local file. Requires explicit confirmation.',
  deleteFile: 'Delete a local file. Requires explicit confirmation.',
  listDirectory: 'List a local directory through the authenticated server.',
  runTerminalCommand: 'Execute a terminal command. Requires explicit confirmation.',
  clearPersistentMemory: 'Clear persistent agent memory. Requires explicit confirmation.'
};

function createClientTool(name: string): AgentToolDefinition {
  const riskLevel: RiskLevel = HIGH_RISK_TOOLS.has(name) ? 'HIGH' : 'MEDIUM';
  return {
    name,
    description: descriptions[name] || `Execute the ${name} Smart Learn Agent tool.`,
    category: 'REMOTE',
    riskLevel,
    parameters: { type: 'object', properties: {} },
    execute: async (args, _user, context) => {
      try {
        const response = await fetch('/api/ai/agent-tool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolName: name,
            args,
            pageContext: context,
            confirmed: context?.__agentConfirmation === true
          })
        });
        const payload = await response.json();
        if (!response.ok) {
          return {
            success: false,
            message: payload.message || 'Agent tool request failed.',
            error: payload.errorCode || `HTTP_${response.status}`
          };
        }
        return payload.result as AgentToolResult;
      } catch (error: any) {
        return { success: false, message: error?.message || 'Agent tool request failed.' };
      }
    }
  };
}

export const AGENT_TOOLS: Record<string, AgentToolDefinition> = Object.fromEntries(
  TOOL_NAMES.map(name => [name, createClientTool(name)])
);
