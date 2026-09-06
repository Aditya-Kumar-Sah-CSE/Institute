/**
 * Agent Memory Management Utility for Persistent Rolling Conversation Summaries.
 * Stores ~200-word compressed summaries in localStorage under 'smartlearn_agent_memory_v1'
 * without bloating payload size or leaking sensitive data.
 */

export interface SmartAgentMemoryV1 {
  version: 1;
  summary: string;
  updatedAt: number;
  conversationId: string;
  activeContext: {
    userGoal?: string;
    activeCourse?: string;
    activeTopic?: string;
    activeProblem?: string;
    activeSheet?: string;
    lastAction?: string;
  };
}

export const MEMORY_STORAGE_KEY = 'smartlearn_agent_memory_v1';
export const SUMMARY_TRIGGER_MESSAGES = 10;
export const SUMMARY_TARGET_WORDS = 200;
export const RECENT_MESSAGES_TO_KEEP = 6;

/**
 * Safely loads agent memory from browser localStorage.
 */
export function loadAgentMemory(): SmartAgentMemoryV1 | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1 && typeof parsed.summary === 'string') {
      return parsed as SmartAgentMemoryV1;
    }
    return null;
  } catch (err) {
    console.warn('[AgentMemory] Failed to read or parse agent memory:', err);
    return null;
  }
}

/**
 * Safely saves updated agent memory to browser localStorage.
 */
export function saveAgentMemory(memory: SmartAgentMemoryV1): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Sanitize summary length to prevent localStorage bloat
    const sanitizedSummary = memory.summary ? memory.summary.trim().slice(0, 2000) : '';
    const payload: SmartAgentMemoryV1 = {
      version: 1,
      summary: sanitizedSummary,
      updatedAt: Date.now(),
      conversationId: memory.conversationId || `conv_${Date.now()}`,
      activeContext: memory.activeContext || {}
    };

    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[AgentMemory] Failed to save agent memory:', err);
    return false;
  }
}

/**
 * Clears agent memory from localStorage.
 */
export function clearAgentMemory(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.removeItem(MEMORY_STORAGE_KEY);
    return true;
  } catch (err) {
    console.warn('[AgentMemory] Failed to clear agent memory:', err);
    return false;
  }
}

/**
 * Formats structured prompt context according to production specifications.
 */
export function formatAgentPromptContext(params: {
  memorySummary?: string;
  recentMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentPage?: string;
  activeEntity?: string;
  lastAction?: string;
  studentAnalytics?: string;
}): string {
  const parts: string[] = [];

  if (params.memorySummary && params.memorySummary.trim()) {
    parts.push(`<agent_memory>\nPrevious conversation summary:\n${params.memorySummary.trim()}\n</agent_memory>`);
  }

  if (params.recentMessages && params.recentMessages.length > 0) {
    const formattedMsgs = params.recentMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    parts.push(`<recent_conversation>\n${formattedMsgs}\n</recent_conversation>`);
  }

  parts.push(`<live_app_context>\nCurrent page:\n${params.currentPage || '/dashboard'}\n\nActive entity:\n${params.activeEntity || 'None'}\n\nLast action:\n${params.lastAction || 'None'}\n</live_app_context>`);

  if (params.studentAnalytics && params.studentAnalytics.trim()) {
    parts.push(`<student_analytics>\n${params.studentAnalytics.trim()}\n</student_analytics>`);
  }

  return parts.join('\n\n');
}
