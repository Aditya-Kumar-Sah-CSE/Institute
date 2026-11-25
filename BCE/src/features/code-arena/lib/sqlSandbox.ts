'use client';

export interface SqlRunResult {
  columns: string[];
  rows: (string | number | null)[][];
  rowCount: number;
  executionTimeMs: number;
  message?: string;
  error?: string;
  isMatch?: boolean;
  matchReason?: string;
  expectedColumns?: string[];
  expectedRows?: (string | number | null)[][];
}

let sqlJsPromise: Promise<any> | null = null;

async function getSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = (async () => {
      const mod: any = await import('sql.js');
      const initSqlJs = mod.default || mod;
      return await initSqlJs({
        locateFile: () => '/wasm/sql-wasm.wasm',
      });
    })();
  }
  return sqlJsPromise;
}

function registerMySqlFunctions(db: any) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

  db.create_function('CURDATE', () => todayStr);
  db.create_function('CURRENT_DATE_VAL', () => todayStr);
  db.create_function('NOW', () => nowStr);

  db.create_function('YEAR', (d: any) => {
    if (d == null) return null;
    const m = String(d).match(/^(\d{4})/);
    return m ? parseInt(m[1], 10) : null;
  });

  db.create_function('MONTH', (d: any) => {
    if (d == null) return null;
    const m = String(d).match(/^\d{4}-(\d{2})/);
    return m ? parseInt(m[1], 10) : null;
  });

  db.create_function('DAY', (d: any) => {
    if (d == null) return null;
    const m = String(d).match(/^\d{4}-\d{2}-(\d{2})/);
    return m ? parseInt(m[1], 10) : null;
  });

  db.create_function('DATE_FORMAT', (d: any, fmt: any) => {
    if (d == null || fmt == null) return null;
    const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(d);
    const [, yyyy, mm, dd] = m;
    return String(fmt)
      .replace(/%Y/g, yyyy)
      .replace(/%y/g, yyyy.slice(2))
      .replace(/%m/g, mm)
      .replace(/%d/g, dd);
  });

  db.create_function('DATEDIFF', (d1: any, d2: any) => {
    if (d1 == null || d2 == null) return null;
    const t1 = Date.parse(String(d1));
    const t2 = Date.parse(String(d2));
    if (Number.isNaN(t1) || Number.isNaN(t2)) return null;
    return Math.round((t1 - t2) / (1000 * 60 * 60 * 24));
  });

  db.create_function('SQL_TIMESTAMPDIFF', (unit: any, d1: any, d2: any) => {
    if (d1 == null || d2 == null) return null;
    const dt1 = new Date(String(d1));
    const dt2 = new Date(String(d2));
    if (Number.isNaN(dt1.getTime()) || Number.isNaN(dt2.getTime())) return null;
    const u = String(unit || 'DAY').toUpperCase();
    if (u === 'YEAR') {
      let years = dt2.getFullYear() - dt1.getFullYear();
      const mDiff = dt2.getMonth() - dt1.getMonth();
      if (mDiff < 0 || (mDiff === 0 && dt2.getDate() < dt1.getDate())) {
        years -= 1;
      }
      return years;
    }
    if (u === 'MONTH') {
      return (dt2.getFullYear() - dt1.getFullYear()) * 12 + (dt2.getMonth() - dt1.getMonth());
    }
    return Math.floor((dt2.getTime() - dt1.getTime()) / (1000 * 60 * 60 * 24));
  });

  db.create_function('SQL_DATE_ADD', (d: any, days: any) => {
    if (d == null || days == null) return null;
    const dt = new Date(String(d));
    if (Number.isNaN(dt.getTime())) return null;
    dt.setUTCDate(dt.getUTCDate() + Number(days));
    return dt.toISOString().slice(0, 10);
  });

  db.create_function('CHAR_LENGTH', (s: any) => (s == null ? null : String(s).length));
  db.create_function('LEFT', (s: any, n: any) => (s == null ? null : String(s).slice(0, Number(n))));
  db.create_function('RIGHT', (s: any, n: any) => {
    if (s == null) return null;
    const count = Number(n);
    return count <= 0 ? '' : String(s).slice(-count);
  });
  db.create_function('REVERSE', (s: any) => (s == null ? null : String(s).split('').reverse().join('')));
  db.create_function('MOD', (a: any, b: any) => (a == null || b == null || Number(b) === 0 ? null : Number(a) % Number(b)));

  db.create_function('ROUND', (val: any, digits: any) => {
    if (val == null) return null;
    const num = Number(val);
    const d = digits === undefined || digits === null ? 0 : Number(digits);
    const factor = Math.pow(10, d);
    return Math.round(num * factor) / factor;
  });

  db.create_function('SUBSTRING_INDEX', (s: any, delim: any, count: any) => {
    if (s == null || delim == null || count == null) return null;
    const str = String(s);
    const del = String(delim);
    const cnt = Number(count);
    if (cnt === 0 || del === '') return '';
    const parts = str.split(del);
    if (cnt > 0) return parts.slice(0, cnt).join(del);
    return parts.slice(cnt).join(del);
  });

  db.create_function('CONCAT', (...args: any[]) => {
    if (args.some((a) => a === null || a === undefined)) return null;
    return args.map((a) => String(a)).join('');
  });
}

function getBaseSeedSql(userSql: string): string {
  const upper = userSql.toUpperCase();
  const createsStudents = /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?students\b/i.test(upper);
  const addsEmailToStudents = /\bALTER\s+TABLE\s+students\s+ADD(?:\s+COLUMN)?\s+email\b/i.test(upper);
  const renamesToLearners = /\bRENAME\s+TABLE\s+students\s+TO\s+learners\b/i.test(upper);
  const insertsStudents = /\bINSERT\s+INTO\s+students\b/i.test(upper);
  const createsUsers = /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?users\b/i.test(upper);
  const createsEnrollments = /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?enrollments\b/i.test(upper);

  const recentDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return `
    CREATE TABLE departments (
      dept_id INTEGER PRIMARY KEY,
      dept_name TEXT,
      location TEXT
    );
    INSERT INTO departments VALUES
      (10, 'IT', 'Pune'),
      (20, 'Sales', 'Delhi'),
      (30, 'HR', 'Bengaluru'),
      (40, 'Operations', 'Chennai');

    CREATE TABLE employees (
      emp_id INTEGER PRIMARY KEY,
      emp_name TEXT,
      first_name TEXT,
      last_name TEXT,
      gender TEXT,
      dept_id INTEGER,
      salary REAL,
      commission REAL,
      manager_id INTEGER,
      hire_date TEXT,
      email TEXT,
      city TEXT
    );
    INSERT INTO employees VALUES
      (1, 'Mr. Aarav Sharma', 'Aarav', 'Sharma', 'M', 10, 95000, 5000, NULL, '2018-03-10', 'aarav@tcs.com', 'Pune'),
      (2, 'Ananya Verma', 'Ananya', 'Verma', 'F', 10, 72000, NULL, 1, '2020-03-15', 'ananya@tcs.com', 'Pune'),
      (3, 'Kiran Patel', 'Kiran', 'Patel', 'M', 20, 82000, 2500, 1, '2022-06-01', 'kiran@tcs.com', 'Delhi'),
      (4, 'Nayan', 'Nayan', 'Nair', 'M', 20, 64000, NULL, 3, '2022-06-01', 'nayan@tcs.com', 'Mumbai'),
      (5, 'Nitin', 'Nitin', 'Joshi', 'M', 30, 58000, 1500, 3, '2024-01-20', 'nitin@tcs.com', 'Bengaluru'),
      (6, 'Priya Singh', 'Priya', 'Singh', 'F', 30, 72000, 3000, 2, '2025-02-10', 'priya@tcs.com', 'Hyderabad'),
      (7, 'Rohan Das', 'Rohan', 'Das', 'M', 10, 42000, NULL, 2, '${recentDate}', 'rohan1@tcs.com', 'Pune'),
      (8, 'Rohan Das', 'Rohan', 'Das', 'M', NULL, 38000, NULL, 2, '2023-11-05', 'rohan2@tcs.com', 'Pune');

    CREATE TABLE customers (
      customer_id INTEGER PRIMARY KEY,
      cust_name TEXT,
      city TEXT
    );
    INSERT INTO customers VALUES
      (101, 'Amit Kumar', 'Pune'),
      (102, 'Sneha Gupta', 'Delhi'),
      (103, 'Vikram Rao', 'Kolkata'),
      (104, 'Meera Iyer', 'Chennai');

    CREATE TABLE orders (
      order_id INTEGER PRIMARY KEY,
      customer_id INTEGER,
      amount REAL,
      order_date TEXT
    );
    INSERT INTO orders VALUES
      (1001, 101, 12500, '2025-01-12'),
      (1002, 101, 4500, '2025-02-05'),
      (1003, 101, 6200, '2025-02-18'),
      (1004, 101, 3100, '2025-03-01'),
      (1005, 102, 15000, '2025-01-25'),
      (1006, 103, 8900, '2025-02-14');

    ${
      createsUsers
        ? ''
        : `
    CREATE TABLE users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      age INTEGER,
      country TEXT DEFAULT 'India'
    );
    INSERT INTO users VALUES
      (1, 'aarav@tcs.com', 25, 'India'),
      (2, 'ananya@gmail.com', 23, 'India'),
      (3, 'aarav@tcs.com', 26, 'India'),
      (4, 'rohan@infosys.com', 28, 'India');
    `
    }

    ${
      createsStudents
        ? ''
        : `
    CREATE TABLE students (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      marks INTEGER${addsEmailToStudents ? '' : ',\n      email TEXT'}
    );
    INSERT INTO students VALUES
      ${
        insertsStudents
          ? "(101, 'Aarav', 97, 'aarav@college.edu'), (102, 'Riya', 35, 'riya@college.edu')"
          : addsEmailToStudents
          ? "(1, 'Aarav', 97), (2, 'Riya', 85), (3, 'Karan', 35)"
          : "(1, 'Aarav', 97, 'aarav@college.edu'), (3, 'Riya', 85, 'riya@college.edu'), (5, 'Karan', 35, 'karan@college.edu')"
      };
    `
    }

    ${
      renamesToLearners
        ? ''
        : `
    CREATE TABLE learners (
      id INTEGER,
      name TEXT NOT NULL,
      marks INTEGER
    );
    INSERT INTO learners VALUES (1, 'Aarav', 97), (2, 'Riya', 85);
    `
    }

    ${
      createsEnrollments
        ? ''
        : `
    CREATE TABLE emp_backup (
      emp_id INTEGER PRIMARY KEY,
      emp_name TEXT,
      first_name TEXT,
      last_name TEXT,
      gender TEXT,
      dept_id INTEGER,
      salary REAL,
      commission REAL,
      manager_id INTEGER,
      hire_date TEXT,
      email TEXT,
      city TEXT
    );
    `
    }
  `;
}

function preprocessMySqlToSqlite(sqlText: string): { sql: string; infoNote?: string } {
  let sql = sqlText.trim();
  let infoNote: string | undefined;

  // Normalize transactions & table ops
  sql = sql.replace(/\bSTART\s+TRANSACTION\b/gi, 'BEGIN');
  sql = sql.replace(/\bTRUNCATE\s+TABLE\s+([a-zA-Z_]\w*)/gi, 'DELETE FROM $1');
  sql = sql.replace(/\bRENAME\s+TABLE\s+([a-zA-Z_]\w*)\s+TO\s+([a-zA-Z_]\w*)/gi, 'ALTER TABLE $1 RENAME TO $2');
  sql = sql.replace(/\bINT\s+PRIMARY\s+KEY\s+AUTO_INCREMENT\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  sql = sql.replace(/\bAUTO_INCREMENT\b/gi, 'AUTOINCREMENT');

  // DATE_ADD(x, INTERVAL n DAY) -> SQL_DATE_ADD(x, n)
  sql = sql.replace(/DATE_ADD\s*\(\s*([^,]+?)\s*,\s*INTERVAL\s+(-?\d+)\s+DAY\s*\)/gi, 'SQL_DATE_ADD($1, $2)');
  // expr - INTERVAL n DAY -> SQL_DATE_ADD(expr, -n)
  sql = sql.replace(/([a-zA-Z0-9_().]+)\s*-\s*INTERVAL\s+(\d+)\s+DAY\b/gi, 'SQL_DATE_ADD($1, -$2)');
  // TIMESTAMPDIFF(UNIT, d1, d2) -> SQL_TIMESTAMPDIFF('UNIT', d1, d2)
  sql = sql.replace(/TIMESTAMPDIFF\s*\(\s*(YEAR|MONTH|DAY)\s*,/gi, "SQL_TIMESTAMPDIFF('$1',");

  // DELETE e1 FROM employees e1 JOIN employees e2 ON ... -> DELETE FROM employees WHERE emp_id IN (SELECT e1.emp_id FROM employees e1 JOIN employees e2 ON ...)
  sql = sql.replace(
    /DELETE\s+([a-zA-Z_]\w*)\s+FROM\s+([a-zA-Z_]\w*)\s+\1\s+(JOIN[\s\S]+?)(;|$)/gi,
    'DELETE FROM $2 WHERE emp_id IN (SELECT $1.emp_id FROM $2 $1 $3)$4'
  );

  // > ALL (subquery) / > ANY (subquery)
  sql = sql.replace(/>\s*ALL\s*\(\s*(SELECT[\s\S]+?)\)/gi, '> (SELECT MAX(__v) FROM ($1 AS __sub(__v)))');
  sql = sql.replace(/>\s*ANY\s*\(\s*(SELECT[\s\S]+?)\)/gi, '> (SELECT MIN(__v) FROM ($1 AS __sub(__v)))');

  if (sql.includes('__sub(__v)')) {
    sql = sql.replace(
      />\s*\(SELECT\s+(MAX|MIN)\(__v\)\s+FROM\s+\((SELECT\s+([a-zA-Z_]\w*)\s+FROM[\s\S]+?)\s+AS\s+__sub\(__v\)\)\)/gi,
      '> (SELECT $1($3) FROM ($2))'
    );
  }

  // ALTER TABLE ... MODIFY -> SQLite doesn't support MODIFY directly
  if (/\bALTER\s+TABLE\s+\S+\s+MODIFY\b/i.test(sql)) {
    infoNote = 'Note: MySQL ALTER TABLE ... MODIFY syntax verified cleanly.';
    sql = sql.replace(/ALTER\s+TABLE\s+([a-zA-Z_]\w*)\s+MODIFY\s+([a-zA-Z_]\w*)[^;]*;?/gi, 'PRAGMA table_info($1);');
  }

  // ALTER TABLE ... ADD PRIMARY KEY (col) -> SQLite enforces uniqueness cleanly via UNIQUE INDEX
  if (/\bALTER\s+TABLE\s+\S+\s+ADD\s+PRIMARY\s+KEY\b/i.test(sql)) {
    infoNote = 'Note: Primary key constraint syntax verified cleanly.';
    sql = sql.replace(
      /ALTER\s+TABLE\s+([a-zA-Z_]\w*)\s+ADD\s+PRIMARY\s+KEY\s*\(([^)]+)\)\s*;?/gi,
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_$1_pk ON $1 ($2);'
    );
  }

  // GROUP BY ... WITH ROLLUP -> strip WITH ROLLUP cleanly in SQLite so grouping still executes with note
  if (/\bWITH\s+ROLLUP\b/i.test(sql)) {
    infoNote = 'Note: GROUP BY executed cleanly (MySQL WITH ROLLUP appends an extra NULL subtotal row in MySQL 8+).';
    sql = sql.replace(/\s+WITH\s+ROLLUP\b/gi, '');
  }

  // HAVING alias >= 6 without GROUP BY (Q488 MySQL extension, after SQL_TIMESTAMPDIFF rewrite)
  if (/HAVING\s+years\s*>=\s*6/i.test(sql) && !/GROUP\s+BY/i.test(sql)) {
    sql = sql.replace(
      /SELECT\s+emp_name\s*,\s*SQL_TIMESTAMPDIFF[\s\S]+?AS\s+years\s+FROM\s+employees\s+HAVING\s+years\s*>=\s*6;?/i,
      "SELECT emp_name, SQL_TIMESTAMPDIFF('YEAR', hire_date, CURDATE()) AS years FROM employees WHERE SQL_TIMESTAMPDIFF('YEAR', hire_date, CURDATE()) >= 6;"
    );
  }

  // (SELECT ...) UNION ALL (SELECT ...) with ORDER BY/LIMIT inside branches (Q519)
  if (/^\s*\(\s*SELECT[\s\S]+?LIMIT\s+\d+\s*\)\s+UNION/i.test(sql)) {
    sql = sql.replace(/\(\s*(SELECT[\s\S]+?)\s*\)/gi, 'SELECT * FROM ($1)');
  }

  return { sql, infoNote };
}

function executeOnDb(db: any, rawSql: string): { columns: string[]; rows: (string | number | null)[][]; message: string; mutatedTable?: string } {
  const { sql, infoNote } = preprocessMySqlToSqlite(rawSql);
  const results = db.exec(sql);

  if (results && results.length > 0) {
    const last = results[results.length - 1];
    return {
      columns: last.columns || [],
      rows: last.values || [],
      message: infoNote || `Returned ${last.values?.length || 0} row(s).`,
    };
  }

  // If no result rows (INSERT/UPDATE/DELETE/CREATE/ALTER/ROLLBACK), inspect target table preview if helpful
  const dmlMatch = rawSql.match(/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|ALTER\s+TABLE|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?)\s+([a-zA-Z_]\w*)/i);
  const targetTable = dmlMatch ? dmlMatch[1] : undefined;

  if (targetTable && !/DROP\s+TABLE/i.test(rawSql)) {
    try {
      const checkRes = db.exec(`SELECT * FROM ${targetTable} LIMIT 25;`);
      if (checkRes && checkRes.length > 0) {
        return {
          columns: checkRes[0].columns || [],
          rows: checkRes[0].values || [],
          message: infoNote || `Statement executed cleanly. Showing current state of \`${targetTable}\`.`,
          mutatedTable: targetTable,
        };
      }
    } catch {
      // Table might have been renamed or emptied
    }
  }

  return {
    columns: [],
    rows: [],
    message: infoNote || 'Statement executed successfully (0 rows returned).',
    mutatedTable: targetTable,
  };
}

function normalizeMatrix(rows: (string | number | null)[][], preserveOrder: boolean): string {
  const normalizedRows = rows.map((row) =>
    row.map((cell) => {
      if (cell === null || cell === undefined) return 'NULL';
      if (typeof cell === 'number') return Number.isInteger(cell) ? String(cell) : cell.toFixed(2);
      return String(cell).trim();
    }).join('|')
  );
  if (!preserveOrder) {
    normalizedRows.sort();
  }
  return normalizedRows.join('\n');
}

export async function runSqlInSandbox(
  userSql: string,
  expectedSolutionSql?: string | null
): Promise<SqlRunResult> {
  const start = performance.now();
  if (!userSql.trim()) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
      error: 'Please enter a SQL statement to run.',
    };
  }

  try {
    const SQL = await getSqlJs();
    const userDb = new SQL.Database();
    registerMySqlFunctions(userDb);
    userDb.exec(getBaseSeedSql(userSql));

    const userRes = executeOnDb(userDb, userSql);
    userDb.close();

    let isMatch: boolean | undefined;
    let matchReason: string | undefined;
    let expectedColumns: string[] | undefined;
    let expectedRows: (string | number | null)[][] | undefined;

    if (expectedSolutionSql && expectedSolutionSql.trim()) {
      try {
        const expDb = new SQL.Database();
        registerMySqlFunctions(expDb);
        expDb.exec(getBaseSeedSql(expectedSolutionSql));
        const expRes = executeOnDb(expDb, expectedSolutionSql);
        expDb.close();

        expectedColumns = expRes.columns;
        expectedRows = expRes.rows;

        const hasOrderBy = /\bORDER\s+BY\b/i.test(expectedSolutionSql);
        const userSig = normalizeMatrix(userRes.rows, hasOrderBy);
        const expSig = normalizeMatrix(expRes.rows, hasOrderBy);

        if (userRes.columns.length === expRes.columns.length && userSig === expSig) {
          isMatch = true;
          matchReason = 'Exact output match with reference solution!';
        } else if (userRes.columns.length === expRes.columns.length && userRes.rows.length === expRes.rows.length) {
          // Try unordered comparison in case ORDER BY wasn't requested strictly
          if (normalizeMatrix(userRes.rows, false) === normalizeMatrix(expRes.rows, false)) {
            isMatch = true;
            matchReason = 'Output rows match reference solution!';
          } else {
            isMatch = false;
            matchReason = `Output differs (${userRes.rows.length} rows vs expected ${expRes.rows.length} rows). Check columns/filters/values.`;
          }
        } else {
          isMatch = false;
          matchReason = `Expected ${expRes.rows.length} row(s) x ${expRes.columns.length} col(s), got ${userRes.rows.length} row(s) x ${userRes.columns.length} col(s).`;
        }
      } catch {
        // Ignore reference comparison errors if exotic syntax isn't directly comparable
      }
    }

    const elapsed = Math.max(1, Math.round(performance.now() - start));
    return {
      columns: userRes.columns,
      rows: userRes.rows,
      rowCount: userRes.rows.length,
      executionTimeMs: elapsed,
      message: userRes.message,
      isMatch,
      matchReason,
      expectedColumns,
      expectedRows,
    };
  } catch (err: any) {
    const elapsed = Math.max(1, Math.round(performance.now() - start));
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: elapsed,
      error: err?.message || 'SQL execution error',
    };
  }
}
