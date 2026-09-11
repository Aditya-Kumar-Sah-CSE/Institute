import { AgentChatMessage } from '../agent';

export type AIProviderName = 'gemini' | 'grok' | 'groq';

export interface AIProviderToolDeclaration {
  name: string;
  description: string;
  parameters: any;
}

export interface AIProviderToolCall {
  name: string;
  args: any;
}

export interface AIProviderResponse {
  success: boolean;
  text?: string;
  toolCalls?: AIProviderToolCall[];
  error?: string;
}

export interface AIProvider {
  readonly name: AIProviderName;
  readonly apiKey: string;

  generateResponse(params: {
    systemInstruction: string;
    history?: AgentChatMessage[];
    prompt: string;
    tools?: AIProviderToolDeclaration[];
    agentContext?: any;
  }): Promise<AIProviderResponse>;

  testConnection(): Promise<{ success: boolean; message: string }>;
}
