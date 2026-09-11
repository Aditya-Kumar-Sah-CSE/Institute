import 'server-only';
import * as fs from 'node:fs';
import * as path from 'node:path';

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
    | 'interactExternalUI';
  app?: string;
  url?: string;
  args?: string[];
  path?: string;
  content?: string;
  selector?: string;
  text?: string;
  key?: string;
  timeoutMs?: number;
  confirmed?: boolean;
}

export interface LocalComputerResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  companionConnected?: boolean;
  browserAutomation?: boolean;
}

const DEFAULT_COMPANION_URL = 'http://127.0.0.1:43127';

function getCompanionToken(): string {
  if (process.env.SMART_LEARN_COMPANION_TOKEN) {
    return process.env.SMART_LEARN_COMPANION_TOKEN;
  }
  try {
    const primaryPath = path.join(process.cwd(), '.smart-learn', 'companion-token');
    if (fs.existsSync(primaryPath)) {
      const token = fs.readFileSync(primaryPath, 'utf8').trim();
      if (token) return token;
    }
    const parentPath = path.join(process.cwd(), '..', '.smart-learn', 'companion-token');
    if (fs.existsSync(parentPath)) {
      const token = fs.readFileSync(parentPath, 'utf8').trim();
      if (token) return token;
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
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      const data = await res.json();
      return { connected: true, message: 'Companion is running and healthy.', data };
    }
    return { connected: false, message: `Companion returned status HTTP ${res.status}` };
  } catch (err: any) {
    const code = err?.cause?.code || err?.code || '';
    if (code === 'ECONNREFUSED' || err?.message?.includes('fetch failed')) {
      return { connected: false, message: `Companion is not running at ${baseUrl}. Run 'npm run companion'.` };
    }
    return { connected: false, message: `Companion health check failed: ${err.message || 'Offline'}` };
  }
}

export async function callLocalComputer(request: LocalComputerRequest): Promise<LocalComputerResult> {
  const token = getCompanionToken();
  const baseUrl = process.env.SMART_LEARN_COMPANION_URL || DEFAULT_COMPANION_URL;

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
      signal: AbortSignal.timeout(12000)
    });

    const payload = await response.json() as LocalComputerResult;

    if (response.status === 401) {
      return {
        success: false,
        companionConnected: false,
        message: 'FAILED: Companion token mismatch between Web App and Companion process.'
      };
    }

    if (response.status === 403) {
      return {
        success: false,
        companionConnected: false,
        message: 'FAILED: Access denied by Companion (local connections only).'
      };
    }

    if (payload.success === true) {
      return {
        ...payload,
        companionConnected: true,
        browserAutomation: true
      };
    }

    return {
      success: false,
      companionConnected: true,
      message: payload.message || `Companion rejected the action (HTTP ${response.status}).`
    };
  } catch (err: any) {
    const code = err?.cause?.code || err?.code || '';
    const errMessage = err?.message || '';

    if (code === 'ECONNREFUSED' || errMessage.includes('fetch failed')) {
      return {
        success: false,
        companionConnected: false,
        message: `FAILED: External browser automation is not available. Smart Learn Companion is not running at ${baseUrl}. Ensure Companion is running (npm run companion).`
      };
    }

    if (err.name === 'TimeoutError' || errMessage.includes('timeout')) {
      return {
        success: false,
        companionConnected: false,
        message: 'FAILED: External browser automation request timed out after 12 seconds.'
      };
    }

    return {
      success: false,
      companionConnected: false,
      message: `FAILED: External browser automation error: ${errMessage || 'Companion connection failed.'}`
    };
  }
}