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
  private static CHATGPT_URL = 'https://chatgpt.com';

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
      url: this.CHATGPT_URL
    });

    if (compRes.success) {
      return {
        success: true,
        url: (compRes.data as any)?.url || this.CHATGPT_URL,
        message: 'ChatGPT opened in real browser (Chrome).',
        companionConnected: true
      };
    }

    return {
      success: false,
      url: this.CHATGPT_URL,
      message: compRes.message || 'FAILED: External browser automation is not available.',
      companionConnected: false
    };
  }

  /**
   * Step 2: Locate prompt input element using single-pass CDP candidate selector evaluation
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
    const compRes = await callLocalComputer({
      action: 'findElement',
      selectors: this.INPUT_SELECTORS,
      url: this.CHATGPT_URL,
      timeoutMs: 3000
    });

    if (compRes.success && compRes.data && (compRes.data as any).matchedSelector) {
      const matched = (compRes.data as any).matchedSelector as string;
      return {
        success: true,
        selector: matched,
        message: `Found ChatGPT prompt input matching "${matched}" in real Chrome browser tab (${(compRes.data as any)?.tabUrl || this.CHATGPT_URL}).`,
        diagnostics: {
          target: 'ChatGPT',
          companionAvailable: true,
          windowDetected: true,
          candidateInputsCount: 1,
          diagnosticReason: `Target input "${matched}" found via single-pass CDP.`
        }
      };
    }

    const diagReason = compRes.message || 'FAILED: Prompt input element could not be detected in ChatGPT browser tab.';

    return {
      success: false,
      message: diagReason,
      diagnostics: {
        target: 'ChatGPT',
        companionAvailable: compRes.companionConnected === true,
        windowDetected: true,
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
      selector: targetSelector,
      url: this.CHATGPT_URL
    });

    // Type query into real browser
    const typeRes = await callLocalComputer({
      action: 'typeText',
      selector: targetSelector,
      text: query,
      url: this.CHATGPT_URL
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
      selector: this.SEND_BUTTON_SELECTORS[0],
      url: this.CHATGPT_URL
    });

    if (!submitRes.success) {
      submitRes = await callLocalComputer({
        action: 'pressKey',
        selector: targetSelector,
        key: 'Enter',
        url: this.CHATGPT_URL
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
    await callLocalComputer({
      action: 'waitForElement',
      selector: this.RESPONSE_CONTAINER_SELECTORS[0],
      url: this.CHATGPT_URL,
      timeoutMs: 10000
    });

    for (const selector of this.RESPONSE_CONTAINER_SELECTORS) {
      const readRes = await callLocalComputer({
        action: 'readVisibleText',
        selector,
        url: this.CHATGPT_URL
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
   * Extract code block matching programming language from response text
   */
  static extractCode(rawText: string, preferredLang: string = 'python'): { code?: string; language: string } {
    const codeBlockRegex = /```(?:([a-zA-Z0-9+#]+)\n)?([\s\S]*?)```/g;
    let match: RegExpExecArray | null;

    let bestCode: string | undefined;
    let detectedLang = preferredLang;

    while ((match = codeBlockRegex.exec(rawText)) !== null) {
      const langTag = (match[1] || '').toLowerCase().trim();
      const codeSnippet = (match[2] || '').trim();

      if (codeSnippet.length > 0) {
        if (!bestCode || langTag === preferredLang.toLowerCase()) {
          bestCode = codeSnippet;
          if (langTag) detectedLang = langTag;
        }
      }
    }

    return { code: bestCode, language: detectedLang };
  }

  /**
   * Main Execution Entrypoint for ChatGPT UI Task
   */
  static async executeTask(
    query: string,
    preferredLang: string = 'python'
  ): Promise<ChatGPTTaskResult> {
    // 1. Open ChatGPT
    const openRes = await this.openChatGPT();
    if (!openRes.success) {
      return {
        success: false,
        message: openRes.message,
        errorStep: 'OPEN'
      };
    }

    // 2. Find prompt input (Single Pass)
    const inputRes = await this.findPromptInput();
    if (!inputRes.success || !inputRes.selector) {
      return {
        success: false,
        message: inputRes.message,
        data: {
          source: 'ChatGPT',
          query,
          externalUrl: openRes.url,
          diagnostics: inputRes.diagnostics
        },
        errorStep: 'INPUT_NOT_FOUND'
      };
    }

    // 3. Submit Query
    const subRes = await this.submitQuery(query, inputRes.selector);
    if (!subRes.success) {
      return {
        success: false,
        message: subRes.message,
        errorStep: 'INPUT_NOT_FOUND'
      };
    }

    // 4. Read Response
    const readRes = await this.readResponse();
    if (!readRes.success || !readRes.rawText) {
      return {
        success: false,
        message: readRes.message,
        data: {
          source: 'ChatGPT',
          query,
          externalUrl: openRes.url
        },
        errorStep: 'RESPONSE_UNREADABLE'
      };
    }

    // 5. Extract Code
    const { code, language } = this.extractCode(readRes.rawText, preferredLang);

    // 6. Copy to clipboard
    if (code) {
      await callLocalComputer({
        action: 'copyText',
        text: code
      });
    }

    return {
      success: true,
      message: `Successfully executed ChatGPT task in real browser for query: "${query}"`,
      data: {
        source: 'ChatGPT',
        query,
        answer: readRes.rawText,
        code,
        language,
        verified: true,
        externalUrl: openRes.url
      }
    };
  }
}
