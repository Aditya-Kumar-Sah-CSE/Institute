export { AGENT_TOOLS } from './agent-tools-client';
export type { AgentToolDefinition, AgentToolResult, RiskLevel } from './agent-tools-client';

import { AGENT_TOOLS } from './agent-tools-client';
import type { AgentToolDefinition } from './agent-tools-client';

export function selectRelevantTools(userPrompt: string): AgentToolDefinition[] {
  const prompt = userPrompt.toLowerCase();
  const tools = Object.values(AGENT_TOOLS);

  if (!prompt.trim()) return tools.slice(0, 15);

  const keywords = prompt.split(/\s+/).filter(Boolean);
  const relevant = tools.filter(tool => {
    const searchable = `${tool.name} ${tool.description}`.toLowerCase();
    return keywords.some(keyword => searchable.includes(keyword));
  });

  return (relevant.length > 0 ? relevant : tools).slice(0, 15);
}
