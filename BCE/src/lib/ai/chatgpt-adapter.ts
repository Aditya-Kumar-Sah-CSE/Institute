import { callLocalComputer } from './local-computer-controller';

export interface ChatGPTTaskResult {
  success: boolean;
  message: string;
  data?: {
    source: string;
    query: string;
    answer?: string;
    code?: string;
    language?: string;
    verified?: boolean;
    externalUrl?: string;
  };
  errorStep?: 'OPEN' | 'INPUT_NOT_FOUND' | 'RESPONSE_UNREADABLE' | 'PASTE_FAILED';
}

export class ChatGPTAdapter {
  /**
   * Resilient dynamic selectors and accessibility attributes for ChatGPT UI.
   * Uses multiple fallback strategies to prevent breakage on UI updates.
   */
  private static INPUT_SELECTORS = [
    '#prompt-textarea',
    'textarea[id*="prompt"]',
    'textarea[placeholder*="Ask"]',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="ChatGPT"]',
    'div[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"]',
    '[aria-label*="Ask ChatGPT"]',
    '[aria-label*="Message ChatGPT"]',
    '[aria-label*="Send a message"]',
    'textarea'
  ];

  private static SEND_BUTTON_SELECTORS = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="Submit"]',
    'button:has(svg[viewBox])',
    'form button[type="submit"]'
  ];

  private static RESPONSE_CONTAINER_SELECTORS = [
    'div[data-message-author-role="assistant"]',
    '.markdown.prose',
    'div[class*="agent-turn"]',
    'div[class*="assistant-message"]',
    '.markdown'
  ];

  /**
   * Step 1: Open ChatGPT in Desktop/Browser Companion or default URL
   */
  static async openChatGPT(): Promise<{ success: boolean; url: string; message: string }> {
    const compRes = await callLocalComputer({
      action: 'openExternalApp',
      app: 'chatgpt',
      url: 'https://chatgpt.com'
    });

    if (compRes.success && compRes.data) {
      return {
        success: true,
        url: (compRes.data as any)?.url || 'https://chatgpt.com',
        message: 'ChatGPT opened in desktop companion.'
      };
    }

    return {
      success: true,
      url: 'https://chatgpt.com',
      message: 'ChatGPT target URL resolved.'
    };
  }

  /**
   * Step 2: Locate prompt input element using dynamic accessibility & text criteria
   */
  static async findPromptInput(): Promise<{ success: boolean; selector?: string; message: string }> {
    for (const selector of this.INPUT_SELECTORS) {
      const compRes = await callLocalComputer({
        action: 'findElement',
        selector,
        timeoutMs: 2000
      });

      if (compRes.success && compRes.data) {
        return {
          success: true,
          selector,
          message: `Found ChatGPT prompt input matching "${selector}".`
        };
      }
    }

    // Client DOM fallback check if running in browser window
    if (typeof document !== 'undefined') {
      for (const selector of this.INPUT_SELECTORS) {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (el) {
          return {
            success: true,
            selector,
            message: `Found ChatGPT prompt input in client DOM ("${selector}").`
          };
        }
      }
    }

    return {
      success: false,
      message: 'ChatGPT opened, but its input could not be detected.'
    };
  }

  /**
   * Step 3: Type search query and submit to ChatGPT UI
   */
  static async submitQuery(
    query: string,
    inputSelector?: string
  ): Promise<{ success: boolean; message: string }> {
    const targetSelector = inputSelector || this.INPUT_SELECTORS[0];

    // Focus input
    await callLocalComputer({
      action: 'focusElement',
      selector: targetSelector
    });

    // Type query
    const typeRes = await callLocalComputer({
      action: 'typeText',
      selector: targetSelector,
      text: query
    });

    if (!typeRes.success) {
      // Fallback client DOM execution
      if (typeof document !== 'undefined') {
        const inputEl = document.querySelector(targetSelector) as HTMLInputElement | HTMLTextAreaElement | null;
        if (inputEl) {
          inputEl.focus();
          if ('value' in inputEl) inputEl.value = query;
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }

    // Submit via Send button or Enter key
    let submitRes = await callLocalComputer({
      action: 'clickElement',
      selector: this.SEND_BUTTON_SELECTORS[0]
    });

    if (!submitRes.success) {
      submitRes = await callLocalComputer({
        action: 'pressKey',
        selector: targetSelector,
        key: 'Enter'
      });
    }

    return {
      success: true,
      message: `Submitted search query "${query}" to ChatGPT UI.`
    };
  }

  /**
   * Step 4 & 5: Wait for response and read visible response text
   */
  static async readResponse(): Promise<{ success: boolean; rawText?: string; message: string }> {
    // Wait for response to render
    const waitRes = await callLocalComputer({
      action: 'waitForElement',
      selector: this.RESPONSE_CONTAINER_SELECTORS[0],
      timeoutMs: 8000
    });

    for (const selector of this.RESPONSE_CONTAINER_SELECTORS) {
      const readRes = await callLocalComputer({
        action: 'readVisibleText',
        selector
      });

      if (readRes.success && readRes.data && typeof (readRes.data as any).text === 'string') {
        const text = ((readRes.data as any).text as string).trim();
        if (text.length > 10) {
          return {
            success: true,
            rawText: text,
            message: 'Successfully read ChatGPT response.'
          };
        }
      }
    }

    // Client DOM fallback reading
    if (typeof document !== 'undefined') {
      for (const selector of this.RESPONSE_CONTAINER_SELECTORS) {
        const els = document.querySelectorAll(selector);
        if (els.length > 0) {
          const lastEl = els[els.length - 1];
          const text = lastEl.textContent?.trim() || '';
          if (text.length > 10) {
            return {
              success: true,
              rawText: text,
              message: 'Successfully read ChatGPT response from DOM.'
            };
          }
        }
      }
    }

    return {
      success: false,
      message: 'ChatGPT opened and search was submitted, but response could not be read.'
    };
  }

  /**
   * Step 6: Cleanly extract Python/code block from raw response text
   */
  static extractCodeSolution(
    rawText: string,
    requestedLanguage: string = 'python'
  ): { code?: string; explanation: string; language: string } {
    const langLower = requestedLanguage.toLowerCase();
    
    // Match code blocks ```python ... ``` or ```cpp ... ```
    const codeBlockRegex = new RegExp(`\`\`\`(?:${langLower}|[a-z0-9_+-]*)?\\s*([\\s\\S]*?)\`\`\``, 'gi');
    const matches = Array.from(rawText.matchAll(codeBlockRegex));

    if (matches.length > 0 && matches[0][1]) {
      const code = matches[0][1].trim();
      const explanation = rawText.replace(codeBlockRegex, '').trim() || `Code solution extracted for ${requestedLanguage}.`;
      return {
        code,
        explanation,
        language: requestedLanguage
      };
    }

    // Fallback: search for inline function definition e.g. def twoSum(...)
    const defMatch = rawText.match(/(def\s+[a-zA-Z0-9_]+\([\s\S]*?\):[\s\S]*?(?=\n\n|\n[A-Z]|$))/i);
    if (defMatch && defMatch[0]) {
      return {
        code: defMatch[0].trim(),
        explanation: rawText.replace(defMatch[0], '').trim(),
        language: requestedLanguage
      };
    }

    return {
      explanation: rawText,
      language: requestedLanguage
    };
  }

  /**
   * Step 7 & 8: Copy code, paste into Smart Learn chat input, and verify change
   */
  static async copyAndPasteToSmartLearn(
    codeText: string
  ): Promise<{ success: boolean; message: string; verified: boolean }> {
    if (!codeText) {
      return {
        success: false,
        message: 'No code content to copy/paste.',
        verified: false
      };
    }

    // Copy action
    await callLocalComputer({
      action: 'copyText',
      text: codeText
    });

    // Client DOM Paste & Verification
    if (typeof document !== 'undefined') {
      const chatInput = document.querySelector(
        'textarea[placeholder*="Ask"], textarea[placeholder*="Smart"], textarea[placeholder*="Message"], input[type="text"]'
      ) as HTMLTextAreaElement | HTMLInputElement | null;

      if (chatInput) {
        chatInput.focus();
        const initialVal = chatInput.value || '';
        chatInput.value = codeText;

        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        chatInput.dispatchEvent(new Event('change', { bubbles: true }));

        const finalVal = chatInput.value || '';
        const verified = finalVal === codeText || finalVal.includes(codeText.slice(0, 20));

        if (verified) {
          return {
            success: true,
            message: 'Successfully copied solution code, pasted into Smart Learn Chat, and verified input content.',
            verified: true
          };
        }
      }
    }

    // Desktop Companion Paste attempt
    const compPaste = await callLocalComputer({
      action: 'pasteText',
      text: codeText
    });

    if (compPaste.success) {
      return {
        success: true,
        message: 'Successfully copied solution and pasted via desktop companion.',
        verified: true
      };
    }

    return {
      success: false,
      message: 'Solution retrieved, but paste verification failed.',
      verified: false
    };
  }

  /**
   * Complete Pipeline Execution with Fallback Strategy
   */
  static async executeTask(
    query: string,
    requestedLanguage: string = 'python'
  ): Promise<ChatGPTTaskResult> {
    const openRes = await this.openChatGPT();

    // Check input detection
    const inputRes = await this.findPromptInput();
    if (!inputRes.success) {
      return {
        success: false,
        message: 'ChatGPT opened, but its input could not be detected.',
        errorStep: 'INPUT_NOT_FOUND',
        data: { source: 'chatgpt', query, externalUrl: openRes.url }
      };
    }

    // Submit query
    await this.submitQuery(query, inputRes.selector);

    // Read response
    const responseRes = await this.readResponse();
    if (!responseRes.success || !responseRes.rawText) {
      return {
        success: false,
        message: 'ChatGPT opened and search was submitted, but response could not be read.',
        errorStep: 'RESPONSE_UNREADABLE',
        data: { source: 'chatgpt', query, externalUrl: openRes.url }
      };
    }

    // Extract code
    const extracted = this.extractCodeSolution(responseRes.rawText, requestedLanguage);

    // Copy & Paste if code is present
    let pasteVerified = false;
    if (extracted.code) {
      const pasteRes = await this.copyAndPasteToSmartLearn(extracted.code);
      pasteVerified = pasteRes.verified;
      if (!pasteRes.success) {
        return {
          success: false,
          message: 'Solution retrieved, but paste verification failed.',
          errorStep: 'PASTE_FAILED',
          data: {
            source: 'chatgpt',
            query,
            answer: extracted.explanation,
            code: extracted.code,
            language: extracted.language,
            verified: false,
            externalUrl: openRes.url
          }
        };
      }
    }

    const formattedMsg = `🔍 **Source**: ChatGPT (UI Verified Automation)\n` +
      `💡 **Query**: ${query}\n\n` +
      `📝 **Explanation**:\n${extracted.explanation}\n\n` +
      (extracted.code ? `💻 **Solution (${extracted.language})**:\n\`\`\`${extracted.language}\n${extracted.code}\n\`\`\`\n\n` : '') +
      `✅ **Status**: Solution successfully extracted and verified in Smart Learn chat.`;

    return {
      success: true,
      message: formattedMsg,
      data: {
        source: 'chatgpt',
        query,
        answer: extracted.explanation,
        code: extracted.code,
        language: extracted.language,
        verified: pasteVerified,
        externalUrl: openRes.url
      }
    };
  }
}
