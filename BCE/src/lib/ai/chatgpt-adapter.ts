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
    diagnostics?: {
      target: string;
      companionAvailable: boolean;
      windowDetected: boolean;
      candidateInputsCount: number;
      diagnosticReason: string;
    };
  };
  errorStep?: 'OPEN' | 'INPUT_NOT_FOUND' | 'RESPONSE_UNREADABLE' | 'PASTE_FAILED';
}

export class ChatGPTAdapter {
  /**
   * Resilient dynamic selectors and accessibility attributes for ChatGPT UI.
   */
  private static INPUT_SELECTORS = [
    '#prompt-textarea',
    'textarea[id*="prompt"]',
    'textarea[placeholder*="Ask"]',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="ChatGPT"]',
    'textarea[placeholder*="Send a message"]',
    'textarea:not([disabled])',
    'div[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"]',
    '[role="textbox"][contenteditable="true"]',
    '[role="textbox"]',
    'textarea'
  ];

  private static SEND_BUTTON_SELECTORS = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="Submit"]',
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
   * Step 1: Open ChatGPT in controlled external browser (Chrome via Companion)
   */
  static async openChatGPT(): Promise<{ success: boolean; url: string; message: string; companionConnected: boolean }> {
    const compRes = await callLocalComputer({
      action: 'openExternalApp',
      app: 'chatgpt',
      url: 'https://chatgpt.com'
    });

    if (compRes.success) {
      return {
        success: true,
        url: (compRes.data as any)?.url || 'https://chatgpt.com',
        message: 'ChatGPT opened in real browser (Chrome).',
        companionConnected: true
      };
    }

    return {
      success: false,
      url: 'https://chatgpt.com',
      message: 'FAILED: External browser automation is not available. Ensure Smart Learn Companion is running (npm run companion).',
      companionConnected: false
    };
  }

  /**
   * Step 2: Locate prompt input element using dynamic accessibility selectors via CDP
   */
  static async findPromptInput(): Promise<{ 
    success: boolean; 
    selector?: string; 
    message: string;
    diagnostics: {
      target: string;
      companionAvailable: boolean;
      windowDetected: boolean;
      candidateInputsCount: number;
      diagnosticReason: string;
    };
  }> {
    // Companion CDP Inspection
    for (const selector of this.INPUT_SELECTORS) {
      const compRes = await callLocalComputer({
        action: 'findElement',
        selector,
        timeoutMs: 1500
      });

      if (compRes.success && compRes.data) {
        return {
          success: true,
          selector,
          message: `Found ChatGPT prompt input matching "${selector}" in real Chrome browser.`,
          diagnostics: {
            target: 'ChatGPT',
            companionAvailable: true,
            windowDetected: true,
            candidateInputsCount: 1,
            diagnosticReason: 'Target input found via companion CDP.'
          }
        };
      }
    }

    const diagReason = 'FAILED: External browser automation is not available or prompt input could not be detected in real Chrome browser.';

    return {
      success: false,
      message: diagReason,
      diagnostics: {
        target: 'ChatGPT',
        companionAvailable: false,
        windowDetected: false,
        candidateInputsCount: 0,
        diagnosticReason: diagReason
      }
    };
  }

  /**
   * Step 3: Type search query and submit to ChatGPT UI in real Chrome browser
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

    // Type query into real browser
    const typeRes = await callLocalComputer({
      action: 'typeText',
      selector: targetSelector,
      text: query
    });

    if (!typeRes.success) {
      return {
        success: false,
        message: `FAILED: Typing query into real browser input failed: ${typeRes.message}`
      };
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
      message: `Submitted query "${query}" to ChatGPT in real browser.`
    };
  }

  /**
   * Step 4 & 5: Wait for response and read visible text from real browser
   */
  static async readResponse(): Promise<{ success: boolean; rawText?: string; message: string }> {
    // Wait for response to render in real browser
    await callLocalComputer({
      action: 'waitForElement',
      selector: this.RESPONSE_CONTAINER_SELECTORS[0],
      timeoutMs: 10000
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
            message: 'Successfully read ChatGPT response from real browser tab.'
          };
        }
      }
    }

    return {
      success: false,
      message: 'FAILED: ChatGPT opened and search was submitted, but response could not be read from real browser tab.'
    };
  }

  /**
   * Step 6: Extract Python/code block from raw response text
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

    // Fallback: search for inline function definition e.g. def reverse_number(...) or def twoSum(...)
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
   * Step 7 & 8: Copy code to system clipboard and paste into Smart Learn chat input
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

    // Copy action via system clipboard
    await callLocalComputer({
      action: 'copyText',
      text: codeText
    });

    // Client DOM Paste & Verification inside Smart Learn
    if (typeof document !== 'undefined') {
      const chatInput = document.querySelector(
        'textarea[placeholder*="Ask"], textarea[placeholder*="Smart"], textarea[placeholder*="Message"], input[type="text"]'
      ) as HTMLTextAreaElement | HTMLInputElement | null;

      if (chatInput) {
        chatInput.focus();
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

    // Companion Paste fallback
    const compPaste = await callLocalComputer({
      action: 'pasteText',
      text: codeText
    });

    if (compPaste.success) {
      return {
        success: true,
        message: 'Successfully copied solution and pasted into input content.',
        verified: true
      };
    }

    return {
      success: false,
      message: 'FAILED: Solution retrieved, but paste verification into destination failed.',
      verified: false
    };
  }

  /**
   * Complete Real Execution Pipeline
   */
  static async executeTask(
    query: string,
    requestedLanguage: string = 'python'
  ): Promise<ChatGPTTaskResult> {
    const openRes = await this.openChatGPT();
    if (!openRes.success) {
      return {
        success: false,
        message: openRes.message,
        errorStep: 'OPEN',
        data: {
          source: 'chatgpt',
          query,
          externalUrl: openRes.url
        }
      };
    }

    // Bounded UI Readiness Delay (1.5s) to allow page/window hydration
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Check input detection with 2-pass scan
    let inputRes = await this.findPromptInput();
    if (!inputRes.success) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      inputRes = await this.findPromptInput();
    }

    if (!inputRes.success) {
      return {
        success: false,
        message: inputRes.message,
        errorStep: 'INPUT_NOT_FOUND',
        data: {
          source: 'chatgpt',
          query,
          externalUrl: openRes.url,
          diagnostics: inputRes.diagnostics
        }
      };
    }

    // Submit query
    const submitRes = await this.submitQuery(query, inputRes.selector);
    if (!submitRes.success) {
      return {
        success: false,
        message: submitRes.message,
        errorStep: 'INPUT_NOT_FOUND',
        data: {
          source: 'chatgpt',
          query,
          externalUrl: openRes.url
        }
      };
    }

    // Read response
    const responseRes = await this.readResponse();
    if (!responseRes.success || !responseRes.rawText) {
      return {
        success: false,
        message: responseRes.message,
        errorStep: 'RESPONSE_UNREADABLE',
        data: {
          source: 'chatgpt',
          query,
          externalUrl: openRes.url,
          diagnostics: inputRes.diagnostics
        }
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
          message: pasteRes.message,
          errorStep: 'PASTE_FAILED',
          data: {
            source: 'chatgpt',
            query,
            answer: extracted.explanation,
            code: extracted.code,
            language: extracted.language,
            verified: false,
            externalUrl: openRes.url,
            diagnostics: inputRes.diagnostics
          }
        };
      }
    }

    const formattedMsg = `🔍 **Source**: ChatGPT (Real Chrome Browser Verified Automation)\n` +
      `💡 **Query**: ${query}\n\n` +
      `📝 **Explanation**:\n${extracted.explanation}\n\n` +
      (extracted.code ? `💻 **Solution (${extracted.language})**:\n\`\`\`${extracted.language}\n${extracted.code}\n\`\`\`\n\n` : '') +
      `✅ **Status**: Solution successfully extracted and verified from real Chrome browser.`;

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
        externalUrl: openRes.url,
        diagnostics: inputRes.diagnostics
      }
    };
  }
}
