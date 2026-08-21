import { Token } from './types';
import {
  ASTStatement,
  ASTSelectStatement,
  ASTInsertStatement,
  ASTUpdateStatement,
  ASTDeleteStatement,
  ASTCreateTableStatement,
  ASTDropTableStatement,
  ASTAlterTableStatement,
  ASTExpression,
  ASTSelectItem,
  ASTJoin,
  ASTOrderBy,
  ASTCTE,
  ColumnDefinition,
  DataType
} from './types';

export class ParserError extends Error {
  line?: number;
  column?: number;

  constructor(message: string, token?: Token) {
    super(token ? `${message} at line ${token.line}, column ${token.column}` : message);
    this.name = 'ParserError';
    if (token) {
      this.line = token.line;
      this.column = token.column;
    }
  }
}

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): ASTStatement[] {
    const statements: ASTStatement[] = [];
    while (!this.isAtEnd()) {
      if (this.matchPunctuation(';')) {
        continue;
      }
      statements.push(this.parseStatement());
      if (this.matchPunctuation(';')) {
        continue;
      }
    }
    return statements;
  }

  private parseStatement(): ASTStatement {
    if (this.matchKeyword('WITH')) {
      return this.parseSelectStatementWithCTE();
    }
    if (this.matchKeyword('SELECT')) {
      return this.parseSelectStatement();
    }
    if (this.matchKeyword('INSERT')) {
      return this.parseInsertStatement();
    }
    if (this.matchKeyword('UPDATE')) {
      return this.parseUpdateStatement();
    }
    if (this.matchKeyword('DELETE')) {
      return this.parseDeleteStatement();
    }
    if (this.matchKeyword('CREATE')) {
      return this.parseCreateStatement();
    }
    if (this.matchKeyword('DROP')) {
      return this.parseDropStatement();
    }
    if (this.matchKeyword('ALTER')) {
      return this.parseAlterStatement();
    }

    throw new ParserError(`Unexpected statement starting with '${this.peek().value}'`, this.peek());
  }

  private parseSelectStatementWithCTE(): ASTSelectStatement {
    const ctes: ASTCTE[] = [];
    do {
      const cteName = this.consumeIdentifier('Expected CTE name');
      this.consumeKeyword('AS', "Expected 'AS' after CTE name");
      this.consumePunctuation('(', "Expected '(' before CTE query");
      this.consumeKeyword('SELECT', "Expected 'SELECT' in CTE query");
      const cteQuery = this.parseSelectStatement();
      this.consumePunctuation(')', "Expected ')' after CTE query");
      ctes.push({ name: cteName, query: cteQuery });
    } while (this.matchPunctuation(','));

    this.consumeKeyword('SELECT', "Expected 'SELECT' after WITH clause");
    const mainSelect = this.parseSelectStatement();
    mainSelect.ctes = ctes;
    return mainSelect;
  }

  private parseSelectStatement(): ASTSelectStatement {
    const distinct = this.matchKeyword('DISTINCT');

    // Columns
    const columns: ASTSelectItem[] = [];
    do {
      const expr = this.parseExpression();
      let alias: string | undefined;
      if (this.matchKeyword('AS')) {
        alias = this.parseIdentifierOrString();
      } else if (this.peek().type === 'IDENTIFIER' && !this.isKeywordAhead()) {
        alias = this.advance().value;
      }
      columns.push({ expr, alias });
    } while (this.matchPunctuation(','));

    // FROM
    let from: ASTSelectStatement['from'] = undefined;
    if (this.matchKeyword('FROM')) {
      if (this.matchPunctuation('(')) {
        this.consumeKeyword('SELECT', "Expected 'SELECT' in subquery");
        const subquery = this.parseSelectStatement();
        this.consumePunctuation(')', "Expected ')' after subquery");
        let alias: string | undefined;
        if (this.matchKeyword('AS')) {
          alias = this.parseIdentifierOrString();
        } else if (this.peek().type === 'IDENTIFIER') {
          alias = this.advance().value;
        }
        from = { subquery, alias };
      } else {
        const table = this.consumeIdentifier('Expected table name in FROM clause');
        let alias: string | undefined;
        if (this.matchKeyword('AS')) {
          alias = this.parseIdentifierOrString();
        } else if (this.peek().type === 'IDENTIFIER' && !this.isKeywordAhead()) {
          alias = this.advance().value;
        }
        from = { table, alias };
      }
    }

    // JOINs
    const joins: ASTJoin[] = [];
    while (
      this.checkKeyword('JOIN') ||
      this.checkKeyword('INNER') ||
      this.checkKeyword('LEFT') ||
      this.checkKeyword('RIGHT') ||
      this.checkKeyword('FULL') ||
      this.checkKeyword('CROSS')
    ) {
      let joinType: ASTJoin['type'] = 'INNER';
      if (this.matchKeyword('LEFT')) {
        this.matchKeyword('OUTER');
        joinType = 'LEFT';
      } else if (this.matchKeyword('RIGHT')) {
        this.matchKeyword('OUTER');
        joinType = 'RIGHT';
      } else if (this.matchKeyword('FULL')) {
        this.matchKeyword('OUTER');
        joinType = 'FULL';
      } else if (this.matchKeyword('CROSS')) {
        joinType = 'CROSS';
      } else {
        this.matchKeyword('INNER');
      }
      this.consumeKeyword('JOIN', "Expected 'JOIN'");
      const table = this.consumeIdentifier('Expected table name in JOIN clause');
      let alias: string | undefined;
      if (this.matchKeyword('AS')) {
        alias = this.parseIdentifierOrString();
      } else if (this.peek().type === 'IDENTIFIER' && !this.isKeywordAhead()) {
        alias = this.advance().value;
      }

      let on: ASTExpression | undefined;
      if (joinType !== 'CROSS' && this.matchKeyword('ON')) {
        on = this.parseExpression();
      }
      joins.push({ type: joinType, table, alias, on });
    }

    // WHERE
    let where: ASTExpression | undefined;
    if (this.matchKeyword('WHERE')) {
      where = this.parseExpression();
    }

    // GROUP BY
    let groupBy: ASTExpression[] | undefined;
    if (this.matchKeyword('GROUP')) {
      this.consumeKeyword('BY', "Expected 'BY' after 'GROUP'");
      groupBy = [];
      do {
        groupBy.push(this.parseExpression());
      } while (this.matchPunctuation(','));
    }

    // HAVING
    let having: ASTExpression | undefined;
    if (this.matchKeyword('HAVING')) {
      having = this.parseExpression();
    }

    // ORDER BY
    let orderBy: ASTOrderBy[] | undefined;
    if (this.matchKeyword('ORDER')) {
      this.consumeKeyword('BY', "Expected 'BY' after 'ORDER'");
      orderBy = [];
      do {
        const expr = this.parseExpression();
        let direction: 'ASC' | 'DESC' = 'ASC';
        if (this.matchKeyword('DESC')) {
          direction = 'DESC';
        } else {
          this.matchKeyword('ASC');
        }
        orderBy.push({ expr, direction });
      } while (this.matchPunctuation(','));
    }

    // LIMIT
    let limit: number | undefined;
    let offset: number | undefined;
    if (this.matchKeyword('LIMIT')) {
      const numToken = this.consumeToken('NUMBER', 'Expected integer for LIMIT');
      limit = parseInt(numToken.value, 10);
      if (this.matchKeyword('OFFSET')) {
        const offToken = this.consumeToken('NUMBER', 'Expected integer for OFFSET');
        offset = parseInt(offToken.value, 10);
      }
    }

    return {
      type: 'SELECT',
      distinct,
      columns,
      from,
      joins: joins.length > 0 ? joins : undefined,
      where,
      groupBy,
      having,
      orderBy,
      limit,
      offset
    };
  }

  private parseInsertStatement(): ASTInsertStatement {
    this.consumeKeyword('INTO', "Expected 'INTO' after 'INSERT'");
    const table = this.consumeIdentifier('Expected table name');

    let columns: string[] | undefined;
    if (this.matchPunctuation('(')) {
      columns = [];
      do {
        columns.push(this.consumeIdentifier('Expected column name'));
      } while (this.matchPunctuation(','));
      this.consumePunctuation(')', "Expected ')' after column list");
    }

    this.consumeKeyword('VALUES', "Expected 'VALUES' clause");

    const values: ASTExpression[][] = [];
    do {
      this.consumePunctuation('(', "Expected '(' before tuple values");
      const tuple: ASTExpression[] = [];
      do {
        tuple.push(this.parseExpression());
      } while (this.matchPunctuation(','));
      this.consumePunctuation(')', "Expected ')' after tuple values");
      values.push(tuple);
    } while (this.matchPunctuation(','));

    return { type: 'INSERT', table, columns, values };
  }

  private parseUpdateStatement(): ASTUpdateStatement {
    const table = this.consumeIdentifier('Expected table name');
    this.consumeKeyword('SET', "Expected 'SET' clause");

    const set: { column: string; value: ASTExpression }[] = [];
    do {
      const column = this.consumeIdentifier('Expected column name to update');
      this.consumeOperator('=', "Expected '=' in SET clause");
      const value = this.parseExpression();
      set.push({ column, value });
    } while (this.matchPunctuation(','));

    let where: ASTExpression | undefined;
    if (this.matchKeyword('WHERE')) {
      where = this.parseExpression();
    }

    return { type: 'UPDATE', table, set, where };
  }

  private parseDeleteStatement(): ASTDeleteStatement {
    this.consumeKeyword('FROM', "Expected 'FROM' after 'DELETE'");
    const table = this.consumeIdentifier('Expected table name');

    let where: ASTExpression | undefined;
    if (this.matchKeyword('WHERE')) {
      where = this.parseExpression();
    }

    return { type: 'DELETE', table, where };
  }

  private parseCreateStatement(): ASTCreateTableStatement {
    this.consumeKeyword('TABLE', "Expected 'TABLE' after 'CREATE'");
    let ifNotExists = false;
    if (this.matchKeyword('IF')) {
      this.consumeKeyword('NOT', "Expected 'NOT'");
      this.consumeKeyword('EXISTS', "Expected 'EXISTS'");
      ifNotExists = true;
    }

    const table = this.consumeIdentifier('Expected table name');
    this.consumePunctuation('(', "Expected '(' for table definitions");

    const columns: ColumnDefinition[] = [];
    do {
      const name = this.consumeIdentifier('Expected column name');
      const typeStr = this.advance().value.toUpperCase() as DataType;
      let primaryKey = false;
      let nullable = true;
      let foreignKey: ColumnDefinition['foreignKey'];

      while (
        this.checkKeyword('PRIMARY') ||
        this.checkKeyword('NOT') ||
        this.checkKeyword('REFERENCES')
      ) {
        if (this.matchKeyword('PRIMARY')) {
          this.consumeKeyword('KEY', "Expected 'KEY' after 'PRIMARY'");
          primaryKey = true;
        } else if (this.matchKeyword('NOT')) {
          this.consumeKeyword('NULL', "Expected 'NULL' after 'NOT'");
          nullable = false;
        } else if (this.matchKeyword('REFERENCES')) {
          const refTable = this.consumeIdentifier('Expected referenced table');
          this.consumePunctuation('(', "Expected '('");
          const refCol = this.consumeIdentifier('Expected referenced column');
          this.consumePunctuation(')', "Expected ')'");
          foreignKey = { table: refTable, column: refCol };
        }
      }

      columns.push({ name, type: typeStr, primaryKey, nullable, foreignKey });
    } while (this.matchPunctuation(','));

    this.consumePunctuation(')', "Expected ')' after table definition");
    return { type: 'CREATE_TABLE', table, ifNotExists, columns };
  }

  private parseDropStatement(): ASTDropTableStatement {
    this.consumeKeyword('TABLE', "Expected 'TABLE' after 'DROP'");
    let ifExists = false;
    if (this.matchKeyword('IF')) {
      this.consumeKeyword('EXISTS', "Expected 'EXISTS'");
      ifExists = true;
    }
    const table = this.consumeIdentifier('Expected table name');
    return { type: 'DROP_TABLE', table, ifExists };
  }

  private parseAlterStatement(): ASTAlterTableStatement {
    this.consumeKeyword('TABLE', "Expected 'TABLE' after 'ALTER'");
    const table = this.consumeIdentifier('Expected table name');

    if (this.matchKeyword('ADD')) {
      this.matchKeyword('COLUMN');
      const name = this.consumeIdentifier('Expected column name');
      const typeStr = this.advance().value.toUpperCase() as DataType;
      return { type: 'ALTER_TABLE', table, action: 'ADD_COLUMN', column: { name, type: typeStr } };
    }
    if (this.matchKeyword('DROP')) {
      this.matchKeyword('COLUMN');
      const oldColumnName = this.consumeIdentifier('Expected column name to drop');
      return { type: 'ALTER_TABLE', table, action: 'DROP_COLUMN', oldColumnName };
    }
    if (this.matchKeyword('RENAME')) {
      this.matchKeyword('COLUMN');
      const oldColumnName = this.consumeIdentifier('Expected column name');
      this.consumeKeyword('TO', "Expected 'TO'");
      const newColumnName = this.consumeIdentifier('Expected new column name');
      return { type: 'ALTER_TABLE', table, action: 'RENAME_COLUMN', oldColumnName, newColumnName };
    }

    throw new ParserError("Expected 'ADD', 'DROP', or 'RENAME' in ALTER TABLE", this.peek());
  }

  // Expression Parser (Operator Precedence)
  private parseExpression(): ASTExpression {
    return this.parseOrExpression();
  }

  private parseOrExpression(): ASTExpression {
    let expr = this.parseAndExpression();
    while (this.matchKeyword('OR')) {
      const right = this.parseAndExpression();
      expr = { type: 'BINARY_OP', operator: 'OR', left: expr, right };
    }
    return expr;
  }

  private parseAndExpression(): ASTExpression {
    let expr = this.parseEqualityExpression();
    while (this.matchKeyword('AND')) {
      const right = this.parseEqualityExpression();
      expr = { type: 'BINARY_OP', operator: 'AND', left: expr, right };
    }
    return expr;
  }

  private parseEqualityExpression(): ASTExpression {
    let expr = this.parseRelationalExpression();
    while (
      this.checkOperator('=') ||
      this.checkOperator('!=') ||
      this.checkOperator('<>') ||
      this.checkKeyword('LIKE') ||
      this.checkKeyword('IS') ||
      this.checkKeyword('IN') ||
      this.checkKeyword('BETWEEN')
    ) {
      if (this.matchKeyword('LIKE')) {
        const right = this.parseRelationalExpression();
        expr = { type: 'BINARY_OP', operator: 'LIKE', left: expr, right };
      } else if (this.matchKeyword('IS')) {
        let isNot = false;
        if (this.matchKeyword('NOT')) {
          isNot = true;
        }
        this.consumeKeyword('NULL', "Expected 'NULL' after IS");
        expr = { type: 'UNARY_OP', operator: isNot ? 'IS NOT NULL' : 'IS NULL', left: expr };
      } else if (this.matchKeyword('IN')) {
        this.consumePunctuation('(', "Expected '(' after IN");
        const list: ASTExpression[] = [];
        do {
          list.push(this.parseExpression());
        } while (this.matchPunctuation(','));
        this.consumePunctuation(')', "Expected ')' after IN list");
        expr = { type: 'BINARY_OP', operator: 'IN', left: expr, right: { type: 'LITERAL', value: list } };
      } else if (this.matchKeyword('BETWEEN')) {
        const low = this.parseRelationalExpression();
        this.consumeKeyword('AND', "Expected 'AND' in BETWEEN clause");
        const high = this.parseRelationalExpression();
        expr = { type: 'BINARY_OP', operator: 'BETWEEN', left: expr, right: { type: 'LITERAL', value: [low, high] } };
      } else {
        const op = this.advance().value;
        const right = this.parseRelationalExpression();
        expr = { type: 'BINARY_OP', operator: op, left: expr, right };
      }
    }
    return expr;
  }

  private parseRelationalExpression(): ASTExpression {
    let expr = this.parseAdditiveExpression();
    while (
      this.checkOperator('<') ||
      this.checkOperator('>') ||
      this.checkOperator('<=') ||
      this.checkOperator('>=')
    ) {
      const op = this.advance().value;
      const right = this.parseAdditiveExpression();
      expr = { type: 'BINARY_OP', operator: op, left: expr, right };
    }
    return expr;
  }

  private parseAdditiveExpression(): ASTExpression {
    let expr = this.parseMultiplicativeExpression();
    while (this.checkOperator('+') || this.checkOperator('-')) {
      const op = this.advance().value;
      const right = this.parseMultiplicativeExpression();
      expr = { type: 'BINARY_OP', operator: op, left: expr, right };
    }
    return expr;
  }

  private parseMultiplicativeExpression(): ASTExpression {
    let expr = this.parsePrimaryExpression();
    while (this.checkOperator('*') || this.checkOperator('/') || this.checkOperator('%')) {
      const op = this.advance().value;
      const right = this.parsePrimaryExpression();
      expr = { type: 'BINARY_OP', operator: op, left: expr, right };
    }
    return expr;
  }

  private parsePrimaryExpression(): ASTExpression {
    // Star (*)
    if (this.checkOperator('*')) {
      this.advance();
      return { type: 'STAR' };
    }

    // Number Literal
    if (this.checkToken('NUMBER')) {
      const val = parseFloat(this.advance().value);
      return { type: 'LITERAL', value: val };
    }

    // String Literal
    if (this.checkToken('STRING')) {
      const val = this.advance().value;
      return { type: 'LITERAL', value: val };
    }

    // Keywords TRUE, FALSE, NULL
    if (this.matchKeyword('TRUE')) return { type: 'LITERAL', value: true };
    if (this.matchKeyword('FALSE')) return { type: 'LITERAL', value: false };
    if (this.matchKeyword('NULL')) return { type: 'LITERAL', value: null };

    // CASE WHEN ... THEN ... ELSE ... END
    if (this.matchKeyword('CASE')) {
      // Simplified Case expression representation
      const args: ASTExpression[] = [];
      while (this.matchKeyword('WHEN')) {
        args.push(this.parseExpression());
        this.consumeKeyword('THEN', "Expected 'THEN' in CASE clause");
        args.push(this.parseExpression());
      }
      if (this.matchKeyword('ELSE')) {
        args.push(this.parseExpression());
      }
      this.consumeKeyword('END', "Expected 'END' for CASE clause");
      return { type: 'CASE', args };
    }

    // Parentheses
    if (this.matchPunctuation('(')) {
      const expr = this.parseExpression();
      this.consumePunctuation(')', "Expected ')' after expression");
      return expr;
    }

    // Function calls OR Identifiers (tbl.col or col)
    if (this.checkToken('IDENTIFIER') || this.checkToken('KEYWORD')) {
      const nameToken = this.advance();
      const name = nameToken.value;

      // Check if function call
      if (this.matchPunctuation('(')) {
        const args: ASTExpression[] = [];
        if (!this.checkPunctuation(')')) {
          do {
            args.push(this.parseExpression());
          } while (this.matchPunctuation(','));
        }
        this.consumePunctuation(')', "Expected ')' after function arguments");
        return { type: 'FUNCTION_CALL', name: name.toUpperCase(), args };
      }

      // Check table.column or table.*
      if (this.matchPunctuation('.')) {
        if (this.checkOperator('*')) {
          this.advance();
          return { type: 'STAR', table: name };
        }
        const colToken = this.consumeToken('IDENTIFIER', 'Expected column name after .');
        return { type: 'IDENTIFIER', name: colToken.value, table: name };
      }

      return { type: 'IDENTIFIER', name };
    }

    throw new ParserError(`Unexpected token '${this.peek().value}'`, this.peek());
  }

  // Token helper methods
  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '', line: 0, column: 0 };
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.tokens[this.current - 1];
  }

  private checkToken(type: Token['type']): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkKeyword(keyword: string): boolean {
    return this.peek().type === 'KEYWORD' && this.peek().value.toUpperCase() === keyword.toUpperCase();
  }

  private checkOperator(op: string): boolean {
    return this.peek().type === 'OPERATOR' && this.peek().value === op;
  }

  private checkPunctuation(p: string): boolean {
    return this.peek().type === 'PUNCTUATION' && this.peek().value === p;
  }

  private matchKeyword(keyword: string): boolean {
    if (this.checkKeyword(keyword)) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchPunctuation(p: string): boolean {
    if (this.checkPunctuation(p)) {
      this.advance();
      return true;
    }
    return false;
  }

  private isKeywordAhead(): boolean {
    const val = this.peek().value.toUpperCase();
    return ['FROM', 'WHERE', 'JOIN', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'INNER', 'LEFT', 'RIGHT'].includes(val);
  }

  private consumeToken(type: Token['type'], message: string): Token {
    if (this.checkToken(type)) return this.advance();
    throw new ParserError(message, this.peek());
  }

  private consumeKeyword(keyword: string, message: string): Token {
    if (this.checkKeyword(keyword)) return this.advance();
    throw new ParserError(message, this.peek());
  }

  private consumePunctuation(p: string, message: string): Token {
    if (this.checkPunctuation(p)) return this.advance();
    throw new ParserError(message, this.peek());
  }

  private consumeOperator(op: string, message: string): Token {
    if (this.checkOperator(op)) return this.advance();
    throw new ParserError(message, this.peek());
  }

  private consumeIdentifier(message: string): string {
    if (this.checkToken('IDENTIFIER') || this.checkToken('KEYWORD')) {
      return this.advance().value;
    }
    throw new ParserError(message, this.peek());
  }

  private parseIdentifierOrString(): string {
    if (this.checkToken('IDENTIFIER') || this.checkToken('KEYWORD') || this.checkToken('STRING')) {
      return this.advance().value;
    }
    throw new ParserError('Expected identifier or string', this.peek());
  }
}
