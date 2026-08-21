export type DataType = 'INT' | 'TEXT' | 'REAL' | 'FLOAT' | 'BOOLEAN' | 'DATE' | 'TIMESTAMP' | 'VARCHAR' | 'CHAR' | 'JSON' | 'DECIMAL';

export interface ColumnDefinition {
  name: string;
  type: DataType;
  primaryKey?: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
  nullable?: boolean;
  defaultValue?: any;
}

export type ValueType = string | number | boolean | null | undefined;
export type Row = Record<string, ValueType>;

export interface Table {
  name: string;
  columns: ColumnDefinition[];
  rows: Row[];
}

export interface Database {
  name: string;
  tables: Record<string, Table>;
}

export interface ColumnMetadata {
  name: string;
  type?: DataType;
  table?: string;
}

export interface SQLErrorDiagnostic {
  message: string;
  line?: number;
  column?: number;
}

export interface SQLExecutionResult {
  success: boolean;
  columns: ColumnMetadata[];
  rows: Row[];
  rowCount: number;
  executionTimeMs: number;
  affectedRows?: number;
  message?: string;
  error?: SQLErrorDiagnostic;
  updatedDatabase?: Database;
}

export type TokenType =
  | 'KEYWORD'
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'STRING'
  | 'OPERATOR'
  | 'PUNCTUATION'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export interface ASTExpression {
  type: 'IDENTIFIER' | 'LITERAL' | 'BINARY_OP' | 'UNARY_OP' | 'FUNCTION_CALL' | 'STAR' | 'CASE';
  value?: any;
  operator?: string;
  left?: ASTExpression;
  right?: ASTExpression;
  name?: string;
  args?: ASTExpression[];
  alias?: string;
  table?: string;
}

export interface ASTSelectItem {
  expr: ASTExpression;
  alias?: string;
}

export interface ASTJoin {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  table: string;
  alias?: string;
  on?: ASTExpression;
}

export interface ASTOrderBy {
  expr: ASTExpression;
  direction: 'ASC' | 'DESC';
}

export interface ASTCTE {
  name: string;
  query: ASTSelectStatement;
}

export interface ASTSelectStatement {
  type: 'SELECT';
  ctes?: ASTCTE[];
  distinct?: boolean;
  columns: ASTSelectItem[];
  from?: {
    table?: string;
    alias?: string;
    subquery?: ASTSelectStatement;
  };
  joins?: ASTJoin[];
  where?: ASTExpression;
  groupBy?: ASTExpression[];
  having?: ASTExpression;
  orderBy?: ASTOrderBy[];
  limit?: number;
  offset?: number;
}

export interface ASTInsertStatement {
  type: 'INSERT';
  table: string;
  columns?: string[];
  values: ASTExpression[][];
}

export interface ASTUpdateStatement {
  type: 'UPDATE';
  table: string;
  set: { column: string; value: ASTExpression }[];
  where?: ASTExpression;
}

export interface ASTDeleteStatement {
  type: 'DELETE';
  table: string;
  where?: ASTExpression;
}

export interface ASTCreateTableStatement {
  type: 'CREATE_TABLE';
  table: string;
  ifNotExists?: boolean;
  columns: ColumnDefinition[];
}

export interface ASTDropTableStatement {
  type: 'DROP_TABLE';
  table: string;
  ifExists?: boolean;
}

export interface ASTAlterTableStatement {
  type: 'ALTER_TABLE';
  table: string;
  action: 'ADD_COLUMN' | 'DROP_COLUMN' | 'RENAME_COLUMN';
  column?: ColumnDefinition;
  oldColumnName?: string;
  newColumnName?: string;
}

export type ASTStatement =
  | ASTSelectStatement
  | ASTInsertStatement
  | ASTUpdateStatement
  | ASTDeleteStatement
  | ASTCreateTableStatement
  | ASTDropTableStatement
  | ASTAlterTableStatement;
