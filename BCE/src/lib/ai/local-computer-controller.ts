import 'server-only';

export interface LocalComputerRequest {
  action: 'inspect' | 'launchApp' | 'browserNavigate' | 'browserObserve' | 'readWorkspaceFile' | 'writeWorkspaceFile';
  app?: string;
  url?: string;
  args?: string[];
  path?: string;
  content?: string;
  confirmed?: boolean;
}

export interface LocalComputerResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

const DEFAULT_COMPANION_URL = 'http://127.0.0.1:43127';

export async function callLocalComputer(request: LocalComputerRequest): Promise<LocalComputerResult> {
  const token = process.env.SMART_LEARN_COMPANION_TOKEN;
  if (!token) {
    return {
      success: false,
      message: 'Local Computer Companion is not configured. Start it and set SMART_LEARN_COMPANION_TOKEN on the server.'
    };
  }

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
      signal: AbortSignal.timeout(5000)
    });
    const payload = await response.json() as LocalComputerResult;
    return payload.success === true
      ? payload
      : { success: false, message: payload.message || `Companion rejected the action (HTTP ${response.status}).` };
  } catch {
    return {
      success: false,
      message: 'Local Computer Companion is offline. No desktop action was attempted.'
    };
  }
}