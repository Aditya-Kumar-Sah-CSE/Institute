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
      activeBrowserPage?: string;
      url?: string;
      title?: string;
      pageId?: string | null;
      companionAvailable: boolean;
      automationAttached: boolean;
      domSnapshotAvailable: boolean;
      visibleElementCount: number;
      codeBlockCount: number;
      readFailureReason?: string;
      diagnosticReason?: string;
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
    diagnostics: any;
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
          automationAttached: true,
          domSnapshotAvailable: true,
          visibleElementCount: 1,
          codeBlockCount: 0,
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
        automationAttached: false,
        domSnapshotAvailable: false,
        visibleElementCount: 0,
        codeBlockCount: 0,
        readFailureReason: diagReason
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
   * Step 4: Wait for assistant response text/code to stabilize via bounded DOM polling
   */
  static async readResponse(preferredLang: string = 'python'): Promise<{
    success: boolean;
    rawText?: string;
    code?: string;
    language?: string;
    message: string;
    diagnostics: any;
  }> {
    // 1. Verify active browser tab is attached to chatgpt.com
    const activePageRes = await callLocalComputer({
      action: 'getActiveBrowserPage',
      url: this.CHATGPT_URL
    });

    if (!activePageRes.success) {
      const failureReason = activePageRes.message || `Expected ChatGPT page, but active browser page is unknown`;
      console.error('[ChatGPTAdapter] ACTIVE_PAGE_MISMATCH:', activePageRes);
      return {
        success: false,
        message: failureReason,
        diagnostics: {
          target: 'ChatGPT',
          activeBrowserPage: (activePageRes.data as any)?.activeBrowserPage || 'unknown',
          url: (activePageRes.data as any)?.activeBrowserPage || 'unknown',
          title: (activePageRes.data as any)?.title || 'Unknown',
          pageId: (activePageRes.data as any)?.pageId || null,
          companionAvailable: true,
          automationAttached: false,
          domSnapshotAvailable: false,
          visibleElementCount: 0,
          assistantCandidateCount: 0,
          codeBlockCount: 0,
          responseLength: 0,
          readFailureReason: failureReason
        }
      };
    }

    const pollStartTime = Date.now();
    const MAX_POLL_MS = 15000;
    const INTERVAL_MS = 500;

    let previousLength = 0;
    let stableCount = 0;
    let lastSnapshot: any = null;

    while (Date.now() - pollStartTime < MAX_POLL_MS) {
      const snapRes = await callLocalComputer({
        action: 'GET_EXTERNAL_DOM_SNAPSHOT',
        url: this.CHATGPT_URL
      });

      if (snapRes.success && snapRes.data) {
        lastSnapshot = snapRes.data;
        const currentText = (lastSnapshot.visibleText || '').trim();
        const codeBlocks = lastSnapshot.codeBlocks || [];

        if (currentText.length > 20 || codeBlocks.length > 0) {
          if (currentText.length === previousLength && currentText.length > 0) {
            stableCount++;
          } else {
            stableCount = 0;
            previousLength = currentText.length;
          }

          // If text length remains identical over 2 consecutive intervals (1s) or code block detected
          if (stableCount >= 2 || (codeBlocks.length > 0 && stableCount >= 1)) {
            const extracted = this.extractCodeFromSnapshot(lastSnapshot, preferredLang);

            return {
              success: true,
              rawText: currentText,
              code: extracted.code,
              language: extracted.language,
              message: `Successfully read ChatGPT response from real browser tab (${lastSnapshot.url || this.CHATGPT_URL}).`,
              diagnostics: {
                target: 'ChatGPT',
                activeBrowserPage: lastSnapshot.url,
                url: lastSnapshot.url,
                title: lastSnapshot.title,
                pageId: lastSnapshot.pageId,
                companionAvailable: true,
                automationAttached: true,
                domSnapshotAvailable: true,
                visibleElementCount: (lastSnapshot.elements || []).length,
                assistantCandidateCount: codeBlocks.length > 0 ? codeBlocks.length : 1,
                codeBlockCount: codeBlocks.length,
                responseLength: currentText.length
              }
            };
          }
        }
      }

      await new Promise((r) => setTimeout(r, INTERVAL_MS));
    }

    // Bounded deadline fallback if snapshot obtained
    if (lastSnapshot && (lastSnapshot.visibleText?.length > 10 || (lastSnapshot.codeBlocks || []).length > 0)) {
      const extracted = this.extractCodeFromSnapshot(lastSnapshot, preferredLang);
      return {
        success: true,
        rawText: lastSnapshot.visibleText,
        code: extracted.code,
        language: extracted.language,
        message: 'Read response from browser DOM (stabilization bounded timeout reached).',
        diagnostics: {
          target: 'ChatGPT',
          activeBrowserPage: lastSnapshot.url,
          url: lastSnapshot.url,
          title: lastSnapshot.title,
          pageId: lastSnapshot.pageId,
          companionAvailable: true,
          automationAttached: true,
          domSnapshotAvailable: true,
          visibleElementCount: (lastSnapshot.elements || []).length,
          assistantCandidateCount: (lastSnapshot.codeBlocks || []).length,
          codeBlockCount: (lastSnapshot.codeBlocks || []).length,
          responseLength: (lastSnapshot.visibleText || '').length
        }
      };
    }

    // Diagnostic failure logging
    const failureReason = 'ChatGPT opened and search was submitted, but response could not be read from real browser tab.';
    console.error('[ChatGPTAdapter] READ_FAILURE_DIAGNOSTIC:', {
      target: 'ChatGPT',
      activeBrowserPage: lastSnapshot?.url || (activePageRes.data as any)?.url || this.CHATGPT_URL,
      url: lastSnapshot?.url || (activePageRes.data as any)?.url || this.CHATGPT_URL,
      title: lastSnapshot?.title || 'Unknown',
      pageId: lastSnapshot?.pageId || null,
      automationAttached: Boolean(lastSnapshot),
      domSnapshotAvailable: Boolean(lastSnapshot),
      visibleElementCount: (lastSnapshot?.elements || []).length,
      assistantCandidateCount: (lastSnapshot?.codeBlocks || []).length,
      codeBlockCount: (lastSnapshot?.codeBlocks || []).length,
      responseLength: (lastSnapshot?.visibleText || '').length,
      readFailureReason: failureReason
    });

    return {
      success: false,
      message: `FAILED: ${failureReason}`,
      diagnostics: {
        target: 'ChatGPT',
        activeBrowserPage: lastSnapshot?.url || (activePageRes.data as any)?.url || this.CHATGPT_URL,
        url: lastSnapshot?.url || (activePageRes.data as any)?.url || this.CHATGPT_URL,
        title: lastSnapshot?.title || 'Unknown',
        pageId: lastSnapshot?.pageId || null,
        companionAvailable: true,
        automationAttached: Boolean(lastSnapshot),
        domSnapshotAvailable: Boolean(lastSnapshot),
        visibleElementCount: (lastSnapshot?.elements || []).length,
        assistantCandidateCount: (lastSnapshot?.codeBlocks || []).length,
        codeBlockCount: (lastSnapshot?.codeBlocks || []).length,
        responseLength: (lastSnapshot?.visibleText || '').length,
        readFailureReason: failureReason
      }
    };
  }

  /**
   * Step 5: Extract code from DOM snapshot, preferring requested language without mislabeling C/C++
   */
  private static extractCodeFromSnapshot(snapshot: any, preferredLang: string = 'python'): { code?: string; language: string } {
    const codeBlocks = Array.isArray(snapshot?.codeBlocks) ? snapshot.codeBlocks : [];
    const targetLang = preferredLang.toLowerCase().trim();

    if (codeBlocks.length > 0) {
      // Look for exact language match
      const exactMatch = codeBlocks.find((cb: any) => (cb.language || '').toLowerCase() === targetLang);
      if (exactMatch && exactMatch.code) {
        return { code: exactMatch.code, language: exactMatch.language };
      }

      // Check first code block language without mislabeling C/C++ as Python
      const first = codeBlocks[0];
      if (first && first.code) {
        const snippet = first.code;
        const isCpp = snippet.includes('#include') || snippet.includes('std::') || snippet.includes('int main(') || snippet.includes('printf(');
        const actualLang = isCpp ? 'cpp' : (first.language || targetLang);
        return { code: snippet, language: actualLang };
      }
    }

    // Fallback: Regex markdown code block parsing from raw text
    return this.extractCode(snapshot?.visibleText || '', preferredLang);
  }

  /**
   * Fallback markdown regex code extraction
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
        const isCpp = codeSnippet.includes('#include') || codeSnippet.includes('std::') || codeSnippet.includes('int main(');
        const actualLang = isCpp ? 'cpp' : (langTag || preferredLang);
        if (!bestCode || langTag === preferredLang.toLowerCase()) {
          bestCode = codeSnippet;
          detectedLang = actualLang;
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

    // 4. Read Response & Extract Code
    const readRes = await this.readResponse(preferredLang);
    if (!readRes.success || (!readRes.rawText && !readRes.code)) {
      return {
        success: false,
        message: readRes.message,
        data: {
          source: 'ChatGPT',
          query,
          externalUrl: openRes.url,
          diagnostics: readRes.diagnostics
        },
        errorStep: 'RESPONSE_UNREADABLE'
      };
    }

    const finalCode = readRes.code;
    const finalLang = readRes.language || preferredLang;

    // 5. Try Copy Button click or direct DOM extraction to clipboard
    if (finalCode) {
      // Click ChatGPT copy code button if present
      await callLocalComputer({
        action: 'clickElement',
        selector: 'button[aria-label*="Copy"]',
        url: this.CHATGPT_URL
      });

      // Direct copy fallback
      await callLocalComputer({
        action: 'copyText',
        text: finalCode
      });
    }

    return {
      success: true,
      message: `Successfully executed ChatGPT task in real browser for query: "${query}"`,
      data: {
        source: 'ChatGPT',
        query,
        answer: readRes.rawText,
        code: finalCode,
        language: finalLang,
        verified: true,
        externalUrl: openRes.url,
        diagnostics: readRes.diagnostics
      }
    };
  }
}
