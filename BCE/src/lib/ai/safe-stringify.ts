/**
 * Hardened Serialization & Data Boundary Guards for Smart Agent.
 * Ensures DOM objects and circular references never enter agent state or API payloads.
 */

/**
 * Checks if a value is a DOM node, Event, Window, CSSStyleDeclaration, or React Fiber reference.
 */
export function isDOMOrFiberNode(value: any, keyName?: string): boolean {
  if (!value || typeof value !== 'object') return false;

  if (typeof window !== 'undefined') {
    if (
      value instanceof Node ||
      value instanceof Element ||
      value instanceof HTMLElement ||
      value instanceof Event ||
      value instanceof Window ||
      value instanceof Document ||
      value instanceof CSSStyleDeclaration ||
      (typeof CSSRule !== 'undefined' && value instanceof CSSRule)
    ) {
      return true;
    }
  }

  if (value.nodeType !== undefined) return true;

  const constructorName = value.constructor && typeof value.constructor.name === 'string' ? value.constructor.name : '';
  if (
    constructorName.includes('Element') ||
    constructorName.includes('Node') ||
    constructorName.includes('Fiber') ||
    constructorName.includes('HTML') ||
    constructorName.includes('CSSStyleDeclaration') ||
    constructorName.includes('CSSRule') ||
    constructorName.includes('Window') ||
    constructorName.includes('Document')
  ) {
    return true;
  }

  if (keyName && (keyName.startsWith('__react') || keyName.startsWith('__reactFiber') || keyName === 'domNode' || keyName === 'stateNode')) {
    return true;
  }

  return false;
}

/**
 * Validates an agent payload in development mode.
 * Uses stack-based ancestor tracking for accurate circular reference detection.
 * Logs a clear warning if a non-serializable DOM object or circular loop is detected, returning a clean, sanitized copy.
 */
export function assertSerializableAgentPayload<T = any>(payload: T): T {
  if (payload === undefined || payload === null) return payload;

  const ancestors = new Set();

  function sanitizeDeep(val: any, path: string): any {
    if (val === undefined || val === null) return val;
    if (typeof val === 'function') return undefined;
    if (typeof val !== 'object') return val;

    if (isDOMOrFiberNode(val, path.split('.').pop())) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[Agent Serialization Guard] Non-serializable DOM/CSS object detected at path: "${path}"`);
      }
      return undefined;
    }

    if (ancestors.has(val)) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[Agent Serialization Guard] Circular reference detected at path: "${path}"`);
      }
      return '[Circular]';
    }

    ancestors.add(val);

    let result: any;
    if (Array.isArray(val)) {
      result = val.map((item, idx) => sanitizeDeep(item, `${path}[${idx}]`)).filter(item => item !== undefined);
    } else if (val instanceof Map) {
      const plainObj: Record<string, any> = {};
      val.forEach((mapVal, mapKey) => {
        const cleaned = sanitizeDeep(mapVal, `${path}.${mapKey}`);
        if (cleaned !== undefined) plainObj[String(mapKey)] = cleaned;
      });
      result = plainObj;
    } else {
      const cleanedObj: Record<string, any> = {};
      for (const key of Object.keys(val)) {
        if (key === 'domNode') continue; // Hard filter
        const cleaned = sanitizeDeep(val[key], path ? `${path}.${key}` : key);
        if (cleaned !== undefined) {
          cleanedObj[key] = cleaned;
        }
      }
      result = cleanedObj;
    }

    ancestors.delete(val);
    return result;
  }

  try {
    return sanitizeDeep(payload, '');
  } catch (err) {
    console.error('[Agent Serialization Guard] Error during payload sanitization:', err);
    return {} as T;
  }
}

/**
 * Validates an API payload before sending to agent endpoints.
 * Fails closed if non-serializable DOM objects or circular references are present.
 */
export function validateAgentApiPayload(payload: any, toolName: string): { valid: boolean; error?: string } {
  if (!payload) return { valid: true };

  const ancestors = new Set();
  let invalidPath: string | null = null;
  let invalidType: string | null = null;

  function checkDeep(val: any, path: string): boolean {
    if (val === undefined || val === null) return true;
    if (typeof val === 'function') {
      invalidPath = path;
      invalidType = 'Function';
      return false;
    }
    if (typeof val !== 'object') return true;

    if (isDOMOrFiberNode(val, path.split('.').pop())) {
      invalidPath = path;
      invalidType = val.constructor?.name || 'DOM/CSS Object';
      return false;
    }

    if (ancestors.has(val)) {
      invalidPath = path;
      invalidType = 'Circular Reference';
      return false;
    }

    ancestors.add(val);

    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        if (!checkDeep(val[i], `${path}[${i}]`)) {
          ancestors.delete(val);
          return false;
        }
      }
    } else if (val instanceof Map) {
      for (const [k, v] of val.entries()) {
        if (!checkDeep(v, `${path}.${k}`)) {
          ancestors.delete(val);
          return false;
        }
      }
    } else {
      for (const key of Object.keys(val)) {
        if (key === 'domNode') continue;
        if (!checkDeep(val[key], path ? `${path}.${key}` : key)) {
          ancestors.delete(val);
          return false;
        }
      }
    }

    ancestors.delete(val);
    return true;
  }

  const valid = checkDeep(payload, 'payload');
  if (!valid) {
    console.error(`[Agent API Boundary Guard] Payload validation failed for tool "${toolName}" at path "${invalidPath}" (Type: ${invalidType})`);
    return { valid: false, error: `Payload validation failed for tool "${toolName}" at path "${invalidPath}" (${invalidType})` };
  }

  return { valid: true };
}

/**
 * Sanitizes pageContext into a pure, JSON-safe DTO.
 */
export function sanitizePageContext(rawContext: any): any {
  if (!rawContext || typeof rawContext !== 'object') return rawContext;

  const sanitized = assertSerializableAgentPayload(rawContext);
  if (sanitized && sanitized.snapshot && sanitized.snapshot.elementsMap instanceof Map) {
    const mapObj: Record<string, any> = {};
    sanitized.snapshot.elementsMap.forEach((v: any, k: string) => {
      mapObj[k] = v;
    });
    sanitized.snapshot.elementsMap = mapObj;
  }

  return sanitized;
}

/**
 * Safe JSON Stringifier that prevents "Converting circular structure to JSON" crashes.
 */
export function safeStringify(obj: any, maxLength = 4000): string {
  if (obj === undefined || obj === null) return String(obj);
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

  try {
    const cleanObj = assertSerializableAgentPayload(obj);
    const jsonStr = JSON.stringify(cleanObj);

    if (maxLength && jsonStr && jsonStr.length > maxLength) {
      return jsonStr.slice(0, maxLength) + '...';
    }

    return jsonStr || '';
  } catch (err) {
    return '[Unserializable Context]';
  }
}

export interface AgentApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

/**
 * Safe Response Parser that prevents "Unexpected token '<', <!DOCTYPE ... is not valid JSON" crashes.
 * Validates HTTP status, inspects Content-Type, catches HTML error pages, and safely parses JSON.
 */
export async function parseAgentJsonResponse<T = any>(response: Response): Promise<AgentApiResponse<T>> {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Agent API Response]', {
      url: response.url,
      status: response.status,
      contentType
    });
  }

  if (!response.ok) {
    let errorMsg = `Agent API failed: ${response.status} ${response.statusText}`;
    if (isJson) {
      try {
        const errJson = await response.json();
        errorMsg = errJson.message || errJson.error || errorMsg;
      } catch (e) {}
    } else {
      try {
        const text = await response.text();
        console.error('[Agent API] Non-JSON HTTP Error Received:', {
          status: response.status,
          contentType,
          url: response.url,
          preview: text.slice(0, 200)
        });
      } catch (e) {}
    }
    return { success: false, error: errorMsg, status: response.status };
  }

  if (!isJson) {
    let preview = '';
    try {
      const text = await response.text();
      preview = text.slice(0, 200);
    } catch (e) {}

    console.error('[Agent API] Expected application/json but received non-JSON:', {
      status: response.status,
      contentType,
      url: response.url,
      preview
    });

    return {
      success: false,
      error: `Agent API returned unexpected non-JSON response (${contentType || 'text/html'})`,
      status: response.status
    };
  }

  try {
    const data = await response.json();
    return { success: true, data, status: response.status };
  } catch (err: any) {
    console.error('[Agent API] JSON parse exception:', err);
    return {
      success: false,
      error: 'Failed to parse API JSON response',
      status: response.status
    };
  }
}
