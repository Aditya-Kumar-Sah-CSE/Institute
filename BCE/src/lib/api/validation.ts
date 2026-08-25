/**
 * Zod-based Request Validation Utilities
 * 
 * Provides typed validation for request bodies, query params, and path params.
 * Returns structured errors compatible with the AppError hierarchy.
 */

import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from './errors';

/**
 * Validate data against a Zod schema.
 * Throws ValidationError with field-level details on failure.
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors = err.issues.map((e: any) => ({
        field: e.path.join('.') || 'body',
        message: e.message,
      }));
      throw new ValidationError('Request validation failed', fieldErrors);
    }
    throw err;
  }
}

/**
 * Safe parse that returns a result tuple instead of throwing.
 */
export function safeParse<T>(schema: ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: Array<{ field: string; message: string }> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((e: any) => ({
      field: e.path.join('.') || 'body',
      message: e.message,
    })),
  };
}

// ─── Common Reusable Schemas ───

export const zodUUID = z.string().uuid('Must be a valid UUID');
export const zodNonEmptyString = z.string().min(1, 'Must not be empty').max(10000, 'Too long');
export const zodPositiveInt = z.number().int().positive('Must be a positive integer');
export const zodPaginationParams = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Parse and validate JSON body from a Request.
 * Enforces max payload size (default 1MB).
 */
export async function parseBody<T>(request: Request, schema: ZodSchema<T>, maxSizeBytes = 1_048_576): Promise<T> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
    const { PayloadTooLargeError } = await import('./errors');
    throw new PayloadTooLargeError(`${Math.round(maxSizeBytes / 1024)}KB`);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError('Invalid or missing JSON body');
  }

  return validate(schema, body);
}

/**
 * Parse and validate query params from a Request URL.
 */
export function parseQuery<T>(request: Request, schema: ZodSchema<T>): T {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return validate(schema, params);
}
