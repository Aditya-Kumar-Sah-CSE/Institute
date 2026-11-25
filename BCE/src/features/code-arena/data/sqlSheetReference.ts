export interface SqlQuestionClause {
  code: string;
  meaning: string;
}

export interface SqlSheetQuestion {
  id?: string;
  question_number: number;
  type: 'MCQ' | 'QUERY';
  section: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  question: string;
  options?: Record<string, string> | null;
  correct_option?: string | null;
  correct_answer?: string | null;
  solution_sql?: string | null;
  basic_concepts: string[];
  explanation_points: string[];
  incorrect_options?: Record<string, string>;
  step_by_step: string[];
  clause_breakdown: SqlQuestionClause[];
}

export interface SqlQuestionProgress {
  question_number: number;
  question_type: 'MCQ' | 'QUERY';
  is_solved: boolean;
  is_bookmarked: boolean;
  selected_option?: string | null;
  submitted_sql?: string | null;
  attempts: number;
  xp_awarded?: number;
  solved_at?: string | null;
}

export interface PracticeTableSchema {
  name: string;
  description: string;
  columns: { name: string; type: string; key?: 'PK' | 'FK' | 'UQ'; note?: string }[];
  sampleRows: Record<string, string | number | null>[];
}

export const PRACTICE_TABLES: PracticeTableSchema[] = [
  {
    name: 'employees',
    description: 'Core employee directory (includes optional interview columns first_name, last_name, gender, commission, email).',
    columns: [
      { name: 'emp_id', type: 'INT', key: 'PK' },
      { name: 'emp_name', type: 'VARCHAR(50)' },
      { name: 'dept_id', type: 'INT', key: 'FK', note: '-> departments.dept_id' },
      { name: 'salary', type: 'DECIMAL(10,2)' },
      { name: 'manager_id', type: 'INT', key: 'FK', note: '-> employees.emp_id' },
      { name: 'hire_date', type: 'DATE' },
      { name: 'city', type: 'VARCHAR(30)' },
      { name: 'first_name', type: 'VARCHAR(30)', note: 'Extended interview column' },
      { name: 'last_name', type: 'VARCHAR(30)', note: 'Extended interview column' },
      { name: 'gender', type: 'CHAR(1)', note: "'M' / 'F'" },
      { name: 'commission', type: 'DECIMAL(10,2)', note: 'Nullable' },
      { name: 'email', type: 'VARCHAR(100)' },
    ],
    sampleRows: [
      { emp_id: 1, emp_name: 'Mr. Aarav Sharma', dept_id: 10, salary: 95000, manager_id: null, hire_date: '2018-03-10', city: 'Pune', gender: 'M', commission: 5000 },
      { emp_id: 2, emp_name: 'Ananya Verma', dept_id: 10, salary: 72000, manager_id: 1, hire_date: '2020-03-15', city: 'Pune', gender: 'F', commission: null },
      { emp_id: 3, emp_name: 'Kiran Patel', dept_id: 20, salary: 82000, manager_id: 1, hire_date: '2022-06-01', city: 'Delhi', gender: 'M', commission: 2500 },
      { emp_id: 4, emp_name: 'Nayan Nair', dept_id: 20, salary: 64000, manager_id: 3, hire_date: '2022-06-01', city: 'Mumbai', gender: 'M', commission: null },
      { emp_id: 5, emp_name: 'Nitin Joshi', dept_id: 30, salary: 58000, manager_id: 3, hire_date: '2024-01-20', city: 'Bengaluru', gender: 'M', commission: 1500 },
      { emp_id: 6, emp_name: 'Priya Singh', dept_id: 30, salary: 72000, manager_id: 2, hire_date: '2025-02-10', city: 'Hyderabad', gender: 'F', commission: 3000 },
      { emp_id: 7, emp_name: 'Rohan Das', dept_id: 10, salary: 42000, manager_id: 2, hire_date: '2026-10-15', city: 'Pune', gender: 'M', commission: null },
      { emp_id: 8, emp_name: 'Rohan Das', dept_id: 10, salary: 38000, manager_id: 2, hire_date: '2023-11-05', city: 'Pune', gender: 'M', commission: null },
    ],
  },
  {
    name: 'departments',
    description: 'Company departments and their office locations (includes dept 40 Operations with 0 employees for anti-join practice).',
    columns: [
      { name: 'dept_id', type: 'INT', key: 'PK' },
      { name: 'dept_name', type: 'VARCHAR(50)' },
      { name: 'location', type: 'VARCHAR(40)' },
    ],
    sampleRows: [
      { dept_id: 10, dept_name: 'IT', location: 'Pune' },
      { dept_id: 20, dept_name: 'Sales', location: 'Delhi' },
      { dept_id: 30, dept_name: 'HR', location: 'Bengaluru' },
      { dept_id: 40, dept_name: 'Operations', location: 'Chennai' },
    ],
  },
  {
    name: 'customers',
    description: 'Customer master records across major Indian cities.',
    columns: [
      { name: 'customer_id', type: 'INT', key: 'PK' },
      { name: 'cust_name', type: 'VARCHAR(50)' },
      { name: 'city', type: 'VARCHAR(30)' },
    ],
    sampleRows: [
      { customer_id: 101, cust_name: 'Amit Kumar', city: 'Pune' },
      { customer_id: 102, cust_name: 'Sneha Gupta', city: 'Delhi' },
      { customer_id: 103, cust_name: 'Vikram Rao', city: 'Kolkata' },
      { customer_id: 104, cust_name: 'Meera Iyer', city: 'Chennai' },
    ],
  },
  {
    name: 'orders',
    description: 'Customer order history used for aggregation, date filtering, running totals, and Jan/Feb interview queries.',
    columns: [
      { name: 'order_id', type: 'INT', key: 'PK' },
      { name: 'customer_id', type: 'INT', key: 'FK', note: '-> customers.customer_id' },
      { name: 'amount', type: 'DECIMAL(10,2)' },
      { name: 'order_date', type: 'DATE' },
    ],
    sampleRows: [
      { order_id: 1001, customer_id: 101, amount: 12500, order_date: '2025-01-12' },
      { order_id: 1002, customer_id: 101, amount: 4500, order_date: '2025-02-05' },
      { order_id: 1003, customer_id: 101, amount: 6200, order_date: '2025-02-18' },
      { order_id: 1004, customer_id: 101, amount: 3100, order_date: '2025-03-01' },
      { order_id: 1005, customer_id: 102, amount: 15000, order_date: '2025-01-25' },
      { order_id: 1006, customer_id: 103, amount: 8900, order_date: '2025-02-14' },
    ],
  },
  {
    name: 'users',
    description: 'Registered portal users (includes duplicate email example for Q438 and domain extraction Q500).',
    columns: [
      { name: 'user_id', type: 'INT', key: 'PK' },
      { name: 'email', type: 'VARCHAR(100)', key: 'UQ' },
      { name: 'age', type: 'INT' },
      { name: 'country', type: 'VARCHAR(30)' },
    ],
    sampleRows: [
      { user_id: 1, email: 'aarav@tcs.com', age: 25, country: 'India' },
      { user_id: 2, email: 'ananya@gmail.com', age: 23, country: 'India' },
      { user_id: 3, email: 'aarav@tcs.com', age: 26, country: 'India' },
      { user_id: 4, email: 'rohan@infosys.com', age: 28, country: 'India' },
    ],
  },
];

export const DIALECT_NOTES = [
  {
    topic: 'Limit Rows',
    mysqlPg: 'LIMIT n',
    sqlServer: 'SELECT TOP n',
    oracle: 'FETCH FIRST n ROWS ONLY',
  },
  {
    topic: 'Current Date & Time',
    mysqlPg: 'NOW() / CURDATE()',
    sqlServer: 'GETDATE()',
    oracle: 'SYSDATE',
  },
  {
    topic: 'NULL Replacement',
    mysqlPg: 'IFNULL(a, b) / COALESCE(a, b)',
    sqlServer: 'ISNULL(a, b) / COALESCE(a, b)',
    oracle: 'NVL(a, b) / COALESCE(a, b)',
  },
  {
    topic: 'Set Difference',
    mysqlPg: 'EXCEPT (MySQL 8.0.31+ / PG)',
    sqlServer: 'EXCEPT',
    oracle: 'MINUS',
  },
  {
    topic: 'Modify Column Type',
    mysqlPg: 'ALTER TABLE t MODIFY col TYPE',
    sqlServer: 'ALTER TABLE t ALTER COLUMN col TYPE',
    oracle: 'ALTER TABLE t MODIFY col TYPE',
  },
];

export const QUICK_REVISION_CHEAT_SHEET = [
  {
    topic: 'Clause order (written)',
    summary: 'SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT',
  },
  {
    topic: 'Execution order',
    summary: 'FROM/JOIN, WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY, LIMIT',
  },
  {
    topic: 'DDL / DML / DCL / TCL',
    summary: 'CREATE ALTER DROP TRUNCATE | INSERT UPDATE DELETE | GRANT REVOKE | COMMIT ROLLBACK SAVEPOINT',
  },
  {
    topic: 'DELETE vs TRUNCATE vs DROP',
    summary: 'DELETE: rows with WHERE, can rollback. TRUNCATE: all rows, fast, DDL. DROP: table gone.',
  },
  {
    topic: 'WHERE vs HAVING',
    summary: 'WHERE filters rows before grouping. HAVING filters groups after aggregation.',
  },
  {
    topic: 'Joins',
    summary: 'INNER (matches), LEFT (all left), RIGHT (all right), FULL (all both), CROSS (product), SELF (same table)',
  },
  {
    topic: 'Keys',
    summary: 'Primary (unique, not null), Foreign (references PK), Unique, Composite, Candidate, Super, Alternate',
  },
  {
    topic: 'Normalization',
    summary: '1NF atomic values; 2NF no partial dependency; 3NF no transitive dependency; BCNF determinant = candidate key',
  },
  {
    topic: 'ACID',
    summary: 'Atomicity, Consistency, Isolation, Durability',
  },
  {
    topic: 'Ranking',
    summary: 'ROW_NUMBER unique; RANK has gaps after ties; DENSE_RANK has no gaps',
  },
  {
    topic: 'NULL rules',
    summary: 'Use IS NULL; NULL + 5 = NULL; COUNT(*) counts NULL rows, COUNT(col) does not; NOT IN with NULL returns nothing',
  },
  {
    topic: 'Top interview queries',
    summary: 'Nth highest salary, duplicates (GROUP BY HAVING), delete duplicates, employee-manager self join, dept-wise max salary, customers without orders',
  },
];

export const STUDY_TIPS = [
  'Solve MCQs on paper/mind first, then verify your option and read why incorrect distractors fail.',
  'For SQL queries, write the SQL yourself in the live runner below, compare against the reference output, then inspect the clause breakdown.',
  'Pay close attention to MySQL vs SQL Server vs Oracle dialect nuances tested in TCS NQT, Digital & Prime interviews.',
  'Bookmark tough questions and revisit weak sections (Joins, Window Functions, Normalization, NULL rules) every 3 days.',
];

