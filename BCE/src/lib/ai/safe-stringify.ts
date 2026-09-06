/**
 * Hardened Serialization & Data Boundary Guards for Smart Agent.
 * Ensures DOM objects and circular references never enter agent state or API payloads.
 */

/**
 * Checks if a value is a DOM node, Event, Window, or React Fiber reference.
 */
export function isDOMOrFiberNode(value: any, keyName?: string): boolean {
  if (!value || typeof value !== 'object') return false;

  if (typeof window !== 'undefined') {
    if (value instanceof Node || value instanceof Event || value instanceof Window) {
      return true;
    }
  }

  if (value.nodeType !== undefined) return true;

  const constructorName = value.constructor && typeof value.constructor.name === 'string' ? value.constructor.name : '';
  if (
    constructorName.includes('Element') ||
    constructorName.includes('Node') ||
    constructorName.includes('Fiber') ||
    constructorName.includes('HTML')
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
 * Logs a clear warning if a non-serializable DOM object is detected, and returns a clean, sanitized copy.
 */
export function assertSerializableAgentPayload<T = any>(payload: T): T {
  if (payload === undefined || payload === null) return payload;

  const seen = new WeakSet();

  function sanitizeDeep(val: any, path: string): any {
    if (val === undefined || val === null) return val;
    if (typeof val === 'function') return undefined;
    if (typeof val !== 'object') return val;

    if (isDOMOrFiberNode(val, path.split('.').pop())) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[Agent Serialization Guard] Non-serializable DOM object detected at path: "${path}"`);
      }
      return undefined;
    }

    if (seen.has(val)) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[Agent Serialization Guard] Circular reference detected at path: "${path}"`);
      }
      return '[Circular]';
    }
    seen.add(val);

    if (Array.isArray(val)) {
      return val.map((item, idx) => sanitizeDeep(item, `${path}[${idx}]`)).filter(item => item !== undefined);
    }

    if (val instanceof Map) {
      const plainObj: Record<string, any> = {};
      val.forEach((mapVal, mapKey) => {
        const cleaned = sanitizeDeep(mapVal, `${path}.${mapKey}`);
        if (cleaned !== undefined) plainObj[String(mapKey)] = cleaned;
      });
      return plainObj;
    }

    const cleanedObj: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      if (key === 'domNode') continue; // Hard filter
      const cleaned = sanitizeDeep(val[key], path ? `${path}.${key}` : key);
      if (cleaned !== undefined) {
        cleanedObj[key] = cleaned;
      }
    }
    return cleanedObj;
  }

  try {
    return sanitizeDeep(payload, '');
  } catch (err) {
    console.error('[Agent Serialization Guard] Error during payload sanitization:', err);
    return {} as T;
  }
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
