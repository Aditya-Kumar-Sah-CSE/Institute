import { NextRequest, NextResponse } from 'next/server';
import { executeSQL, createDatabase, Database } from '@/lib/sql';
import { getUser } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    // ── Authentication ──
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0,
          error: { code: 'UNAUTHENTICATED', message: 'Authentication required to execute SQL queries.' },
          requestId,
        },
        { status: 401, headers: { 'X-Request-Id': requestId } }
      );
    }

    // ── Rate limit (sensitive tier: 15/min) ──
    const { checkRateLimit } = await import('@/lib/rate-limit');
    const rl = checkRateLimit(`sql:${user.id}`, 15, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        {
          success: false,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0,
          error: { code: 'RATE_LIMIT_EXCEEDED', message: rl.error },
          requestId,
        },
        {
          status: 429,
          headers: {
            'X-Request-Id': requestId,
            'Retry-After': String(rl.retryAfterSeconds || 60),
          },
        }
      );
    }

    const body = await req.json();
    const { query, dataset = 'employees_departments', database } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        {
          success: false,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0,
          error: { code: 'VALIDATION_ERROR', message: 'Missing or invalid "query" parameter in request body.' },
          requestId,
        },
        { status: 400, headers: { 'X-Request-Id': requestId } }
      );
    }

    // Enforce max query length to prevent abuse
    if (query.length > 10_000) {
      return NextResponse.json(
        {
          success: false,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0,
          error: { code: 'VALIDATION_ERROR', message: 'Query length exceeds maximum of 10,000 characters.' },
          requestId,
        },
        { status: 400, headers: { 'X-Request-Id': requestId } }
      );
    }

    const activeDb: Database = database || createDatabase(dataset);
    const result = executeSQL(query, activeDb);

    return NextResponse.json(
      { ...result, requestId },
      { status: 200, headers: { 'X-Request-Id': requestId } }
    );
  } catch (err: any) {
    console.error('[SQL_EXECUTE_ERROR]', err);
    const isProduction = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: isProduction ? 'Server error processing SQL query.' : (err.message || 'Server error processing SQL query.'),
        },
        requestId,
      },
      { status: 500, headers: { 'X-Request-Id': requestId } }
    );
  }
}
