import { NextRequest, NextResponse } from 'next/server';
import { executeSQL, createDatabase, Database } from '@/lib/sql';

export async function POST(req: NextRequest) {
  try {
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
          error: { message: 'Missing or invalid "query" parameter in request body.' }
        },
        { status: 400 }
      );
    }

    const activeDb: Database = database || createDatabase(dataset);
    const result = executeSQL(query, activeDb);

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: { message: err.message || 'Server error processing SQL query.' }
      },
      { status: 500 }
    );
  }
}
