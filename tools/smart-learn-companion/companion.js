const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

const HOST = '127.0.0.1';
const PORT = Number(process.env.SMART_LEARN_COMPANION_PORT || 43127);
const WORKSPACE = path.resolve(process.env.SMART_LEARN_WORKSPACE || process.cwd());
const TOKEN = process.env.SMART_LEARN_COMPANION_TOKEN || crypto.randomBytes(32).toString('hex');
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

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
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

async function launchApp(body) {
  const app = String(body.app || '').toLowerCase();
  const candidates = ALLOWED_APPS.get(app);
  if (!candidates) return { success: false, message: `Application "${app}" is not allowlisted.` };
  const executable = candidates.find((candidate) => require('node:fs').existsSync(candidate));
  if (!executable) return { success: false, message: `Allowlisted ${app} executable was not found.` };
  const args = Array.isArray(body.args) ? body.args.map(String) : [];
  if (args.some((arg) => BLOCKED_ARGS.test(arg))) return { success: false, message: 'Browser argument is blocked for safety.' };
  const child = spawn(executable, args, { detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();
  return { success: true, message: `${app} launched.`, data: { app, executable } };
}

function browserExecutable(app = 'chrome') {
  const candidates = ALLOWED_APPS.get(app) || [];
  return candidates.find((candidate) => require('node:fs').existsSync(candidate));
}

async function cdpHttp(pathname) {
  const response = await fetch(`http://${HOST}:${BROWSER_PORT}${pathname}`, { signal: AbortSignal.timeout(1500) });
  if (!response.ok) throw new Error(`Browser debugger returned HTTP ${response.status}`);
  return response.json();
}

async function cdpEvaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const id = Date.now();
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('Browser observation timed out.'));
    }, 2000);
    socket.onopen = () => socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== id) return;
      clearTimeout(timer);
      socket.close();
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result?.result?.value);
    };
    socket.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Browser debugger connection failed.'));
    };
  });
}

async function observeBrowser() {
  const pages = await cdpHttp('/json/list');
  const page = pages.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
  if (!page) return { success: false, message: 'No controlled browser tab is available.' };
  const state = await cdpEvaluate(page.webSocketDebuggerUrl, `JSON.stringify({
    url: location.href,
    title: document.title,
    readyState: document.readyState,
    visibleText: (document.body && document.body.innerText || '').slice(0, 3000)
  })`);
  return { success: true, message: 'Browser state observed from the active tab.', data: { ...JSON.parse(state), tabUrl: page.url } };
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

async function navigateBrowser(body) {
  const target = String(body.url || '').trim();
  let parsed;
  try { parsed = new URL(target); } catch { return { success: false, message: 'A valid browser URL is required.' }; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return { success: false, message: 'Only HTTP(S) browser navigation is allowed.' };

  const app = String(body.app || 'chrome').toLowerCase();
  const executable = browserExecutable(app);
  if (!executable) return { success: false, message: `Allowlisted ${app} executable was not found.` };
  let pages;
  try { pages = await cdpHttp('/json/list'); } catch {
    await fs.mkdir(BROWSER_PROFILE, { recursive: true });
    const child = spawn(executable, [
      `--remote-debugging-port=${BROWSER_PORT}`,
      `--user-data-dir=${BROWSER_PROFILE}`,
      '--no-first-run', '--no-default-browser-check', '--new-window', target
    ], { detached: true, stdio: 'ignore', windowsHide: false });
    child.unref();
  }

  const deadline = Date.now() + 10000;
  let lastError = 'Browser did not expose an active tab.';
  while (Date.now() < deadline) {
    try {
      pages = await cdpHttp('/json/list');
      const page = pages.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
      if (page) {
        await fetch(`http://${HOST}:${BROWSER_PORT}/json/activate/${page.id}`);
        const state = await cdpEvaluate(page.webSocketDebuggerUrl, `location.href = ${JSON.stringify(target)}; 'navigation-started'`);
        if (state === 'navigation-started') {
          await new Promise((resolve) => setTimeout(resolve, 800));
          const observed = await observeBrowser();
          if (observed.success && matchesHostname(target, observed.data.url)) {
            return { success: true, message: `Browser verified ${parsed.hostname} (${observed.data.title || 'Page loaded'}).`, data: observed.data };
          }
          lastError = observed.message || `Observed URL: ${observed.data?.url || 'unknown'}`;
        }
      }
    } catch (error) { lastError = error.message; }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return { success: false, message: `Browser navigation failed verification: ${lastError}` };
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
  return {
    success: true,
    message: 'Local companion is connected with Global Desktop Overlay active.',
    data: {
      host: HOST,
      port: PORT,
      workspace: WORKSPACE,
      desktopOverlayActive: true,
      capabilities: ['launchAllowlistedApp', 'browserNavigate', 'browserObserve', 'getDesktopContext', 'workspaceFiles', 'auditLog']
    }
  };
}

async function toggleSmartAgent() {
  try {
    const pages = await cdpHttp('/json/list');
    const page = pages.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
    if (page) {
      await fetch(`http://${HOST}:${BROWSER_PORT}/json/activate/${page.id}`);
      await cdpEvaluate(page.webSocketDebuggerUrl, `window.postMessage({ type: 'TOGGLE_SMART_AGENT' }, '*')`);
      return { success: true, message: 'Smart Agent toggled in active tab.' };
    }
  } catch { }

  // Fallback: launch allowlisted browser window to Smart Learn Dashboard
  return launchApp({ app: 'chrome', args: ['http://127.0.0.1:3000/dashboard'] });
}

async function handle(request, body) {
  if (request.url === '/health' && request.method === 'GET') return inspect();
  if (request.url === '/toggle-agent' && request.method === 'POST') return toggleSmartAgent();
  if (request.url === '/desktop-context' && request.method === 'GET') return getDesktopContext();
  if (request.method !== 'POST') return { status: 405, success: false, message: 'POST required.' };
  if (body.action === 'inspect') return inspect();
  if (body.action === 'launchApp') return launchApp(body);
  if (body.action === 'browserNavigate') return navigateBrowser(body);
  if (body.action === 'browserObserve') return observeBrowser();
  if (body.action === 'getDesktopContext') return getDesktopContext();
  if (body.action === 'readWorkspaceFile') {
    const target = safePath(body.path);
    if (!target) return { success: false, message: 'Path must stay inside the configured workspace.' };
    const stat = await fs.stat(target);
    if (stat.size > 1_000_000) return { success: false, message: 'File exceeds the 1MB companion limit.' };
    return { success: true, message: 'Workspace file read.', data: { path: body.path, content: await fs.readFile(target, 'utf8') } };
  }
  if (body.action === 'writeWorkspaceFile') {
    if (!confirmed(request)) return { status: 403, success: false, message: 'Explicit confirmation required before writing a file.' };
    const target = safePath(body.path);
    if (!target || typeof body.content !== 'string') return { success: false, message: 'Invalid workspace file request.' };
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body.content, 'utf8');
    return { success: true, message: 'Workspace file written.', data: { path: body.path, bytes: Buffer.byteLength(body.content) } };
  }
  return { status: 404, success: false, message: `Unsupported companion action: ${body.action || 'unknown'}` };
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.socket.remoteAddress !== '127.0.0.1' && request.socket.remoteAddress !== '::1') {
      return json(response, 403, { success: false, message: 'Local connections only.' });
    }
    if (request.headers['x-smart-learn-token'] !== TOKEN) return json(response, 401, { success: false, message: 'Invalid companion token.' });
    let raw = '';
    for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const result = await handle(request, body);
    await audit(body.action || 'unknown', { path: body.path, app: body.app }, result.success ? 'success' : 'rejected');
    return json(response, result.status || (result.success ? 200 : 400), result);
  } catch (error) {
    await audit('error', {}, error.message);
    return json(response, 500, { success: false, message: 'Companion action failed.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Smart Learn Companion listening on http://${HOST}:${PORT}`);
  console.log(`Workspace: ${WORKSPACE}`);
  console.log(`Token: ${TOKEN}`);
  ensureDesktopOverlay();
});
