import 'server-only';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';

export interface LocalComputerRequest {
  action: 
    | 'inspect' 
    | 'launchApp' 
    | 'browserNavigate' 
    | 'browserObserve' 
    | 'getDesktopContext' 
    | 'readWorkspaceFile' 
    | 'writeWorkspaceFile'
    | 'openExternalApp'
    | 'findElement'
    | 'clickElement'
    | 'focusElement'
    | 'typeText'
    | 'pressKey'
    | 'waitForElement'
    | 'readVisibleText'
    | 'copyText'
    | 'pasteText'
    | 'interactExternalUI'
    | 'getActiveBrowserPage'
    | 'GET_EXTERNAL_DOM_SNAPSHOT'
    | 'searchWebAndSolve'
    | 'PING_COMPANION'
    | 'GET_ACTIVE_BROWSER_PAGE'
    | 'FOCUS_BROWSER'
    | 'FIND_VISIBLE_TEXTBOX';
  app?: string;
  url?: string;
  args?: string[];
  path?: string;
  content?: string;
  selector?: string;
  selectors?: string[];
  text?: string;
  key?: string;
  timeoutMs?: number;
  confirmed?: boolean;
}

export interface LocalComputerResult {
  success: boolean;
  message: string;
  requestId?: string;
  stage?: string;
  durationMs?: number;
  data?: Record<string, unknown>;
  companionConnected?: boolean;
  browserAutomation?: boolean;
}

const DEFAULT_COMPANION_URL = 'http://127.0.0.1:43127';
let companionSpawnPromise: Promise<boolean> | null = null;

function getCompanionToken(): string {
  if (process.env.SMART_LEARN_COMPANION_TOKEN) {
    return process.env.SMART_LEARN_COMPANION_TOKEN;
  }
  try {
    const candidatePaths = [
      path.join(process.cwd(), '.smart-learn', 'companion-token'),
      path.join(process.cwd(), '..', '.smart-learn', 'companion-token'),
      path.join(process.cwd(), 'tools', 'smart-learn-companion', '.smart-learn', 'companion-token'),
      path.join(process.cwd(), '..', 'tools', 'smart-learn-companion', '.smart-learn', 'companion-token')
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const token = fs.readFileSync(p, 'utf8').trim();
        if (token) return token;
      }
    }
  } catch {}
  return 'smart-learn-companion-token-default';
}

export async function checkCompanionHealth(): Promise<{ connected: boolean; message: string; data?: any }> {
  const baseUrl = process.env.SMART_LEARN_COMPANION_URL || DEFAULT_COMPANION_URL;
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(1500)
    });
    if (res.ok) {
      const data = await res.json();
      return { connected: true, message: 'Companion is running and healthy.', data };
    }
    return { connected: false, message: `Companion returned status HTTP ${res.status}` };
  } catch (err: any) {
    const code = err?.cause?.code || err?.code || '';
    if (code === 'ECONNREFUSED' || err?.message?.includes('fetch failed')) {
      return { connected: false, message: `Companion is not running at ${baseUrl}.` };
    }
    return { connected: false, message: `Companion health check failed: ${err.message || 'Offline'}` };
  }
}

async function ensureCompanionRunning(): Promise<boolean> {
  const health = await checkCompanionHealth();
  if (health.connected) return true;

  if (companionSpawnPromise) return companionSpawnPromise;

  companionSpawnPromise = (async () => {
    try {
      const candidateScripts = [
        path.join(process.cwd(), 'tools', 'smart-learn-companion', 'companion.js'),
        path.join(process.cwd(), '..', 'tools', 'smart-learn-companion', 'companion.js'),
        path.join(__dirname, '..', '..', '..', 'tools', 'smart-learn-companion', 'companion.js')
      ];

      const scriptPath = candidateScripts.find((p) => fs.existsSync(p));
      if (!scriptPath) {
        console.error('Companion script companion.js not found in candidates:', candidateScripts);
        return false;
      }

      const workspaceDir = path.resolve(path.dirname(scriptPath), '..', '..');

      const child = spawn(process.execPath, [scriptPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
        env: {
          ...process.env,
          SMART_LEARN_WORKSPACE: workspaceDir
        }
      });
      child.unref();

      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 400));
        const res = await checkCompanionHealth();
        if (res.connected) {
          companionSpawnPromise = null;
          return true;
        }
      }
    } catch (err) {
      console.error('Failed to auto-start companion:', err);
    }
    companionSpawnPromise = null;
    return false;
  })();

  return companionSpawnPromise;
}

export async function callLocalComputer(request: LocalComputerRequest): Promise<LocalComputerResult> {
  const reqId = 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const startTime = Date.now();

  console.log(`[ExternalUI] REQUEST ${reqId} action=${request.action}`);

  const isRunning = await ensureCompanionRunning();
  if (!isRunning) {
    console.error(`[ExternalUI] FAILED_HEALTH_CHECK ${reqId} Companion offline.`);
    return {
      success: false,
      requestId: reqId,
      stage: 'COMPANION_HEALTH_CHECK',
      companionConnected: false,
      message: 'FAILED: Smart Learn Companion is offline or unreachable on port 43127.'
    };
  }

  const token = getCompanionToken();
  const baseUrl = process.env.SMART_LEARN_COMPANION_URL || DEFAULT_COMPANION_URL;

  console.log(`[ExternalUI] SENT_TO_COMPANION ${reqId}`);

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-smart-learn-token': token,
        'x-smart-learn-confirmed': request.confirmed === true ? 'true' : 'false'
      },
      body: JSON.stringify(request),
      cache: 'no-store',
      signal: AbortSignal.timeout(6000)
    });

    const payload = await response.json() as LocalComputerResult;
    const durationMs = Date.now() - startTime;

    console.log(`[ExternalUI] RESPONSE_RETURNED ${reqId} status=${response.ok ? 'SUCCESS' : 'FAILED'} duration=${durationMs}ms`);

    if (response.status === 401) {
      return {
        success: false,
        requestId: reqId,
        stage: 'AUTH_CHECK',
        durationMs,
        companionConnected: false,
        message: 'FAILED: Companion token mismatch between Web App and Companion process.'
      };
    }

    if (payload.success === true) {
      return {
        ...payload,
        requestId: reqId,
        stage: 'COMPLETED',
        durationMs,
        companionConnected: true,
        browserAutomation: true
      };
    }

    return {
      success: false,
      requestId: reqId,
      stage: 'COMPANION_REJECTED',
      durationMs,
      companionConnected: true,
      message: payload.message || `Companion rejected the action (HTTP ${response.status}).`
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const errMessage = err?.message || '';

    if (err.name === 'TimeoutError' || errMessage.includes('timeout')) {
      console.error(`[ExternalUI] TIMEOUT ${reqId} stage=BROWSER_EXECUTION duration=${durationMs}ms`);
      return {
        success: false,
        requestId: reqId,
        stage: 'BROWSER_EXECUTION_TIMEOUT',
        durationMs,
        companionConnected: true,
        message: `External automation timeout (stage: BROWSER_EXECUTION, requestId: ${reqId}).`
      };
    }

    console.error(`[ExternalUI] ERROR ${reqId} stage=TRANSPORT duration=${durationMs}ms err=${errMessage}`);
    return {
      success: false,
      requestId: reqId,
      stage: 'TRANSPORT_ERROR',
      durationMs,
      companionConnected: false,
      message: `FAILED: External browser automation error: ${errMessage || 'Companion connection failed.'}`
    };
  }
}