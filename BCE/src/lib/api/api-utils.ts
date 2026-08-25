/**
 * withApiHandler — Composable API Route Wrapper
 * 
 * Chains: Request ID → Auth → Rate Limit → Validation → Handler → Error Catch → Logging
 * 
 * Usage:
 *   export const GET = withApiHandler({ auth: 'required', rateLimit: 'standard' }, async (req, ctx) => {
 *     return ctx.success({ items: [...] });
 *   });
 */

import { NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';
import { checkRateLimit, type RateLimitTier, RATE_LIMIT_TIERS } from '@/lib/rate-limit';
import { AppError, AuthenticationError, toSafeError, RateLimitError } from './errors';
import { logger, type LogContext } from './logger';

// ─── Types ───

export type AuthMode = 'public' | 'required' | 'optional';

export interface ApiHandlerConfig {
  /** Auth requirement: 'public' (no auth), 'required' (401 if missing), 'optional' (user may be null) */
  auth?: AuthMode;
  /** Rate limit tier name or false to disable */
  rateLimit?: RateLimitTier | false;
  /** Maximum request body size in bytes (default: 1MB) */
  maxBodySize?: number;
}

export interface ApiContext {
  requestId: string;
  user: { id: string; email?: string } | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
  /** Return a standardized success response */
  success: <T>(data: T, meta?: Record<string, unknown>, status?: number) => NextResponse;
  /** Return a standardized error response */
  error: (message: string, code?: string, status?: number) => NextResponse;
}

type ApiHandler = (request: Request, context: ApiContext) => Promise<NextResponse | Response>;

// ─── Response Builders ───

function buildSuccessResponse<T>(data: T, requestId: string, meta?: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: meta || {},
      error: null,
      requestId,
    },
    {
      status,
      headers: {
        'X-Request-Id': requestId,
        'X-Content-Type-Options': 'nosniff',
      },
    }
  );
}

function buildErrorResponse(message: string, code: string, requestId: string, status = 500, retryAfter?: number): NextResponse {
  const headers: Record<string, string> = {
    'X-Request-Id': requestId,
    'X-Content-Type-Options': 'nosniff',
  };
  if (retryAfter) {
    headers['Retry-After'] = String(retryAfter);
  }

  return NextResponse.json(
    {
      success: false,
      data: null,
      meta: {},
      error: { code, message },
      requestId,
    },
    { status, headers }
  );
}

// ─── Main Wrapper ───

export function withApiHandler(config: ApiHandlerConfig, handler: ApiHandler) {
  const { auth = 'required', rateLimit: rateLimitTier = false, maxBodySize } = config;

  return async (request: Request, routeContext?: any): Promise<Response> => {
    const startTime = Date.now();
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    const method = request.method;
    const path = new URL(request.url).pathname;
    const logCtx: LogContext = { requestId, method, path };

    try {
      // 1. Auth
      let user: { id: string; email?: string } | null = null;
      let supabase = await createClient();

      if (auth !== 'public') {
        const authUser = await getUser();
        if (!authUser && auth === 'required') {
          throw new AuthenticationError();
        }
        if (authUser) {
          user = { id: authUser.id, email: authUser.email };
          logCtx.userId = authUser.id;
        }
      }

      // 2. Rate Limit
      if (rateLimitTier && user) {
        const tier = RATE_LIMIT_TIERS[rateLimitTier];
        if (tier) {
          const key = `${rateLimitTier}:${path}:${user.id}`;
          const result = checkRateLimit(key, tier.limit, tier.windowMs);
          if (!result.success) {
            const retryAfter = Math.ceil((result.resetAt! - Date.now()) / 1000);
            throw new RateLimitError(Math.max(retryAfter, 1));
          }
        }
      } else if (rateLimitTier && !user) {
        // Rate limit by IP for unauthenticated requests
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        const tier = RATE_LIMIT_TIERS[rateLimitTier];
        if (tier) {
          const key = `${rateLimitTier}:${path}:ip:${ip}`;
          const result = checkRateLimit(key, tier.limit, tier.windowMs);
          if (!result.success) {
            const retryAfter = Math.ceil((result.resetAt! - Date.now()) / 1000);
            throw new RateLimitError(Math.max(retryAfter, 1));
          }
        }
      }

      // 3. Execute handler
      const ctx: ApiContext = {
        requestId,
        user,
        supabase,
        success: (data, meta, status) => buildSuccessResponse(data, requestId, meta, status),
        error: (message, code = 'BAD_REQUEST', status = 400) => buildErrorResponse(message, code, requestId, status),
      };

      const response = await handler(request, ctx);

      // 4. Log completion
      const durationMs = Date.now() - startTime;
      const status = response instanceof NextResponse ? response.status : 200;
      logger.apiComplete({ ...logCtx, status, durationMs });

      // Inject request ID header into response if not already present
      if (response instanceof NextResponse && !response.headers.get('x-request-id')) {
        response.headers.set('X-Request-Id', requestId);
      }

      return response;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const safe = toSafeError(err);

      logger.error('API handler error', {
        ...logCtx,
        status: safe.status,
        durationMs,
        errorCode: safe.code,
        error: err,
      });

      return buildErrorResponse(safe.message, safe.code, requestId, safe.status, safe.retryAfter);
    }
  };
}
