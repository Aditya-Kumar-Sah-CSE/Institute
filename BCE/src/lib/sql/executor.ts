import {
  Database,
  Table,
  Row,
  SQLExecutionResult,
  ASTStatement,
  ASTSelectStatement,
  ASTInsertStatement,
  ASTUpdateStatement,
  ASTDeleteStatement,
  ASTCreateTableStatement,
  ASTDropTableStatement,
  ASTAlterTableStatement,
  ASTExpression,
  ColumnMetadata
} from './types';

export class SQLExecutor {
  private db: Database;

  constructor(db: Database) {
    this.db = JSON.parse(JSON.stringify(db));
  }

  public execute(ast: ASTStatement): SQLExecutionResult {
    const startTime = performance.now();

    try {
      switch (ast.type) {
        case 'SELECT': {
          const res = this.executeSelect(ast);
          const endTime = performance.now();
          return {
            success: true,
            columns: res.columns,
            rows: res.rows,
            rowCount: res.rows.length,
            executionTimeMs: Number((endTime - startTime).toFixed(2))
          };
        }
        case 'INSERT': {
          const count = this.executeInsert(ast);
          const endTime = performance.now();
          return {
            success: true,
            columns: [],
            rows: [],
            rowCount: 0,
            affectedRows: count,
            executionTimeMs: Number((endTime - startTime).toFixed(2)),
            message: `Successfully inserted ${count} row(s).`,
            updatedDatabase: this.db
          };
        }
        case 'UPDATE': {
          const count = this.executeUpdate(ast);
          const endTime = performance.now();
          return {
            success: true,
            columns: [],
            rows: [],
            rowCount: 0,
            affectedRows: count,
            executionTimeMs: Number((endTime - startTime).toFixed(2)),
            message: `Successfully updated ${count} row(s).`,
            updatedDatabase: this.db
          };
        }
        case 'DELETE': {
          const count = this.executeDelete(ast);
          const endTime = performance.now();
          return {
            success: true,
            columns: [],
            rows: [],
            rowCount: 0,
            affectedRows: count,
            executionTimeMs: Number((endTime - startTime).toFixed(2)),
            message: `Successfully deleted ${count} row(s).`,
            updatedDatabase: this.db
          };
        }
        case 'CREATE_TABLE': {
          this.executeCreateTable(ast);
          const endTime = performance.now();
          return {
            success: true,
            columns: [],
            rows: [],
            rowCount: 0,
            executionTimeMs: Number((endTime - startTime).toFixed(2)),
            message: `Table '${ast.table}' created successfully.`,
            updatedDatabase: this.db
          };
        }
        case 'DROP_TABLE': {
          this.executeDropTable(ast);
          const endTime = performance.now();
          return {
            success: true,
            columns: [],
            rows: [],
            rowCount: 0,
            executionTimeMs: Number((endTime - startTime).toFixed(2)),
            message: `Table '${ast.table}' dropped successfully.`,
            updatedDatabase: this.db
          };
        }
        case 'ALTER_TABLE': {
          this.executeAlterTable(ast);
          const endTime = performance.now();
          return {
            success: true,
            columns: [],
            rows: [],
            rowCount: 0,
            executionTimeMs: Number((endTime - startTime).toFixed(2)),
            message: `Table '${ast.table}' altered successfully.`,
            updatedDatabase: this.db
          };
        }
        default:
          throw new Error(`Unsupported statement type`);
      }
    } catch (err: any) {
      const endTime = performance.now();
      return {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: Number((endTime - startTime).toFixed(2)),
        error: {
          message: err.message || 'Error executing query',
          line: err.line,
          column: err.column
        }
      };
    }
  }

  private executeSelect(ast: ASTSelectStatement): { columns: ColumnMetadata[]; rows: Row[] } {
    const cteMap: Record<string, { columns: ColumnMetadata[]; rows: Row[] }> = {};
    if (ast.ctes) {
      for (const cte of ast.ctes) {
        cteMap[cte.name] = this.executeSelect(cte.query);
      }
    }

    let sourceRows: Row[] = [{}];
    let availableTables: Record<string, string> = {};

    if (ast.from) {
      if (ast.from.subquery) {
        const subRes = this.executeSelect(ast.from.subquery);
        const alias = ast.from.alias || 'subquery';
        sourceRows = subRes.rows.map(r => {
          const rowWithTable: Row = {};
          for (const key of Object.keys(r)) {
            rowWithTable[`${alias}.${key}`] = r[key];
            rowWithTable[key] = r[key];
          }
          return rowWithTable;
        });
      } else if (ast.from.table) {
        const tableName = ast.from.table;
        const alias = ast.from.alias || tableName;

        if (cteMap[tableName]) {
          const cte = cteMap[tableName];
          sourceRows = cte.rows.map(r => {
            const rowWithTable: Row = {};
            for (const k of Object.keys(r)) {
              rowWithTable[`${alias}.${k}`] = r[k];
              rowWithTable[k] = r[k];
            }
            return rowWithTable;
          });
        } else {
          const table = this.db.tables[tableName];
          if (!table) {
            throw new Error(`Table '${tableName}' does not exist in database`);
          }
          sourceRows = table.rows.map(r => {
            const rowWithTable: Row = {};
            for (const col of Object.keys(r)) {
              rowWithTable[`${alias}.${col}`] = r[col];
              rowWithTable[col] = r[col];
            }
            return rowWithTable;
          });
        }
        availableTables[alias] = tableName;
      }
    }

    if (ast.joins) {
      for (const join of ast.joins) {
        const joinTable = this.db.tables[join.table];
        if (!joinTable && !cteMap[join.table]) {
          throw new Error(`Joined table '${join.table}' does not exist`);
        }

        const joinAlias = join.alias || join.table;
        const joinRowsSource = cteMap[join.table] ? cteMap[join.table].rows : joinTable.rows;

        const newSourceRows: Row[] = [];

        for (const leftRow of sourceRows) {
          let matched = false;

          for (const rightRowRaw of joinRowsSource) {
            const rightRowPrefix: Row = {};
            for (const col of Object.keys(rightRowRaw)) {
              rightRowPrefix[`${joinAlias}.${col}`] = rightRowRaw[col];
              rightRowPrefix[col] = rightRowRaw[col];
            }

            const combinedRow: Row = { ...leftRow, ...rightRowPrefix };

            if (join.type === 'CROSS' || !join.on) {
              matched = true;
              newSourceRows.push(combinedRow);
            } else {
              const onCondition = this.evaluateExpression(join.on, combinedRow);
              if (onCondition) {
                matched = true;
                newSourceRows.push(combinedRow);
              }
            }
          }

          if (!matched && join.type === 'LEFT') {
            const nullRightRow: Row = {};
            if (joinTable) {
              for (const colDef of joinTable.columns) {
                nullRightRow[`${joinAlias}.${colDef.name}`] = null;
              }
            }
            newSourceRows.push({ ...leftRow, ...nullRightRow });
          }
        }
        sourceRows = newSourceRows;
      }
    }

    if (ast.where) {
      sourceRows = sourceRows.filter(row => {
        const val = this.evaluateExpression(ast.where!, row);
        return Boolean(val);
      });
    }

    const hasAggregates = ast.columns.some(c => this.containsAggregate(c.expr));

    if (ast.groupBy || hasAggregates) {
      const groups: { key: string; rows: Row[]; sampleRow: Row }[] = [];

      for (const row of sourceRows) {
        let key = 'ALL';
        if (ast.groupBy) {
          key = ast.groupBy.map(g => String(this.evaluateExpression(g, row))).join('||');
        }
        let group = groups.find(g => g.key === key);
        if (!group) {
          group = { key, rows: [], sampleRow: row };
          groups.push(group);
        }
        group.rows.push(row);
      }

      const aggregatedSourceRows: Row[] = [];

      for (const grp of groups) {
        const aggRow: Row = { ...grp.sampleRow };

        for (const item of ast.columns) {
          if (this.containsAggregate(item.expr)) {
            const val = this.evaluateAggregate(item.expr, grp.rows);
            const colKey = item.alias || this.expressionToString(item.expr);
            aggRow[colKey] = val;
          }
        }

        aggregatedSourceRows.push(aggRow);
      }

      sourceRows = aggregatedSourceRows;

      if (ast.having) {
        sourceRows = sourceRows.filter(row => Boolean(this.evaluateExpression(ast.having!, row)));
      }
    }

    let resultColumns: ColumnMetadata[] = [];
    let projectedRows: Row[] = [];

    if (ast.columns.length === 1 && ast.columns[0].expr.type === 'STAR') {
      const starTable = ast.columns[0].expr.table;
      if (sourceRows.length > 0) {
        const sampleRow = sourceRows[0];
        const allKeys = Object.keys(sampleRow);

        const keysToInclude = allKeys.filter(k => {
          if (k.includes('.')) {
            if (starTable) return k.startsWith(`${starTable}.`);
            return true;
          }
          return false;
        });

        const finalKeys = keysToInclude.length > 0 ? keysToInclude : allKeys;

        resultColumns = finalKeys.map(k => ({
          name: k.includes('.') ? k.split('.')[1] : k
        }));

        projectedRows = sourceRows.map(r => {
          const rowObj: Row = {};
          for (let i = 0; i < finalKeys.length; i++) {
            const fullKey = finalKeys[i];
            const cleanName = resultColumns[i].name;
            rowObj[cleanName] = r[fullKey];
          }
          return rowObj;
        });
      }
    } else {
      resultColumns = ast.columns.map(c => ({
        name: c.alias || this.expressionToString(c.expr)
      }));

      projectedRows = sourceRows.map(row => {
        const rowObj: Row = {};
        for (let i = 0; i < ast.columns.length; i++) {
          const item = ast.columns[i];
          const colName = resultColumns[i].name;
          if (row[colName] !== undefined) {
            rowObj[colName] = row[colName];
          } else {
            rowObj[colName] = this.evaluateExpression(item.expr, row);
          }
        }
        return rowObj;
      });
    }

    if (ast.distinct) {
      const seen = new Set<string>();
      projectedRows = projectedRows.filter(r => {
        const str = JSON.stringify(r);
        if (seen.has(str)) return false;
        seen.add(str);
        return true;
      });
    }

    if (ast.orderBy) {
      projectedRows.sort((a, b) => {
        for (const ord of ast.orderBy!) {
          const valA = this.evaluateExpression(ord.expr, a);
          const valB = this.evaluateExpression(ord.expr, b);

          if (valA === valB) continue;
          if (valA === null || valA === undefined) return 1;
          if (valB === null || valB === undefined) return -1;

          let cmp = 0;
          if (typeof valA === 'number' && typeof valB === 'number') {
            cmp = valA - valB;
          } else {
            cmp = String(valA).localeCompare(String(valB));
          }

          if (ord.direction === 'DESC') cmp = -cmp;
          return cmp;
        }
        return 0;
      });
    }

    if (ast.offset) {
      projectedRows = projectedRows.slice(ast.offset);
    }
    if (ast.limit !== undefined) {
      projectedRows = projectedRows.slice(0, ast.limit);
    }

    return { columns: resultColumns, rows: projectedRows };
  }

  private executeInsert(ast: ASTInsertStatement): number {
    const table = this.db.tables[ast.table];
    if (!table) throw new Error(`Table '${ast.table}' does not exist`);

    let insertedCount = 0;
    for (const tuple of ast.values) {
      const newRow: Row = {};

      if (ast.columns) {
        for (let i = 0; i < ast.columns.length; i++) {
          const colName = ast.columns[i];
          const expr = tuple[i];
          newRow[colName] = this.evaluateExpression(expr, {});
        }
      } else {
        for (let i = 0; i < table.columns.length; i++) {
          const colDef = table.columns[i];
          const expr = tuple[i];
          newRow[colDef.name] = expr ? this.evaluateExpression(expr, {}) : null;
        }
      }

      const pkCol = table.columns.find(c => c.primaryKey);
      if (pkCol && newRow[pkCol.name] === undefined) {
        const maxId = table.rows.reduce((max, r) => {
          const val = r[pkCol.name];
          return typeof val === 'number' && val > max ? val : max;
        }, 0);
        newRow[pkCol.name] = maxId + 1;
      }

      table.rows.push(newRow);
      insertedCount++;
    }
    return insertedCount;
  }

  private executeUpdate(ast: ASTUpdateStatement): number {
    const table = this.db.tables[ast.table];
    if (!table) throw new Error(`Table '${ast.table}' does not exist`);

    let updatedCount = 0;
    for (const row of table.rows) {
      const matches = !ast.where || Boolean(this.evaluateExpression(ast.where, row));
      if (matches) {
        for (const item of ast.set) {
          row[item.column] = this.evaluateExpression(item.value, row);
        }
        updatedCount++;
      }
    }
    return updatedCount;
  }

  private executeDelete(ast: ASTDeleteStatement): number {
    const table = this.db.tables[ast.table];
    if (!table) throw new Error(`Table '${ast.table}' does not exist`);

    const initialCount = table.rows.length;
    if (ast.where) {
      table.rows = table.rows.filter(row => !this.evaluateExpression(ast.where!, row));
    } else {
      table.rows = [];
    }
    return initialCount - table.rows.length;
  }

  private executeCreateTable(ast: ASTCreateTableStatement): void {
    if (this.db.tables[ast.table]) {
      if (ast.ifNotExists) return;
      throw new Error(`Table '${ast.table}' already exists`);
    }
    this.db.tables[ast.table] = {
      name: ast.table,
      columns: ast.columns,
      rows: []
    };
  }

  private executeDropTable(ast: ASTDropTableStatement): void {
    if (!this.db.tables[ast.table]) {
      if (ast.ifExists) return;
      throw new Error(`Table '${ast.table}' does not exist`);
    }
    delete this.db.tables[ast.table];
  }

  private executeAlterTable(ast: ASTAlterTableStatement): void {
    const table = this.db.tables[ast.table];
    if (!table) throw new Error(`Table '${ast.table}' does not exist`);

    if (ast.action === 'ADD_COLUMN' && ast.column) {
      table.columns.push(ast.column);
      for (const row of table.rows) {
        row[ast.column.name] = null;
      }
    } else if (ast.action === 'DROP_COLUMN' && ast.oldColumnName) {
      table.columns = table.columns.filter(c => c.name !== ast.oldColumnName);
      for (const row of table.rows) {
        delete row[ast.oldColumnName];
      }
    } else if (ast.action === 'RENAME_COLUMN' && ast.oldColumnName && ast.newColumnName) {
      const col = table.columns.find(c => c.name === ast.oldColumnName);
      if (col) col.name = ast.newColumnName;
      for (const row of table.rows) {
        row[ast.newColumnName] = row[ast.oldColumnName];
        delete row[ast.oldColumnName];
      }
    }
  }

  private evaluateExpression(expr: ASTExpression, row: Row): any {
    if (!expr) return null;

    switch (expr.type) {
      case 'LITERAL':
        return expr.value;

      case 'IDENTIFIER': {
        const colName = expr.name!;
        if (expr.table) {
          const qualifiedKey = `${expr.table}.${colName}`;
          if (row[qualifiedKey] !== undefined) return row[qualifiedKey];
        }
        if (row[colName] !== undefined) return row[colName];

        for (const k of Object.keys(row)) {
          if (k.toLowerCase() === colName.toLowerCase()) return row[k];
          if (k.endsWith(`.${colName}`)) return row[k];
        }
        return null;
      }

      case 'UNARY_OP': {
        const operandVal = this.evaluateExpression(expr.left!, row);
        if (expr.operator === 'IS NULL') return operandVal === null || operandVal === undefined;
        if (expr.operator === 'IS NOT NULL') return operandVal !== null && operandVal !== undefined;
        if (expr.operator === '-') return -operandVal;
        return operandVal;
      }

      case 'BINARY_OP': {
        const leftVal = this.evaluateExpression(expr.left!, row);

        if (expr.operator === 'AND') {
          return Boolean(leftVal) && Boolean(this.evaluateExpression(expr.right!, row));
        }
        if (expr.operator === 'OR') {
          return Boolean(leftVal) || Boolean(this.evaluateExpression(expr.right!, row));
        }
        if (expr.operator === 'IN') {
          const list = (expr.right?.value as ASTExpression[]) || [];
          const evaluatedList = list.map(item => this.evaluateExpression(item, row));
          return evaluatedList.includes(leftVal);
        }
        if (expr.operator === 'BETWEEN') {
          const [lowExpr, highExpr] = expr.right?.value as [ASTExpression, ASTExpression];
          const low = this.evaluateExpression(lowExpr, row);
          const high = this.evaluateExpression(highExpr, row);
          return leftVal >= low && leftVal <= high;
        }

        const rightVal = this.evaluateExpression(expr.right!, row);

        switch (expr.operator) {
          case '=': return leftVal === rightVal;
          case '!=':
          case '<>': return leftVal !== rightVal;
          case '<': return leftVal < rightVal;
          case '>': return leftVal > rightVal;
          case '<=': return leftVal <= rightVal;
          case '>=': return leftVal >= rightVal;
          case '+': return Number(leftVal) + Number(rightVal);
          case '-': return Number(leftVal) - Number(rightVal);
          case '*': return Number(leftVal) * Number(rightVal);
          case '/': return Number(rightVal) !== 0 ? Number(leftVal) / Number(rightVal) : null;
          case '%': return Number(leftVal) % Number(rightVal);
          case 'LIKE': {
            const regexStr = '^' + String(rightVal).replace(/%/g, '.*').replace(/_/g, '.') + '$';
            return new RegExp(regexStr, 'i').test(String(leftVal));
          }
          default:
            return null;
        }
      }

      case 'FUNCTION_CALL':
        return this.evaluateFunction(expr.name!, expr.args || [], row);

      case 'CASE': {
        const args = expr.args || [];
        for (let i = 0; i < args.length - 1; i += 2) {
          const whenCond = this.evaluateExpression(args[i], row);
          if (whenCond) {
            return this.evaluateExpression(args[i + 1], row);
          }
        }
        if (args.length % 2 === 1) {
          return this.evaluateExpression(args[args.length - 1], row);
        }
        return null;
      }

      default:
        return null;
    }
  }

  private evaluateFunction(funcName: string, args: ASTExpression[], row: Row): any {
    const fn = funcName.toUpperCase();
    const evalArgs = args.map(a => this.evaluateExpression(a, row));

    switch (fn) {
      case 'UPPER':
        return evalArgs[0] != null ? String(evalArgs[0]).toUpperCase() : null;
      case 'LOWER':
        return evalArgs[0] != null ? String(evalArgs[0]).toLowerCase() : null;
      case 'LENGTH':
        return evalArgs[0] != null ? String(evalArgs[0]).length : 0;
      case 'CONCAT':
        return evalArgs.map(v => (v != null ? String(v) : '')).join('');
      case 'ROUND': {
        const val = Number(evalArgs[0]);
        const decimals = evalArgs[1] != null ? Number(evalArgs[1]) : 0;
        return isNaN(val) ? null : Number(val.toFixed(decimals));
      }
      case 'ABS':
        return evalArgs[0] != null ? Math.abs(Number(evalArgs[0])) : null;
      case 'CEIL':
      case 'CEILING':
        return evalArgs[0] != null ? Math.ceil(Number(evalArgs[0])) : null;
      case 'FLOOR':
        return evalArgs[0] != null ? Math.floor(Number(evalArgs[0])) : null;
      default:
        return evalArgs[0];
    }
  }

  private containsAggregate(expr: ASTExpression): boolean {
    if (expr.type === 'FUNCTION_CALL') {
      const fn = expr.name?.toUpperCase();
      if (['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(fn!)) return true;
    }
    if (expr.left && this.containsAggregate(expr.left)) return true;
    if (expr.right && this.containsAggregate(expr.right)) return true;
    return false;
  }

  private evaluateAggregate(expr: ASTExpression, rows: Row[]): any {
    if (expr.type === 'FUNCTION_CALL') {
      const fn = expr.name?.toUpperCase();
      const argExpr = expr.args && expr.args[0];

      if (fn === 'COUNT') {
        if (!argExpr || argExpr.type === 'STAR') return rows.length;
        return rows.filter(r => this.evaluateExpression(argExpr, r) != null).length;
      }

      const values = rows
        .map(r => Number(this.evaluateExpression(argExpr!, r)))
        .filter(v => !isNaN(v) && v !== null);

      if (values.length === 0) return null;

      if (fn === 'SUM') return values.reduce((a, b) => a + b, 0);
      if (fn === 'AVG') return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
      if (fn === 'MIN') return Math.min(...values);
      if (fn === 'MAX') return Math.max(...values);
    }
    return null;
  }

  private expressionToString(expr: ASTExpression): string {
    if (expr.alias) return expr.alias;
    if (expr.type === 'STAR') return '*';
    if (expr.type === 'IDENTIFIER') return expr.name || 'col';
    if (expr.type === 'FUNCTION_CALL') return `${expr.name}(${expr.args?.map(a => this.expressionToString(a)).join(', ') || ''})`;
    if (expr.type === 'LITERAL') return String(expr.value);
    return 'col';
  }
}
