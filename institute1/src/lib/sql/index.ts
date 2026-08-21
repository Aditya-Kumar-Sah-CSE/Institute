import { Database, SQLExecutionResult, Table, ColumnMetadata } from './types';
import { SAMPLE_DATASETS } from './sampleDatasets';
import { tokenize } from './tokenizer';
import { Parser, ParserError } from './parser';
import { SQLExecutor } from './executor';
import { formatSQL } from './formatter';

export * from './types';
export * from './sampleDatasets';
export * from './tokenizer';
export * from './parser';
export * from './executor';
export * from './formatter';

/**
 * Creates a fresh deep-cloned Database instance from sample dataset key.
 */
export function createDatabase(datasetKey: string = 'employees_departments'): Database {
  const ds = SAMPLE_DATASETS[datasetKey] || SAMPLE_DATASETS.employees_departments;
  return JSON.parse(JSON.stringify(ds));
}

/**
 * Resets a database instance back to default sample state.
 */
export function resetDatabase(datasetKey: string): Database {
  return createDatabase(datasetKey);
}

/**
 * Main entry point: Executes raw SQL string against an in-memory Database object.
 * Returns structured SQLExecutionResult.
 */
export function executeSQL(query: string, database: Database): SQLExecutionResult {
  const startTime = performance.now();
  const trimmed = query.trim();

  if (!trimmed) {
    return {
      success: true,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
      message: 'Empty query'
    };
  }

  try {
    const tokens = tokenize(trimmed);
    const parser = new Parser(tokens);
    const statements = parser.parse();

    if (statements.length === 0) {
      return {
        success: true,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0
      };
    }

    const executor = new SQLExecutor(database);
    let finalResult: SQLExecutionResult = {
      success: true,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0
    };

    for (const stmt of statements) {
      finalResult = executor.execute(stmt);
      if (!finalResult.success) {
        break;
      }
    }

    return finalResult;
  } catch (err: any) {
    const endTime = performance.now();
    let line: number | undefined;
    let column: number | undefined;

    if (err instanceof ParserError) {
      line = err.line;
      column = err.column;
    }

    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: Number((endTime - startTime).toFixed(2)),
      error: {
        message: err.message || 'SQL Execution Error',
        line,
        column
      }
    };
  }
}

/**
 * Extract active tables and schema details from Database.
 */
export function getDatabaseSchema(db: Database) {
  return Object.values(db.tables).map(t => ({
    name: t.name,
    columns: t.columns.map(c => ({
      name: c.name,
      type: c.type,
      primaryKey: c.primaryKey,
      foreignKey: c.foreignKey,
      nullable: c.nullable
    })),
    rowCount: t.rows.length
  }));
}

/**
 * Utility: Convert execution results to CSV format with proper escaping.
 */
export function exportToCSV(columns: ColumnMetadata[], rows: Record<string, any>[]): string {
  if (!columns.length || !rows.length) return '';

  const headers = columns.map(c => `"${c.name.replace(/"/g, '""')}"`).join(',');
  const rowLines = rows.map(r => {
    return columns.map(c => {
      const val = r[c.name];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [headers, ...rowLines].join('\n');
}

/**
 * Utility: Convert execution results to structured JSON.
 */
export function exportToJSON(rows: Record<string, any>[]): string {
  return JSON.stringify(rows, null, 2);
}
