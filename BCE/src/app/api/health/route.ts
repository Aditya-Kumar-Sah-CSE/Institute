import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/health — API health and readiness check
 * 
 * Returns service status, uptime, and optional DB connectivity.
 * Public endpoint — no auth required.
 */
export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const { searchParams } = new URL(request.url);
  const includeDb = searchParams.get('db') === 'true';

  const healthResponse: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
  };

  // Optional: check DB connectivity
  if (includeDb) {
    try {
      const supabase = await createClient();
      const start = Date.now();
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const dbLatencyMs = Date.now() - start;

      healthResponse.database = {
        status: error ? 'error' : 'connected',
        latencyMs: dbLatencyMs,
        ...(error ? { error: error.message } : {}),
      };
    } catch (err: any) {
      healthResponse.database = {
        status: 'unreachable',
        error: 'Could not connect to database',
      };
    }
  }

  return NextResponse.json(
    {
      success: true,
      data: healthResponse,
      meta: {},
      error: null,
      requestId,
    },
    {
      status: 200,
      headers: {
        'X-Request-Id': requestId,
        'Cache-Control': 'no-cache, no-store',
      },
    }
  );
}
