/**
 * Safe JSON Stringifier that prevents "Converting circular structure to JSON" crashes
 * when serializing objects containing DOM Elements, React FiberNodes, circular references, or Functions.
 */
export function safeStringify(obj: any, maxLength = 4000): string {
  if (obj === undefined || obj === null) return String(obj);
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

  const seen = new WeakSet();

  try {
    const jsonStr = JSON.stringify(obj, (key, value) => {
      // 1. Omit functions
      if (typeof value === 'function') {
        return undefined;
      }

      // 2. Inspect object references
      if (typeof value === 'object' && value !== null) {
        // Detect DOM Nodes, Events, Window, or React Fiber nodes
        if (typeof window !== 'undefined' && (value instanceof Node || value instanceof Event || value instanceof Window)) {
          return '[DOM Element]';
        }
        if (
          value.nodeType !== undefined ||
          (value.constructor && typeof value.constructor.name === 'string' && (
            value.constructor.name.includes('Element') ||
            value.constructor.name.includes('Node') ||
            value.constructor.name.includes('Fiber')
          )) ||
          key.startsWith('__react') ||
          key.startsWith('__reactFiber')
        ) {
          return '[DOM Element]';
        }

        // Circular reference detection
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }

      return value;
    });

    if (maxLength && jsonStr && jsonStr.length > maxLength) {
      return jsonStr.slice(0, maxLength) + '...';
    }

    return jsonStr || '';
  } catch (err) {
    return '[Unserializable Context]';
  }
}
