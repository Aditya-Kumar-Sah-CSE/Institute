/**
 * Centralized API Error Classes
 * 
 * Typed error hierarchy for consistent HTTP error responses.
 * Each error carries a machine-readable `code`, HTTP `status`, and safe `message`.
 * Stack traces and internal details are NEVER sent to clients.
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly field?: string;

  constructor(message: string, code: string, status: number, field?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.field = field;
  }
}

export class ValidationError extends AppError {
  public readonly errors: Array<{ field: string; message: string }>;

  constructor(message: string, errors: Array<{ field: string; message: string }> = []) {
    super(message, 'VALIDATION_ERROR', 422);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHENTICATED', 401);
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to access this resource') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', message?: string) {
    super(message || `${resource} not found`, 'RESOURCE_NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists or conflicts with current state') {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`Too many requests. Please wait ${retryAfterSeconds} seconds.`, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(maxSizeDescription = '1MB') {
    super(`Request payload exceeds maximum allowed size (${maxSizeDescription})`, 'PAYLOAD_TOO_LARGE', 413);
    this.name = 'PayloadTooLargeError';
  }
}

/**
 * Safe error message extractor for production.
 * Strips internal details from non-AppError exceptions.
 */
export function toSafeError(err: unknown): { code: string; message: string; status: number; field?: string; retryAfter?: number } {
  if (err instanceof RateLimitError) {
    return { code: err.code, message: err.message, status: err.status, retryAfter: err.retryAfterSeconds };
  }
  if (err instanceof ValidationError) {
    const detail = err.errors.length > 0
      ? err.errors.map(e => `${e.field}: ${e.message}`).join('; ')
      : err.message;
    return { code: err.code, message: detail, status: err.status };
  }
  if (err instanceof AppError) {
    return { code: err.code, message: err.message, status: err.status, field: err.field };
  }

  // Unknown errors: NEVER leak internal details
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: isProduction ? 'An unexpected internal error occurred.' : (err instanceof Error ? err.message : 'Unknown error'),
    status: 500,
  };
}
