import { codeforcesAdapter } from './codeforces';
import { leetcodeAdapter } from './leetcode';
import { codechefAdapter } from './codechef';
import type { CodingPlatformAdapter, ExternalProblem, PlatformName, PlatformProblemIdentifier } from './types';

const adapters: Record<PlatformName, CodingPlatformAdapter> = {
  CODEFORCES: codeforcesAdapter,
  LEETCODE: leetcodeAdapter,
  CODECHEF: codechefAdapter,
};

/**
 * SSRF Security Validator:
 * Ensures inputs are safe problem IDs or valid HTTPS URLs from official whitelisted domains.
 */
export function validateAndNormalizeInput(rawInput: string, preferredPlatform?: PlatformName): PlatformProblemIdentifier {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('Problem ID or URL string is required.');
  }

  const trimmed = rawInput.trim();

  // 1. SSRF URL Check if input is a URL
  if (/^[a-z]+:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);

      // Only allow HTTPS or HTTP protocols
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('Only HTTPS URLs are allowed.');
      }

      const hostname = url.hostname.toLowerCase();

      // Block local/private IPs and internal hostnames (SSRF prevention)
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '169.254.169.254' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.local')
      ) {
        throw new Error('Local or internal addresses are strictly prohibited.');
      }

      // Check allowed whitelisted domains
      const isCodeforces = hostname === 'codeforces.com' || hostname.endsWith('.codeforces.com');
      const isLeetCode = hostname === 'leetcode.com' || hostname.endsWith('.leetcode.com');
      const isCodeChef = hostname === 'codechef.com' || hostname.endsWith('.codechef.com');

      if (!isCodeforces && !isLeetCode && !isCodeChef) {
        throw new Error('Only official Codeforces, LeetCode, and CodeChef URLs are supported.');
      }

      if (isCodeforces) {
        const parsed = codeforcesAdapter.parseIdentifier(trimmed);
        if (parsed) return parsed;
      }

      if (isLeetCode) {
        const parsed = leetcodeAdapter.parseIdentifier(trimmed);
        if (parsed) return parsed;
      }

      if (isCodeChef) {
        const parsed = codechefAdapter.parseIdentifier(trimmed);
        if (parsed) return parsed;
      }
    } catch (err: any) {
      throw new Error(err.message || 'Invalid or unsupported problem URL.');
    }
  }

  // 2. Short-form ID parsing if preferred platform specified
  if (preferredPlatform && adapters[preferredPlatform]) {
    const parsed = adapters[preferredPlatform].parseIdentifier(trimmed);
    if (parsed) return parsed;
  }

  // 3. Auto-detect from input string
  const cfParsed = codeforcesAdapter.parseIdentifier(trimmed);
  if (cfParsed) return cfParsed;

  const lcParsed = leetcodeAdapter.parseIdentifier(trimmed);
  if (lcParsed) return lcParsed;

  const ccParsed = codechefAdapter.parseIdentifier(trimmed);
  if (ccParsed) return ccParsed;

  throw new Error('Could not identify problem platform. Use format like 4A for Codeforces, two-sum for LeetCode, or FLOW001 for CodeChef.');
}

/**
 * High-level Problem Fetcher using unified adapters & SSRF protection
 */
export async function fetchExternalProblem(rawInput: string, platformHint?: PlatformName): Promise<ExternalProblem> {
  const identifier = validateAndNormalizeInput(rawInput, platformHint);
  const adapter = adapters[identifier.platform];
  if (!adapter) {
    throw new Error(`Unsupported platform: ${identifier.platform}`);
  }
  return await adapter.fetchProblem(identifier);
}
