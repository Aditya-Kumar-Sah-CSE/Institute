import { NextResponse } from 'next/server';

// Blocked hostnames and IP patterns to prevent SSRF attacks
const BLOCKED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  'metadata.google.internal',
  'metadata.google.com',
];

function isPrivateOrReservedIP(hostname: string): boolean {
  // Block common private/reserved IP ranges
  const privatePatterns = [
    /^10\./,                          // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
    /^192\.168\./,                    // 192.168.0.0/16
    /^169\.254\./,                    // Link-local / cloud metadata
    /^127\./,                         // Loopback
    /^0\./,                           // Current network
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // Shared address space
    /^fd[0-9a-f]{2}:/i,              // IPv6 unique local
    /^fe80:/i,                        // IPv6 link-local
  ];
  return privatePatterns.some(pattern => pattern.test(hostname));
}

function isUrlSafe(urlStr: string): { safe: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { safe: false, error: 'Invalid URL format' };
  }

  // Only allow HTTPS
  if (parsed.protocol !== 'https:') {
    return { safe: false, error: 'Only HTTPS URLs are allowed' };
  }

  // Block private/reserved hostnames
  if (BLOCKED_HOSTNAMES.includes(parsed.hostname.toLowerCase())) {
    return { safe: false, error: 'This URL is not allowed' };
  }

  // Block private/reserved IP addresses
  if (isPrivateOrReservedIP(parsed.hostname)) {
    return { safe: false, error: 'This URL is not allowed' };
  }

  return { safe: true };
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ valid: false, error: 'URL is required' }, { status: 400 });
    }

    const urlCheck = isUrlSafe(url);
    if (!urlCheck.safe) {
      return NextResponse.json({ valid: false, error: urlCheck.error }, { status: 400 });
    }

    // HEAD request with timeout to check if site is live
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'manual', // Don't follow redirects to internal IPs
      });

      clearTimeout(timeout);

      if (response.ok || (response.status >= 300 && response.status < 400)) {
        return NextResponse.json({ valid: true });
      } else {
        // Try GET as fallback (some hosts block HEAD)
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 10000);

        const getResponse = await fetch(url, {
          method: 'GET',
          signal: controller2.signal,
          redirect: 'manual',
        });

        clearTimeout(timeout2);

        if (getResponse.ok) {
          return NextResponse.json({ valid: true });
        }
        return NextResponse.json({ valid: false, error: `Returned status: ${response.status}` });
      }
    } catch {
      clearTimeout(timeout);
      return NextResponse.json({ valid: false, error: 'Could not reach URL or request timed out' });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Could not reach URL';
    return NextResponse.json({ valid: false, error: errorMsg });
  }
}
