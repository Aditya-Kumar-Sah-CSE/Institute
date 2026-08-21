import { createDatabase, executeSQL, formatSQL } from '../index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Test Failed: ${message}`);
  }
}

export function runSqlEngineTests() {
  let db = createDatabase('employees_departments');

  // Test 1: Prompt Query 1
  const res1 = executeSQL(`SELECT * FROM employees WHERE salary > 50000 ORDER BY salary DESC;`, db);
  assert(res1.success, 'Prompt Query 1 should succeed');
  assert(res1.rows.length > 0, 'Prompt Query 1 should return rows');
  assert(Number(res1.rows[0].salary) > Number(res1.rows[res1.rows.length - 1].salary), 'Prompt Query 1 should sort salary DESC');

  // Test 2: Prompt Query 2
  const query2 = `
    SELECT d.department_name, COUNT(e.id) AS emp_count, AVG(e.salary) AS avg_sal
    FROM departments d
    JOIN employees e ON d.id = e.department_id
    GROUP BY d.department_name;
  `;
  const res2 = executeSQL(query2, db);
  assert(res2.success, 'Prompt Query 2 should succeed');
  assert(res2.rows.length > 0, 'Prompt Query 2 should return aggregated rows');
  assert(res2.columns.some(c => c.name === 'department_name'), 'Should include department_name');
  assert(res2.columns.some(c => c.name === 'emp_count'), 'Should include emp_count');
  assert(res2.columns.some(c => c.name === 'avg_sal'), 'Should include avg_sal');

  // Test 3: Prompt Query 3
  const createRes = executeSQL(`CREATE TABLE test_table (id INT, name TEXT);`, db);
  assert(createRes.success, 'CREATE TABLE should succeed');

  const insertRes = executeSQL(`INSERT INTO test_table VALUES (1, 'BCE Admin');`, createRes.updatedDatabase || db);
  assert(insertRes.success, 'INSERT INTO should succeed');

  const selectRes = executeSQL(`SELECT * FROM test_table;`, insertRes.updatedDatabase || db);
  assert(selectRes.success, 'SELECT FROM test_table should succeed');
  assert(selectRes.rows.length === 1 && selectRes.rows[0].name === 'BCE Admin', 'Row matching check');

  // Test 4: UPDATE & DELETE
  const updateRes = executeSQL(`UPDATE employees SET salary = 150000 WHERE id = 101;`, db);
  assert(updateRes.success && updateRes.affectedRows === 1, 'UPDATE should succeed');

  const deleteRes = executeSQL(`DELETE FROM employees WHERE id = 108;`, updateRes.updatedDatabase || db);
  assert(deleteRes.success && deleteRes.affectedRows === 1, 'DELETE should succeed');

  // Test 5: CTE
  const cteQuery = `
    WITH high_earners AS (
      SELECT id, first_name, salary FROM employees WHERE salary > 100000
    )
    SELECT * FROM high_earners ORDER BY salary DESC;
  `;
  const cteRes = executeSQL(cteQuery, db);
  assert(cteRes.success && cteRes.rows.length > 0, 'CTE query should succeed');

  // Test 6: Functions
  const fnRes = executeSQL(`SELECT UPPER(first_name) AS upper_name, LENGTH(email) AS email_len FROM employees WHERE id = 101;`, db);
  assert(fnRes.success && fnRes.rows[0].upper_name === 'ADITYA', 'UPPER function should work');

  // Test 7: Error Diagnostic
  const errRes = executeSQL(`SELECT * FROM non_existent_table;`, db);
  assert(!errRes.success && errRes.error?.message.includes('non_existent_table') === true, 'Error handling should capture missing table');

  // Test 8: Formatter
  const formatted = formatSQL(`select id, first_name from employees where salary > 50000;`);
  assert(formatted.includes('SELECT') && formatted.includes('FROM'), 'Format SQL should capitalize keywords');

  console.log('✅ All SQL Engine Unit Tests Passed Successfully!');
}

