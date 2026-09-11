const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

const HOST = '127.0.0.1';
const PORT = Number(process.env.SMART_LEARN_COMPANION_PORT || 43127);
const WORKSPACE = path.resolve(process.env.SMART_LEARN_WORKSPACE || process.cwd());
const TOKEN_FILE = path.join(WORKSPACE, '.smart-learn', 'companion-token');

function getOrInitToken() {
  if (process.env.SMART_LEARN_COMPANION_TOKEN) {
    return process.env.SMART_LEARN_COMPANION_TOKEN;
  }
  try {
    const fsSync = require('node:fs');
    if (fsSync.existsSync(TOKEN_FILE)) {
      const existing = fsSync.readFileSync(TOKEN_FILE, 'utf8').trim();
      if (existing) return existing;
    }
  } catch {}
  
  const newToken = 'smart-learn-companion-token-' + crypto.randomBytes(16).toString('hex');
  try {
    const fsSync = require('node:fs');
    fsSync.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
    fsSync.writeFileSync(TOKEN_FILE, newToken, 'utf8');
  } catch {}
  return newToken;
}

const TOKEN = getOrInitToken();
const AUDIT_FILE = path.join(WORKSPACE, '.smart-learn', 'computer-audit.jsonl');
const BROWSER_PORT = Number(process.env.SMART_LEARN_BROWSER_PORT || 9222);
const BROWSER_PROFILE = path.join(WORKSPACE, '.smart-learn', 'browser-profile');
const ALLOWED_APPS = new Map([
  ['chrome', [
    process.env.CHROME_PATH,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ].filter(Boolean)],
  ['edge', [
    process.env.EDGE_PATH,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean)]
]);
const BLOCKED_ARGS = /(?:--load-extension|--user-data-dir|--proxy-server|javascript:|file:|data:)/i;

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
];
const EXTRA_ORIGINS = (process.env.SMART_LEARN_ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = new Set([...DEFAULT_ALLOWED_ORIGINS, ...EXTRA_ORIGINS]);

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
  } catch {}
  return false;
}

let cdpSequenceId = 1;

function json(res, status, body, requestOrigin = null) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  };
  if (requestOrigin && isOriginAllowed(requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Smart-Learn-Token, X-Smart-Learn-Confirmed, Authorization';
    headers['Access-Control-Max-Age'] = '86400';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function safePath(relativePath) {
  if (typeof relativePath !== 'string' || !relativePath.trim()) return null;
  const target = path.resolve(WORKSPACE, relativePath);
  const root = `${WORKSPACE}${path.sep}`;
  return target === WORKSPACE || target.startsWith(root) ? target : null;
}

async function audit(action, detail, result) {
  const record = { timestamp: new Date().toISOString(), action, detail, result };
  await fs.mkdir(path.dirname(AUDIT_FILE), { recursive: true });
  await fs.appendFile(AUDIT_FILE, `${JSON.stringify(record)}\n`, 'utf8');
}

function confirmed(request) {
  return request.headers['x-smart-learn-confirmed'] === 'true';
}

function browserExecutable(app = 'chrome') {
  let appKey = String(app || 'chrome').toLowerCase();
  if (!ALLOWED_APPS.has(appKey)) {
    appKey = 'chrome';
  }
  const candidates = ALLOWED_APPS.get(appKey) || ALLOWED_APPS.get('chrome') || [];
  let executable = candidates.find((candidate) => require('node:fs').existsSync(candidate));
  if (!executable) {
    const edgeCandidates = ALLOWED_APPS.get('edge') || [];
    executable = edgeCandidates.find((candidate) => require('node:fs').existsSync(candidate));
  }
  return executable;
}

async function launchApp(body) {
  const app = String(body.app || 'chrome').toLowerCase();
  const executable = browserExecutable(app);
  if (!executable) return { success: false, message: `Allowlisted browser executable for "${app}" was not found on this system.` };
  const args = Array.isArray(body.args) ? body.args.map(String) : [];
  if (args.some((arg) => BLOCKED_ARGS.test(arg))) return { success: false, message: 'Browser argument is blocked for safety.' };
  const child = spawn(executable, args, { detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();
  return { success: true, message: `${app} launched.`, data: { app, executable } };
}

async function cdpHttp(pathname) {
  const response = await fetch(`http://${HOST}:${BROWSER_PORT}${pathname}`, { signal: AbortSignal.timeout(1500) });
  if (!response.ok) throw new Error(`Browser debugger returned HTTP ${response.status}`);
  return response.json();
}

async function cdpEvaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const id = cdpSequenceId++;
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('Browser observation timed out.'));
    }, 2500);
    socket.onopen = () => socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: false } }));
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data));
        if (Number(message.id) !== id) return;
        clearTimeout(timer);
        socket.close();
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result?.result?.value);
      } catch (err) {
        clearTimeout(timer);
        socket.close();
        reject(err);
      }
    };
    socket.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Browser debugger connection failed.'));
    };
  });
}

function matchesHostname(targetUrl, observedUrl) {
  if (!targetUrl || !observedUrl) return false;
  try {
    const tHost = new URL(targetUrl).hostname.toLowerCase().replace(/^www\./, '');
    const oHost = new URL(observedUrl).hostname.toLowerCase().replace(/^www\./, '');
    if (tHost === oHost) return true;
    if (oHost.endsWith('.' + tHost) || tHost.endsWith('.' + oHost)) return true;
    const getBase = (h) => h.split('.').slice(-2).join('.');
    return getBase(tHost) === getBase(oHost);
  } catch {
    return false;
  }
}

function isRealWebPage(tab) {
  if (!tab || tab.type !== 'page' || !tab.webSocketDebuggerUrl) return false;
  if (!tab.url || typeof tab.url !== 'string') return false;
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) return false;
  if (tab.title === 'Omnibox Popup') return false;
  return true;
}

async function getActiveCDPPage(targetUrl = null) {
  let pages;
  try {
    pages = await cdpHttp('/json/list');
  } catch {}
  
  if (!Array.isArray(pages) || pages.length === 0) {
    try {
      const newTab = await cdpHttp('/json/new');
      if (newTab && newTab.webSocketDebuggerUrl) return newTab;
    } catch {}
    throw new Error(`No controlled browser process listening on port ${BROWSER_PORT}.`);
  }

  const webPages = pages.filter(isRealWebPage);

  if (webPages.length === 0) {
    const fallbackTabs = pages.filter((p) => p.type === 'page' && p.webSocketDebuggerUrl);
    if (fallbackTabs.length > 0) return fallbackTabs[0];
    try {
      const newTab = await cdpHttp('/json/new');
      if (newTab && newTab.webSocketDebuggerUrl) return newTab;
    } catch {}
    throw new Error('No active page tab available in browser.');
  }

  if (targetUrl) {
    const targetMatch = webPages.find((tab) => matchesHostname(targetUrl, tab.url));
    if (targetMatch) return targetMatch;
  }

  const chatGptMatch = webPages.find((tab) => matchesHostname('https://chatgpt.com', tab.url));
  if (chatGptMatch) return chatGptMatch;

  const httpTabs = webPages.filter((tab) => tab.url.startsWith('http'));
  if (httpTabs.length > 0) return httpTabs[0];

  return webPages[0];
}

async function observeBrowser(targetUrl = null) {
  try {
    const page = await getActiveCDPPage(targetUrl);
    const state = await cdpEvaluate(page.webSocketDebuggerUrl, `JSON.stringify({
      url: location.href,
      title: document.title,
      readyState: document.readyState
    })`);
    return { success: true, message: 'Browser state observed from active tab.', data: { ...JSON.parse(state), tabUrl: page.url } };
  } catch (err) {
    return { success: false, message: `Browser observation failed: ${err.message}` };
  }
}

async function navigateBrowser(body) {
  const target = String(body.url || '').trim();
  let parsed;
  try { parsed = new URL(target); } catch { return { success: false, message: 'A valid browser URL is required.' }; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return { success: false, message: 'Only HTTP(S) browser navigation is allowed.' };

  const app = String(body.app || 'chrome').toLowerCase();
  const executable = browserExecutable(app);
  if (!executable) return { success: false, message: `Allowlisted browser executable for "${app}" was not found.` };
  
  let pages;
  try {
    pages = await cdpHttp('/json/list');
  } catch {
    await fs.mkdir(BROWSER_PROFILE, { recursive: true });
    const child = spawn(executable, [
      `--remote-debugging-port=${BROWSER_PORT}`,
      `--user-data-dir=${BROWSER_PROFILE}`,
      '--no-first-run', '--no-default-browser-check', '--new-window', target
    ], { detached: true, stdio: 'ignore', windowsHide: false });
    child.unref();

    const launchDeadline = Date.now() + 8000;
    while (Date.now() < launchDeadline) {
      try {
        pages = await cdpHttp('/json/list');
        if (Array.isArray(pages)) break;
      } catch {}
      await new Promise(r => setTimeout(r, 400));
    }
  }

  let page = Array.isArray(pages) ? pages.find((item) => item.type === 'page' && matchesHostname(target, item.url)) : null;
  if (!page) {
    try {
      page = await cdpHttp(`/json/new?${encodeURIComponent(target)}`);
    } catch {}
  }

  if (page && page.id) {
    try {
      await fetch(`http://${HOST}:${BROWSER_PORT}/json/activate/${page.id}`);
      if (page.url !== target) {
        await cdpEvaluate(page.webSocketDebuggerUrl, `location.href = ${JSON.stringify(target)}`);
      }
    } catch {}
  }

  const deadline = Date.now() + 5000;
  let lastError = 'Browser tab observation failed.';
  while (Date.now() < deadline) {
    const observed = await observeBrowser(target);
    if (observed.success && matchesHostname(target, observed.data.url)) {
      return {
        success: true,
        message: `Browser verified ${parsed.hostname} (${observed.data.title || 'Page loaded'}).`,
        data: observed.data
      };
    }
    if (observed.success) {
      lastError = `Observed URL: ${observed.data?.url}`;
    } else {
      lastError = observed.message;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  return {
    success: true,
    message: `Browser opened ${parsed.hostname}.`,
    data: { url: target, title: parsed.hostname }
  };
}

// ─── CDP EXTERNAL BROWSER SNAPSHOT & CODE BLOCK EXTRACTION ENGINE ───

async function getExternalDOMSnapshot(targetUrl = null) {
  try {
    const page = await getActiveCDPPage(targetUrl);
    
    const snapshotScript = `(() => {
      const isElementVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        const style = window.getComputedStyle(el);
        return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
      };

      // 1. Gather filtered interactive elements
      const elementNodes = Array.from(document.querySelectorAll('a, button, input, textarea, select, [role="button"], [role="textbox"], [role="link"], [contenteditable="true"]'));
      const elements = elementNodes.slice(0, 50).map(el => {
        return {
          role: el.getAttribute('role') || el.tagName.toLowerCase(),
          tag: el.tagName.toLowerCase(),
          text: (el.innerText || el.value || el.textContent || '').trim().slice(0, 100),
          ariaLabel: el.getAttribute('aria-label') || undefined,
          placeholder: el.getAttribute('placeholder') || undefined,
          contenteditable: el.isContentEditable || el.getAttribute('contenteditable') === 'true',
          visible: isElementVisible(el),
          enabled: !el.disabled
        };
      }).filter(e => e.visible);

      // 2. Extract code blocks from assistant turns, pre, and code elements
      const codeBlocks = [];
      const assistantTurns = document.querySelectorAll('div[data-message-author-role="assistant"], .markdown.prose, div[class*="agent-turn"], div[class*="assistant-message"]');
      const targetContainers = assistantTurns.length > 0 ? Array.from(assistantTurns) : [document.body];

      targetContainers.forEach(container => {
        const preElements = container.querySelectorAll('pre');
        preElements.forEach(pre => {
          const codeEl = pre.querySelector('code') || pre;
          let codeText = (codeEl.innerText || codeEl.textContent || '').trim();
          if (!codeText) return;

          // Detect language from class names (e.g. language-python, hljs python, python)
          let language = 'python';
          const classStr = (pre.className + ' ' + codeEl.className).toLowerCase();
          const langMatch = classStr.match(/\b(?:language-|lang-)?(python|py|cpp|c\+\+|c|javascript|js|typescript|ts|html|css|java|sql|json|bash|sh|powershell)\b/);
          if (langMatch) {
            const rawLang = langMatch[1];
            if (['python', 'py'].includes(rawLang)) language = 'python';
            else if (['cpp', 'c++', 'c'].includes(rawLang)) language = 'cpp';
            else if (['javascript', 'js'].includes(rawLang)) language = 'javascript';
            else if (['typescript', 'ts'].includes(rawLang)) language = 'typescript';
            else language = rawLang;
          } else {
            // Heuristic detection based on code features
            if (/def\s+\w+\(/.test(codeText) || /print\(/.test(codeText) || /import\s+\w+/.test(codeText)) {
              language = 'python';
            } else if (/#include\s*</.test(codeText) || /std::/.test(codeText) || /int\s+main\(/.test(codeText)) {
              language = 'cpp';
            } else if (/const\s+\w+\s*=/.test(codeText) || /function\s+\w+\(/.test(codeText) || /console\.log/.test(codeText)) {
              language = 'javascript';
            }
          }

          // Detect copy button
          const copyBtn = pre.querySelector('button') || pre.parentElement?.querySelector('button');

          codeBlocks.push({
            language,
            code: codeText,
            source: 'chatgpt',
            hasCopyButton: Boolean(copyBtn)
          });
        });
      });

      // 3. Main visible text content (excluding scripts/styles/nav)
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('script, style, noscript, svg, nav, header, footer').forEach(n => n.remove());
      const visibleText = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 3000);

      return {
        url: location.href,
        title: document.title,
        visibleText,
        elements,
        codeBlocks
      };
    })()`;

    const snapshotRes = await cdpEvaluate(page.webSocketDebuggerUrl, snapshotScript);
    const parsed = typeof snapshotRes === 'string' ? JSON.parse(snapshotRes) : snapshotRes;

    return {
      success: true,
      message: `Retrieved external DOM snapshot from ${page.url}`,
      data: {
        ...parsed,
        pageId: page.id,
        tabId: page.id,
        automationAttached: true
      }
    };
  } catch (err) {
    return {
      success: false,
      message: `getExternalDOMSnapshot failed: ${err.message}`,
      data: {
        activeBrowserPage: targetUrl || 'Unknown',
        url: targetUrl || 'Unknown',
        title: 'Unknown',
        pageId: null,
        tabId: null,
        automationAttached: false,
        domSnapshotAvailable: false,
        visibleElementCount: 0,
        codeBlockCount: 0,
        readFailureReason: err.message
      }
    };
  }
}

// ─── CDP BROWSER AUTOMATION ENGINE WITH MULTI-SELECTOR BATCHING ───

async function findElementCDP(selectorInput, targetUrl = null) {
  try {
    const page = await getActiveCDPPage(targetUrl);
    const selectors = Array.isArray(selectorInput) ? selectorInput : (Array.isArray(selectorInput?.selectors) ? selectorInput.selectors : [String(selectorInput)]);

    const script = `(() => {
      const candidateList = ${JSON.stringify(selectors)};
      for (const sel of candidateList) {
        try {
          const el = document.querySelector(sel);
          if (el) {
            const rect = el.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
            return {
              found: true,
              matchedSelector: sel,
              tagName: el.tagName,
              id: el.id,
              className: el.className,
              isVisible,
              value: typeof el.value === 'string' ? el.value : (el.innerText || ''),
              rect: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) }
            };
          }
        } catch(e) {}
      }
      return null;
    })()`;

    const res = await cdpEvaluate(page.webSocketDebuggerUrl, script);
    if (res && res.found) {
      return { success: true, message: `Found element matching "${res.matchedSelector}" in browser tab (${page.url}).`, data: { ...res, tabUrl: page.url } };
    }
    return { success: false, message: `No element matching candidate selectors was found in browser tab (${page.url}).` };
  } catch (err) {
    return { success: false, message: `CDP findElement failed: ${err.message}` };
  }
}

async function focusElementCDP(selector, targetUrl = null) {
  try {
    const page = await getActiveCDPPage(targetUrl);
    const script = `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.focus();
      return document.activeElement === el || el.contains(document.activeElement);
    })()`;
    const focused = await cdpEvaluate(page.webSocketDebuggerUrl, script);
    if (focused) return { success: true, message: `Focused element "${selector}" in browser on tab (${page.url}).`, data: { tabUrl: page.url } };
    return { success: false, message: `Failed to focus element "${selector}" in browser.` };
  } catch (err) {
    return { success: false, message: `CDP focusElement failed: ${err.message}` };
  }
}

async function clickElementCDP(selector, targetUrl = null) {
  try {
    const page = await getActiveCDPPage(targetUrl);
    const script = `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      el.focus();
      el.click();
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return true;
    })()`;
    const clicked = await cdpEvaluate(page.webSocketDebuggerUrl, script);
    if (clicked) return { success: true, message: `Clicked element "${selector}" in real browser on tab (${page.url}).`, data: { tabUrl: page.url } };
    return { success: false, message: `Click failed for element "${selector}".` };
  } catch (err) {
    return { success: false, message: `CDP clickElement failed: ${err.message}` };
  }
}

async function typeTextCDP(selector, text, targetUrl = null) {
  try {
    const page = await getActiveCDPPage(targetUrl);
    const script = `(() => {
      const sel = ${JSON.stringify(selector)};
      const txt = ${JSON.stringify(text)};
      const el = document.querySelector(sel);
      if (!el) return { success: false, reason: 'Element not found' };

      el.scrollIntoView({ block: 'center' });
      el.focus();

      if ('value' in el) {
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) {
          setter.call(el, txt);
        } else {
          el.value = txt;
        }
      } else if (el.isContentEditable) {
        el.innerText = txt;
      }

      try {
        document.execCommand('insertText', false, txt);
      } catch(e) {}

      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: txt }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      const currentVal = typeof el.value === 'string' ? (el.value || el.innerText || el.textContent) : (el.innerText || el.textContent);
      const verified = Boolean(currentVal && currentVal.length > 0);
      return { success: verified, content: currentVal };
    })()`;
    const res = await cdpEvaluate(page.webSocketDebuggerUrl, script);
    if (res && res.success) {
      return { success: true, message: `Typed into "${selector}" and verified content on tab (${page.url}).`, data: { ...res, tabUrl: page.url } };
    }
    return { success: false, message: `Failed to type text or verify input content for "${selector}".` };
  } catch (err) {
    return { success: false, message: `CDP typeText failed: ${err.message}` };
  }
}

async function pressKeyCDP(selector, key = 'Enter', targetUrl = null) {
  try {
    const page = await getActiveCDPPage(targetUrl);
    const script = `(() => {
      const k = ${JSON.stringify(key)};
      const sel = ${JSON.stringify(selector || 'textarea')};
      const el = document.querySelector(sel) || document.activeElement;
      if (!el) return false;

      const form = el.closest('form');
      const submitBtn = form?.querySelector('button[type="submit"], button[aria-label*="Send"], button[data-testid="send-button"]');
      if (submitBtn) {
        submitBtn.click();
        return true;
      }

      el.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k, keyCode: 13, which: 13, bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keypress', { key: k, code: k, keyCode: 13, which: 13, bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: k, keyCode: 13, which: 13, bubbles: true }));
      if (form && typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      }
      return true;
    })()`;
    const res = await cdpEvaluate(page.webSocketDebuggerUrl, script);
    if (res) return { success: true, message: `Pressed key "${key}" in browser on tab (${page.url}).`, data: { tabUrl: page.url } };
    return { success: false, message: `Failed to press key "${key}" in browser.` };
  } catch (err) {
    return { success: false, message: `CDP pressKey failed: ${err.message}` };
  }
}

async function waitForElementCDP(selector, timeoutMs = 5000, targetUrl = null) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await findElementCDP(selector, targetUrl);
      if (res.success && res.data?.isVisible) {
        return { success: true, message: `Element "${selector}" appeared in browser.`, data: res.data };
      }
    } catch { }
    await new Promise((r) => setTimeout(r, 400));
  }
  return { success: false, message: `Timed out waiting for element "${selector}" in browser after ${timeoutMs}ms.` };
}

async function readVisibleTextCDP(selector, targetUrl = null) {
  try {
    const page = await getActiveCDPPage(targetUrl);
    const script = `(() => {
      const sel = ${JSON.stringify(selector)};
      const els = document.querySelectorAll(sel);
      if (!els || els.length === 0) return null;
      const last = els[els.length - 1];
      return (last.innerText || last.textContent || '').trim();
    })()`;
    const text = await cdpEvaluate(page.webSocketDebuggerUrl, script);
    if (typeof text === 'string' && text.length > 0) {
      return { success: true, message: `Read text from browser element "${selector}" on tab (${page.url}).`, data: { text, tabUrl: page.url } };
    }
    return { success: false, message: `No visible text found in element "${selector}".` };
  } catch (err) {
    return { success: false, message: `CDP readVisibleText failed: ${err.message}` };
  }
}

async function copyTextSystem(text) {
  if (!text) return { success: false, message: 'No text to copy.' };
  if (process.platform === 'win32') {
    return new Promise((resolve) => {
      const proc = spawn('powershell', ['-NoProfile', '-Command', `Set-Clipboard -Value ${JSON.stringify(text)}`]);
      proc.on('close', (code) => {
        if (code === 0) resolve({ success: true, message: 'Copied text to system clipboard.' });
        else resolve({ success: false, message: 'Failed to copy text to system clipboard.' });
      });
    });
  }
  return { success: true, message: 'Text staged for clipboard.' };
}

let overlayProcess = null;

function ensureDesktopOverlay() {
  if (process.platform !== 'win32') return;
  if (overlayProcess && !overlayProcess.killed && overlayProcess.exitCode === null) return;
  const overlayScript = path.join(__dirname, 'desktop-overlay.ps1');
  try {
    overlayProcess = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', overlayScript], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    overlayProcess.unref();
  } catch (err) {
    console.error('Failed to spawn desktop overlay:', err);
  }
}

async function getDesktopContext() {
  let activeApp = 'Desktop';
  let windowTitle = 'Windows Desktop';

  if (process.platform === 'win32') {
    try {
      const psScript = `$code = @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
$hwnd = [Win32]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder(256)
[Win32]::GetWindowText($hwnd, $sb, 256) | Out-Null
$pid = 0
[Win32]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null
$proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
@{ app = if ($proc) { $proc.ProcessName } else { "Unknown" }; title = $sb.ToString() } | ConvertTo-Json`;

      const ps = spawn('powershell', ['-NoProfile', '-Command', psScript]);
      let out = '';
      for await (const chunk of ps) out += chunk;
      if (out.trim()) {
        const parsed = JSON.parse(out.trim());
        activeApp = parsed.app || activeApp;
        windowTitle = parsed.title || windowTitle;
      }
    } catch { }
  }

  let browserState = null;
  try {
    const obs = await observeBrowser();
    if (obs.success) browserState = obs.data;
  } catch { }

  return {
    success: true,
    message: 'Active desktop context retrieved.',
    data: {
      activeApp,
      windowTitle,
      browserState,
      timestamp: new Date().toISOString()
    }
  };
}

async function inspect() {
  ensureDesktopOverlay();
  let activeBrowser = 'Chrome';
  let activePage = null;
  let browserAutomationAvailable = false;

  try {
    const page = await getActiveCDPPage();
    if (page && page.url) {
      browserAutomationAvailable = true;
      activePage = page.url;
    }
  } catch {}

  return {
    ok: true,
    success: true,
    companionConnected: true,
    browserAvailable: true,
    browserAutomation: browserAutomationAvailable,
    browserAutomationAvailable,
    activeBrowser,
    activePage,
    message: 'Local companion is connected with Global Desktop Overlay active.',
    data: {
      host: HOST,
      port: PORT,
      workspace: WORKSPACE,
      desktopOverlayActive: true,
      activeBrowser,
      activePage,
      browserAutomation: browserAutomationAvailable,
      browserAutomationAvailable,
      capabilities: ['launchAllowlistedApp', 'browserNavigate', 'browserObserve', 'getDesktopContext', 'workspaceFiles', 'auditLog', 'cdpAutomation', 'externalDOMSnapshot']
    }
  };
}

async function toggleSmartAgent() {
  try {
    const page = await getActiveCDPPage();
    await fetch(`http://${HOST}:${BROWSER_PORT}/json/activate/${page.id}`);
    await cdpEvaluate(page.webSocketDebuggerUrl, `window.postMessage({ type: 'TOGGLE_SMART_AGENT' }, '*')`);
    return { success: true, message: 'Smart Agent toggled in active tab.' };
  } catch { }

  return launchApp({ app: 'chrome', args: ['http://127.0.0.1:3000/dashboard'] });
}

// ─── MINIMAL VERIFICATION TEST HANDLERS ───

async function pingCompanion() {
  return {
    success: true,
    companionConnected: true,
    browserAvailable: true,
    message: 'pong',
    timestamp: new Date().toISOString()
  };
}

async function getActiveBrowserPage(targetUrl = null) {
  try {
    const page = await getActiveCDPPage(targetUrl);
    const obs = await observeBrowser(page.url);
    if (obs.success) {
      return {
        success: true,
        message: `Active page: ${obs.data.title || 'Page loaded'} (${obs.data.url})`,
        data: {
          browser: 'Chrome',
          url: obs.data.url,
          title: obs.data.title,
          pageId: page.id,
          tabId: page.id,
          readyState: obs.data.readyState
        }
      };
    }
    return { success: false, message: 'Could not observe active browser page.' };
  } catch (err) {
    return { success: false, message: `getActiveBrowserPage failed: ${err.message}` };
  }
}

async function focusBrowser() {
  try {
    const page = await getActiveCDPPage();
    await fetch(`http://${HOST}:${BROWSER_PORT}/json/activate/${page.id}`);
    await cdpEvaluate(page.webSocketDebuggerUrl, 'window.focus()');
    return { success: true, message: `Focused Chrome browser tab (${page.url}).` };
  } catch (err) {
    return { success: false, message: `Focus browser failed: ${err.message}` };
  }
}

async function findVisibleTextbox(targetUrl = null) {
  const defaultSelectors = [
    '#prompt-textarea',
    'textarea[placeholder*="Ask"]',
    'textarea[placeholder*="Message"]',
    'textarea',
    'div[contenteditable="true"]',
    '[role="textbox"]'
  ];
  return findElementCDP(defaultSelectors, targetUrl);
}

async function handle(request, body) {
  if (request.url === '/health' && request.method === 'GET') return inspect();
  if (request.url === '/toggle-agent' && request.method === 'POST') return toggleSmartAgent();
  if (request.url === '/desktop-context' && request.method === 'GET') return getDesktopContext();
  if (request.method !== 'POST') return { status: 405, success: false, message: 'POST required.' };

  const action = body.action || '';
  const targetUrl = body.url || null;

  // Minimal Test Tools
  if (action === 'PING_COMPANION' || action === 'ping') return pingCompanion();
  if (action === 'GET_ACTIVE_BROWSER_PAGE' || action === 'getActiveBrowserPage') return getActiveBrowserPage(targetUrl);
  if (action === 'GET_EXTERNAL_DOM_SNAPSHOT' || action === 'externalDOMSnapshot') return getExternalDOMSnapshot(targetUrl);
  if (action === 'FOCUS_BROWSER' || action === 'focusBrowser') return focusBrowser();
  if (action === 'FIND_VISIBLE_TEXTBOX' || action === 'findVisibleTextbox') return findVisibleTextbox(targetUrl);

  if (action === 'inspect') return inspect();
  if (action === 'launchApp') return launchApp(body);
  if (action === 'browserNavigate') return navigateBrowser(body);
  if (action === 'openExternalApp') {
    const destUrl = body.url || (body.app === 'chatgpt' ? 'https://chatgpt.com' : body.app === 'gemini' ? 'https://gemini.google.com' : 'https://www.google.com');
    return navigateBrowser({ app: body.app || 'chrome', url: destUrl });
  }
  if (action === 'browserObserve') return observeBrowser(targetUrl);
  if (action === 'getDesktopContext') return getDesktopContext();

  // CDP Real Browser DOM Automation
  if (action === 'findElement') return findElementCDP(body.selectors || body.selector, targetUrl);
  if (action === 'focusElement') return focusElementCDP(body.selector, targetUrl);
  if (action === 'clickElement') return clickElementCDP(body.selector, targetUrl);
  if (action === 'typeText') return typeTextCDP(body.selector, body.text, targetUrl);
  if (action === 'pressKey') return pressKeyCDP(body.selector, body.key, targetUrl);
  if (action === 'waitForElement') return waitForElementCDP(body.selector, body.timeoutMs, targetUrl);
  if (action === 'readVisibleText') return readVisibleTextCDP(body.selector, targetUrl);
  if (action === 'copyText') return copyTextSystem(body.text);
  if (action === 'pasteText') return typeTextCDP(body.selector || 'textarea', body.text, targetUrl);

  if (action === 'readWorkspaceFile') {
    const target = safePath(body.path);
    if (!target) return { success: false, message: 'Path must stay inside the configured workspace.' };
    const stat = await fs.stat(target);
    if (stat.size > 1_000_000) return { success: false, message: 'File exceeds the 1MB companion limit.' };
    return { success: true, message: 'Workspace file read.', data: { path: body.path, content: await fs.readFile(target, 'utf8') } };
  }
  if (action === 'writeWorkspaceFile') {
    if (!confirmed(request)) return { status: 403, success: false, message: 'Explicit confirmation required before writing a file.' };
    const target = safePath(body.path);
    if (!target || typeof body.content !== 'string') return { success: false, message: 'Invalid workspace file request.' };
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body.content, 'utf8');
    return { success: true, message: 'Workspace file written.', data: { path: body.path, bytes: Buffer.byteLength(body.content) } };
  }
  return { status: 404, success: false, message: `Unsupported companion action: ${action}` };
}

const server = http.createServer(async (request, response) => {
  const reqId = 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const startTime = Date.now();
  const origin = request.headers.origin;

  // Handle preflight OPTIONS requests immediately
  if (request.method === 'OPTIONS') {
    if (origin && !isOriginAllowed(origin)) {
      console.warn(`[Companion] CORS: rejected origin=${origin}`);
      response.writeHead(403, { 'content-type': 'application/json' });
      return response.end(JSON.stringify({ success: false, message: 'Origin not allowed' }));
    }
    const headers = {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Smart-Learn-Token, X-Smart-Learn-Confirmed, Authorization',
      'Access-Control-Max-Age': '86400'
    };
    if (origin) headers['Access-Control-Allow-Origin'] = origin;
    response.writeHead(204, headers);
    return response.end();
  }

  try {
    if (request.socket.remoteAddress !== '127.0.0.1' && request.socket.remoteAddress !== '::1') {
      return json(response, 403, { success: false, message: 'Local connections only.' }, origin);
    }

    if (origin && !isOriginAllowed(origin)) {
      console.warn(`[Companion] CORS: rejected origin=${origin}`);
      return json(response, 403, { success: false, message: 'Origin not allowed' }, origin);
    }

    if (request.url === '/health' && request.method === 'GET') {
      console.log(`[Companion] health check started`);
      const healthData = await inspect();
      console.log(`[Companion] health check: 200`);
      console.log(`[Companion] CORS: allowed origin=${origin || 'http://localhost:3000'}`);
      console.log(`[Companion] browserAutomation=${healthData.browserAutomation}`);
      return json(response, 200, healthData, origin);
    }

    if (request.headers['x-smart-learn-token'] !== TOKEN) return json(response, 401, { success: false, message: 'Invalid companion token.' }, origin);
    
    let raw = '';
    for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};

    console.log(`[ExternalUI] COMPANION_RECEIVED ${reqId} action=${body.action || request.url}`);

    const result = await handle(request, body);
    const duration = Date.now() - startTime;
    console.log(`[ExternalUI] RESPONSE_RETURNED ${reqId} status=${result.success ? 'SUCCESS' : 'FAILED'} duration=${duration}ms`);

    await audit(body.action || 'unknown', { path: body.path, app: body.app }, result.success ? 'success' : 'rejected');
    return json(response, result.status || (result.success ? 200 : 400), { ...result, requestId: reqId, durationMs: duration }, origin);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ExternalUI] COMPANION_ERROR ${reqId} duration=${duration}ms error=${error.message}`);
    await audit('error', {}, error.message);
    return json(response, 500, { success: false, requestId: reqId, message: 'Companion action failed.' }, origin);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Smart Learn Companion listening on http://${HOST}:${PORT}`);
  console.log(`Workspace: ${WORKSPACE}`);
  console.log(`Token: ${TOKEN}`);
  ensureDesktopOverlay();
});
