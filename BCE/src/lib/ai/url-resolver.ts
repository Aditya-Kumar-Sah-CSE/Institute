/**
 * Centralized URL & Website Resolver for Smart Learn Agent
 * Converts natural-language website queries, raw domains, and URLs into sanitized HTTP(S) URLs
 * and provides state verification logic for active browser tabs.
 */

export interface ResolvedUrlResult {
  url: string;
  hostname: string;
  displayName: string;
  isExternal: boolean;
}

const BLOCKED_PROTOCOLS = ['javascript:', 'file:', 'data:', 'vbscript:', 'chrome:', 'edge:', 'about:', 'blob:'];

const COMMON_SITE_MAP: Record<string, { url: string; displayName: string }> = {
  'google': { url: 'https://www.google.com', displayName: 'Google' },
  'google.com': { url: 'https://www.google.com', displayName: 'Google' },
  'www.google.com': { url: 'https://www.google.com', displayName: 'Google' },
  
  'github': { url: 'https://github.com', displayName: 'GitHub' },
  'github.com': { url: 'https://github.com', displayName: 'GitHub' },
  'www.github.com': { url: 'https://github.com', displayName: 'GitHub' },

  'gpt': { url: 'https://chatgpt.com', displayName: 'ChatGPT' },
  'chatgpt': { url: 'https://chatgpt.com', displayName: 'ChatGPT' },
  'chat gpt': { url: 'https://chatgpt.com', displayName: 'ChatGPT' },
  'chatgpt.com': { url: 'https://chatgpt.com', displayName: 'ChatGPT' },

  'gmail': { url: 'https://mail.google.com', displayName: 'Gmail' },
  'google mail': { url: 'https://mail.google.com', displayName: 'Gmail' },
  'mail.google.com': { url: 'https://mail.google.com', displayName: 'Gmail' },

  'youtube': { url: 'https://www.youtube.com', displayName: 'YouTube' },
  'yt': { url: 'https://www.youtube.com', displayName: 'YouTube' },
  'youtube.com': { url: 'https://www.youtube.com', displayName: 'YouTube' },
  'www.youtube.com': { url: 'https://www.youtube.com', displayName: 'YouTube' },

  'wikipedia': { url: 'https://www.wikipedia.org', displayName: 'Wikipedia' },
  'wikipedia.org': { url: 'https://www.wikipedia.org', displayName: 'Wikipedia' },

  'leetcode': { url: 'https://leetcode.com', displayName: 'LeetCode' },
  'leetcode.com': { url: 'https://leetcode.com', displayName: 'LeetCode' },

  'stackoverflow': { url: 'https://stackoverflow.com', displayName: 'Stack Overflow' },
  'stack overflow': { url: 'https://stackoverflow.com', displayName: 'Stack Overflow' },
  'stackoverflow.com': { url: 'https://stackoverflow.com', displayName: 'Stack Overflow' },

  'linkedin': { url: 'https://www.linkedin.com', displayName: 'LinkedIn' },
  'linkedin.com': { url: 'https://www.linkedin.com', displayName: 'LinkedIn' },

  'twitter': { url: 'https://x.com', displayName: 'X (Twitter)' },
  'x': { url: 'https://x.com', displayName: 'X (Twitter)' },
  'x.com': { url: 'https://x.com', displayName: 'X (Twitter)' },

  'reddit': { url: 'https://www.reddit.com', displayName: 'Reddit' },
  'reddit.com': { url: 'https://www.reddit.com', displayName: 'Reddit' }
};

/**
 * Detects if a prompt contains task/action verbs or complex intent alongside website names.
 * Examples: "search", "find", "solve", "solution", "code", "copy", "paste", "explain", "how to", "what is", "ask"
 */
export function hasComplexTaskIntent(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const lower = input.trim().toLowerCase();

  const taskKeywordsRegex = /\b(search|find|query|ask|solve|solution|code|copy|paste|explain|how\s+to|what\s+is|look\s*up|get|answer|write|generate|debug|fix|create|run|execute|analyze|summarize|detail|details|two\s*sum|dsa|problem|python|javascript|cpp|java)\b/i;

  return taskKeywordsRegex.test(lower);
}

/**
 * Resolves arbitrary natural language intent, raw domain, or URL into a safe, fully-qualified HTTP/HTTPS URL.
 * Returns null if the input contains a complex task intent (e.g. "go to gpt and search two sum").
 */
export function resolveTargetUrl(input: string): ResolvedUrlResult | null {
  if (!input || typeof input !== 'string') return null;

  // Bypasses pure URL resolution if user prompt contains complex task/action instructions
  if (hasComplexTaskIntent(input)) {
    return null;
  }

  const raw = input.trim();
  const lower = raw.toLowerCase();

  // Safety check: block unsafe protocols
  for (const protocol of BLOCKED_PROTOCOLS) {
    if (lower.startsWith(protocol)) {
      console.warn(`[URL Resolver] Blocked unsafe protocol in input: ${raw}`);
      return null;
    }
  }

  // 1. Direct match on full HTTP/HTTPS URL
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    try {
      const parsed = new URL(raw);
      if (BLOCKED_PROTOCOLS.some(p => parsed.protocol.startsWith(p.replace(':', '')))) {
        return null;
      }
      const hostname = parsed.hostname;
      return {
        url: parsed.toString(),
        hostname,
        displayName: hostname.replace(/^www\./, ''),
        isExternal: true
      };
    } catch {
      return null;
    }
  }

  // 2. Strip standard prompt navigation prefix phrases
  let cleaned = raw
    .replace(/^(?:open|go\s+to|visit|navigate\s+to|launch|show|dikhao|kholo)\s+/i, '')
    .replace(/\s+(?:kholo|open|show|dikhao|launch|visit)$/i, '')
    .replace(/\s+(?:website|site|page)$/i, '')
    .trim();

  const cleanedLower = cleaned.toLowerCase();

  // 3. Known site dictionary match
  if (COMMON_SITE_MAP[cleanedLower]) {
    const site = COMMON_SITE_MAP[cleanedLower];
    const parsed = new URL(site.url);
    return {
      url: site.url,
      hostname: parsed.hostname,
      displayName: site.displayName,
      isExternal: true
    };
  }

  // 4. Domain pattern matching (e.g. "example.com", "developer.mozilla.org", "sub.domain.co.uk/path")
  const domainPattern = /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/.*)?$/;
  if (domainPattern.test(cleanedLower)) {
    const fullUrl = `https://${cleaned}`;
    try {
      const parsed = new URL(fullUrl);
      return {
        url: fullUrl,
        hostname: parsed.hostname,
        displayName: parsed.hostname.replace(/^www\./, ''),
        isExternal: true
      };
    } catch {
      return null;
    }
  }

  // 5. Fallback: check if raw input stripped of words matches a known site
  const firstWord = cleanedLower.split(/\s+/)[0];
  if (COMMON_SITE_MAP[firstWord]) {
    const site = COMMON_SITE_MAP[firstWord];
    const parsed = new URL(site.url);
    return {
      url: site.url,
      hostname: parsed.hostname,
      displayName: site.displayName,
      isExternal: true
    };
  }

  return null;
}

/**
 * Normalizes hostnames for verification matching, handling 'www.' prefixes and redirects.
 * e.g., 'google.com' matches 'www.google.com' or 'mail.google.com'
 */
export function verifyUrlHostnameMatch(targetUrl: string, observedUrl: string): boolean {
  if (!targetUrl || !observedUrl) return false;

  try {
    const targetObj = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    const observedObj = new URL(observedUrl.startsWith('http') ? observedUrl : `https://${observedUrl}`);

    const targetHost = targetObj.hostname.toLowerCase().replace(/^www\./, '');
    const observedHost = observedObj.hostname.toLowerCase().replace(/^www\./, '');

    if (targetHost === observedHost) return true;

    // Check subdomain matching (e.g., target 'google.com' matches observed 'mail.google.com')
    if (observedHost.endsWith(`.${targetHost}`) || targetHost.endsWith(`.${observedHost}`)) {
      return true;
    }

    // Check base domain equality (e.g. google.co.in vs google.com or redirect variations)
    const getBaseDomain = (host: string) => {
      const parts = host.split('.');
      return parts.length >= 2 ? parts.slice(-2).join('.') : host;
    };

    return getBaseDomain(targetHost) === getBaseDomain(observedHost);
  } catch {
    return false;
  }
}
