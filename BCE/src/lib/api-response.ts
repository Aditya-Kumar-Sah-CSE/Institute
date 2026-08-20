import { NextResponse } from 'next/server';

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export function successResponse<T>(data: T, message?: string, status: number = 200) {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
  };
  return NextResponse.json(body, { status });
}

export function errorResponse(
  message: string,
  code: string = 'INTERNAL_SERVER_ERROR',
  status: number = 500,
  field?: string
) {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(field ? { field } : {}),
    },
  };
  return NextResponse.json(body, { status });
}

/**
 * Wraps an async API route handler in a safety sandbox that catches any unexpected runtime errors
 * and guarantees a clean JSON response instead of plain text or HTML.
 */
export function withSafeApiHandler(handler: (request: Request, context?: any) => Promise<Response>) {
  return async (request: Request, context?: any) => {
    try {
      return await handler(request, context);
    } catch (err: any) {
      console.error('[API_UNHANDLED_ERROR]', err);
      const status = err.status || 500;
      const message = err.message || 'An unexpected internal server error occurred.';
      const code = err.code || (status === 403 ? 'FORBIDDEN' : status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL_SERVER_ERROR');
      
      return errorResponse(message, code, status);
    }
  };
}
