import { NextResponse } from 'next/server';

// ─── Interfaces ───

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  error: null;
  requestId?: string;
  message?: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  meta?: Record<string, unknown>;
  error: ApiErrorDetail;
  requestId?: string;
}

// ─── Response Builders ───

export function successResponse<T>(data: T, message?: string, status: number = 200, requestId?: string) {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    meta: {},
    error: null,
    ...(message ? { message } : {}),
    ...(requestId ? { requestId } : {}),
  };
  const headers: Record<string, string> = {};
  if (requestId) headers['X-Request-Id'] = requestId;

  return NextResponse.json(body, { status, headers });
}

export function errorResponse(
  message: string,
  code: string = 'INTERNAL_SERVER_ERROR',
  status: number = 500,
  field?: string,
  requestId?: string,
) {
  const body: ApiErrorResponse = {
    success: false,
    data: null,
    meta: {},
    error: {
      code,
      message,
      ...(field ? { field } : {}),
    },
    ...(requestId ? { requestId } : {}),
  };
  const headers: Record<string, string> = {};
  if (requestId) headers['X-Request-Id'] = requestId;

  return NextResponse.json(body, { status, headers });
}

/**
 * Wraps an async API route handler in a safety sandbox that catches any unexpected runtime errors
 * and guarantees a clean JSON response instead of plain text or HTML.
 */
export function withSafeApiHandler(handler: (request: Request, context?: any) => Promise<Response>) {
  return async (request: Request, context?: any) => {
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    try {
      return await handler(request, context);
    } catch (err: any) {
      console.error('[API_UNHANDLED_ERROR]', err);
      const status = err.status || 500;
      const isProduction = process.env.NODE_ENV === 'production';
      const message = isProduction
        ? 'An unexpected internal error occurred.'
        : (err.message || 'An unexpected internal server error occurred.');
      const code = err.code || (status === 403 ? 'FORBIDDEN' : status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL_SERVER_ERROR');
      
      return errorResponse(message, code, status, undefined, requestId);
    }
  };
}
