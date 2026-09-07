import { GoogleGenAI } from '@google/genai';
import { AIProvider, AIProviderName, AIProviderResponse, AIProviderToolDeclaration } from './types';
import { AgentChatMessage } from '../agent';

export class GeminiProvider implements AIProvider {
  public readonly name: AIProviderName = 'gemini';
  public readonly apiKey: string;
  private client: GoogleGenAI;
  private readonly modelName = 'gemini-3.6-flash';

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('Gemini API Key is required');
    this.apiKey = apiKey;
    this.client = new GoogleGenAI({ apiKey });
  }

  public async generateResponse(params: {
    systemInstruction: string;
    history?: AgentChatMessage[];
    prompt: string;
    tools?: AIProviderToolDeclaration[];
  }): Promise<AIProviderResponse> {
    try {
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

      const res: any = await this.client.models.generateContent({
        model: this.modelName,
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
        // text getter can throw if parts have non-text or empty candidates
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

      // 3. Inspect finishReason & safety ratings if text is empty
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
      console.error('[GeminiProvider Error]:', err?.message || err);
      return {
        success: false,
        error: err?.message || 'Gemini API call failed'
      };
    }
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response: any = await this.client.models.generateContent({
        model: this.modelName,
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
      const hasCandidates = Boolean(response.candidates && response.candidates.length > 0);
      const hasText = Boolean(text);

      if (process.env.NODE_ENV === 'development') {
        console.log('[Gemini BYOK Diagnostics]', {
          provider: 'gemini',
          model: this.modelName,
          finishReason,
          hasCandidates,
          hasText
        });
      }

      if (hasText || text.includes('CONNECTION_OK')) {
        return {
          success: true,
          message: '✓ Gemini connection successful! API key is active and ready.'
        };
      }

      if (finishReason === 'SAFETY') {
        return {
          success: false,
          message: 'Gemini connection failed: Test prompt was blocked by safety filters.'
        };
      }

      if (!hasCandidates) {
        return {
          success: false,
          message: 'Gemini API returned an empty response with no candidate outputs.'
        };
      }

      return {
        success: false,
        message: `Gemini API responded with finish reason '${finishReason}', but did not produce text output.`
      };
    } catch (err: any) {
      const msg = err?.message || 'Gemini API connection failed.';
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
}
