import { Token, TokenType } from './types';

const KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'ON',
  'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'AS', 'DISTINCT',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER',
  'ADD', 'RENAME', 'COLUMN', 'TO', 'IF', 'NOT', 'EXISTS', 'AND', 'OR', 'IN', 'IS',
  'NULL', 'LIKE', 'BETWEEN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'WITH', 'INT',
  'INTEGER', 'TEXT', 'VARCHAR', 'REAL', 'FLOAT', 'DOUBLE', 'BOOLEAN', 'BOOL', 'DATE',
  'TIMESTAMP', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'COUNT', 'SUM', 'AVG', 'MIN',
  'MAX', 'UPPER', 'LOWER', 'LENGTH', 'CONCAT', 'ROUND', 'ABS', 'CEIL', 'FLOOR'
]);

export function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let column = 1;

  while (i < sql.length) {
    const char = sql[i];

    // Whitespace
    if (char === '\n') {
      line++;
      column = 1;
      i++;
      continue;
    }
    if (/\s/.test(char)) {
      column++;
      i++;
      continue;
    }

    // Line Comments (-- ...)
    if (char === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Block Comments (/* ... */)
    if (char === '/' && sql[i + 1] === '*') {
      i += 2;
      column += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) {
        if (sql[i] === '\n') {
          line++;
          column = 1;
        } else {
          column++;
        }
        i++;
      }
      i += 2;
      column += 2;
      continue;
    }

    // String Literals ('...' or "...")
    if (char === "'" || char === '"') {
      const startQuote = char;
      const startLine = line;
      const startCol = column;
      let str = '';
      i++;
      column++;
      while (i < sql.length) {
        if (sql[i] === startQuote) {
          if (sql[i + 1] === startQuote) {
            str += startQuote;
            i += 2;
            column += 2;
          } else {
            i++;
            column++;
            break;
          }
        } else {
          if (sql[i] === '\n') {
            line++;
            column = 1;
          } else {
            column++;
          }
          str += sql[i];
          i++;
        }
      }
      tokens.push({ type: 'STRING', value: str, line: startLine, column: startCol });
      continue;
    }

    // Quoted Identifiers (`...` or [...])
    if (char === '`' || char === '[') {
      const closingQuote = char === '`' ? '`' : ']';
      const startLine = line;
      const startCol = column;
      let ident = '';
      i++;
      column++;
      while (i < sql.length && sql[i] !== closingQuote) {
        ident += sql[i];
        i++;
        column++;
      }
      if (sql[i] === closingQuote) {
        i++;
        column++;
      }
      tokens.push({ type: 'IDENTIFIER', value: ident, line: startLine, column: startCol });
      continue;
    }

    // Numbers
    if (/\d/.test(char) || (char === '.' && /\d/.test(sql[i + 1] || ''))) {
      const startLine = line;
      const startCol = column;
      let numStr = '';
      while (i < sql.length && (/\d/.test(sql[i]) || sql[i] === '.')) {
        numStr += sql[i];
        i++;
        column++;
      }
      tokens.push({ type: 'NUMBER', value: numStr, line: startLine, column: startCol });
      continue;
    }

    // Multi-char Operators (<=, >=, !=, <>, ||)
    const nextTwo = sql.slice(i, i + 2);
    if (['<=', '>=', '!=', '<>'].includes(nextTwo)) {
      tokens.push({ type: 'OPERATOR', value: nextTwo, line, column });
      i += 2;
      column += 2;
      continue;
    }

    // Single-char Operators
    if (['=', '<', '>', '+', '-', '*', '/', '%'].includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char, line, column });
      i++;
      column++;
      continue;
    }

    // Punctuation
    if (['(', ')', ',', ';', '.'].includes(char)) {
      tokens.push({ type: 'PUNCTUATION', value: char, line, column });
      i++;
      column++;
      continue;
    }

    // Identifiers & Keywords
    if (/[a-zA-Z_]/.test(char)) {
      const startLine = line;
      const startCol = column;
      let word = '';
      while (i < sql.length && /[a-zA-Z0-9_]/.test(sql[i])) {
        word += sql[i];
        i++;
        column++;
      }
      const upperWord = word.toUpperCase();
      if (KEYWORDS.has(upperWord)) {
        tokens.push({ type: 'KEYWORD', value: upperWord, line: startLine, column: startCol });
      } else {
        tokens.push({ type: 'IDENTIFIER', value: word, line: startLine, column: startCol });
      }
      continue;
    }

    // Unknown character
    throw new Error(`Unexpected character '${char}' at line ${line}, column ${column}`);
  }

  tokens.push({ type: 'EOF', value: '', line, column });
  return tokens;
}
