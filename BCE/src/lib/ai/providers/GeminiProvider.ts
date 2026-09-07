import { GoogleGenAI } from '@google/genai';
import { AIProvider, AIProviderName, AIProviderResponse, AIProviderToolDeclaration } from './types';
import { AgentChatMessage } from '../agent';

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'];

export class GeminiProvider implements AIProvider {
  public readonly name: AIProviderName = 'gemini';
  public readonly apiKey: string;
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('Gemini API Key is required');
    this.apiKey = apiKey;
    this.client = new GoogleGenAI({ apiKey });
  }

  private isHighDemandOrRetryable(err: any): boolean {
    const msg = String(err?.message || err || '').toLowerCase();
    return (
      msg.includes('503') ||
      msg.includes('unavailable') ||
      msg.includes('high demand') ||
      msg.includes('resource_exhausted') ||
      msg.includes('429') ||
      msg.includes('overloaded')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async generateResponse(params: {
    systemInstruction: string;
    history?: AgentChatMessage[];
    prompt: string;
    tools?: AIProviderToolDeclaration[];
  }): Promise<AIProviderResponse> {
    const { systemInstruction, history = [], prompt, tools = [] } = params;

    const functionDeclarations = tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));

    const contents: any[] = [
      ...history.slice(-6).map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      })),
      { role: 'user', parts: [{ text: prompt }] }
    ];

    let lastError: any = null;

    // Try standard models with backoff retry
    for (const modelName of GEMINI_MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res: any = await this.client.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction,
              tools: functionDeclarations.length > 0 ? [{ functionDeclarations: functionDeclarations as any }] : undefined
            }
          });

          // 1. Check for function/tool calls first
          let toolCalls: { name: string; args: Record<string, any> }[] = [];

          if (Array.isArray(res.functionCalls) && res.functionCalls.length > 0) {
            toolCalls = res.functionCalls.map((call: any) => ({
              name: call.name || '',
              args: call.args || {}
            }));
          } else if (res.candidates?.[0]?.content?.parts) {
            for (const part of res.candidates[0].content.parts) {
              if (part.functionCall) {
                toolCalls.push({
                  name: part.functionCall.name || '',
                  args: part.functionCall.args || {}
                });
              }
            }
          }

          if (toolCalls.length > 0) {
            return {
              success: true,
              toolCalls
            };
          }

          // 2. Extract text response
          let responseText = '';
          try {
            responseText = res.text?.trim() ?? '';
          } catch (e) {
            // text getter fallback
          }

          if (!responseText && res.candidates?.[0]?.content?.parts) {
            for (const part of res.candidates[0].content.parts) {
              if (part.text) {
                responseText += part.text;
              }
            }
            responseText = responseText.trim();
          }

          if (responseText) {
            return {
              success: true,
              text: responseText
            };
          }

          // 3. Inspect finishReason & safety ratings
          const candidate = res.candidates?.[0];
          const finishReason = candidate?.finishReason || 'unknown';

          if (finishReason === 'SAFETY') {
            return {
              success: false,
              error: 'Content generation was blocked by Google Gemini safety filters.'
            };
          }

          if (finishReason === 'RECITATION') {
            return {
              success: false,
              error: 'Content generation was blocked due to recitation checks.'
            };
          }

          if (!res.candidates || res.candidates.length === 0) {
            return {
              success: false,
              error: 'Gemini API returned no candidates.'
            };
          }

          return {
            success: false,
            error: `Gemini API responded with finish reason '${finishReason}', but did not produce text or tool calls.`
          };
        } catch (err: any) {
          lastError = err;
          console.warn(`[GeminiProvider] ${modelName} attempt ${attempt + 1} failed:`, err?.message || err);
          if (this.isHighDemandOrRetryable(err) && attempt < 1) {
            await this.delay(1000);
            continue;
          }
          if (this.isHighDemandOrRetryable(err)) {
            break;
          }
          break;
        }
      }
    }

    const errMsg = lastError?.message || 'Gemini API call failed';
    if (this.isHighDemandOrRetryable(lastError)) {
      return {
        success: false,
        error: 'Google Gemini servers are currently experiencing high demand (503 Unavailable). Please wait a moment and try again, or switch to Grok in Settings.'
      };
    }

    return {
      success: false,
      error: errMsg
    };
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    let lastErr: any = null;

    for (const modelName of GEMINI_MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response: any = await this.client.models.generateContent({
            model: modelName,
            contents: 'Reply with exactly: CONNECTION_OK'
          });

          let text = '';
          try {
            text = response.text?.trim() ?? '';
          } catch (e) {
            // fallback
          }

          if (!text && response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.text) text += part.text;
            }
            text = text.trim();
          }

          const candidate = response.candidates?.[0];
          const finishReason = candidate?.finishReason || 'unknown';
          const hasText = Boolean(text);

          if (hasText || text.includes('CONNECTION_OK')) {
            return {
              success: true,
              message: `✓ Gemini connection successful using ${modelName}! API key is active and ready.`
            };
          }

          if (finishReason === 'SAFETY') {
            return {
              success: false,
              message: 'Gemini connection failed: Test prompt was blocked by safety filters.'
            };
          }
        } catch (err: any) {
          lastErr = err;
          if (this.isHighDemandOrRetryable(err) && attempt < 1) {
            await this.delay(1000);
            continue;
          }
          if (this.isHighDemandOrRetryable(err)) {
            break;
          }
          break;
        }
      }
    }

    const msg = lastErr?.message || 'Gemini API connection failed.';
    if (this.isHighDemandOrRetryable(lastErr)) {
      return {
        success: false,
        message: 'Google Gemini servers are currently experiencing high demand (503 Unavailable). Please try again in a few seconds or use Grok.'
      };
    }

    if (
      msg.includes('API_KEY_INVALID') ||
      msg.includes('400') ||
      msg.includes('403') ||
      msg.includes('unauthorized') ||
      msg.includes('API key') ||
      msg.includes('INVALID_ARGUMENT') ||
      msg.includes('404')
    ) {
      return {
        success: false,
        message: 'Invalid or unsupported Google Gemini API key/model. Please check your key in Google AI Studio.'
      };
    }

    return {
      success: false,
      message: `Gemini connection failed: ${msg}`
    };
  }
}
