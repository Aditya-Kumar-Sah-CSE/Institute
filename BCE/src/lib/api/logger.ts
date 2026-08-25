/**
 * Structured JSON Logger
 * 
 * Outputs structured logs compatible with Vercel log drain, Datadog, etc.
 * Each log entry includes requestId, method, path, userId, status, durationMs.
 * Warns on slow APIs (> 3s).
 */

export interface LogContext {
  requestId: string;
  method?: string;
  path?: string;
  userId?: string | null;
  [key: string]: unknown;
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatLog(level: LogLevel, message: string, context: LogContext & Record<string, unknown>) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // Remove undefined values for cleaner output
  const cleaned = Object.fromEntries(
    Object.entries(entry).filter(([, v]) => v !== undefined && v !== null)
  );

  return JSON.stringify(cleaned);
}

export const logger = {
  info(message: string, context: LogContext) {
    console.log(formatLog('info', message, context));
  },

  warn(message: string, context: LogContext) {
    console.warn(formatLog('warn', message, context));
  },

  error(message: string, context: LogContext & { error?: unknown }) {
    const errorDetail = context.error instanceof Error
      ? { errorName: context.error.name, errorMessage: context.error.message }
      : context.error
        ? { errorMessage: String(context.error) }
        : {};

    // Never log stack traces in production
    const { error: _raw, ...rest } = context;
    console.error(formatLog('error', message, { ...rest, ...errorDetail }));
  },

  debug(message: string, context: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatLog('debug', message, context));
    }
  },

  /**
   * Log API request completion with performance metrics.
   * Automatically warns on slow APIs.
   */
  apiComplete(context: LogContext & { status: number; durationMs: number }) {
    const { durationMs, status } = context;
    const level: LogLevel = status >= 500 ? 'error' : durationMs > 3000 ? 'warn' : 'info';
    const message = durationMs > 3000
      ? `SLOW_API: ${context.method} ${context.path} took ${durationMs}ms`
      : `${context.method} ${context.path} → ${status} (${durationMs}ms)`;

    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(formatLog(level, message, context));
  },
};
