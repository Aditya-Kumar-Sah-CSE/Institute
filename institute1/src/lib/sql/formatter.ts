import { tokenize } from './tokenizer';

export function formatSQL(sql: string): string {
  try {
    const tokens = tokenize(sql);
    let formatted = '';
    let indentLevel = 0;
    let newLine = true;

    const majorKeywords = new Set([
      'SELECT', 'FROM', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN',
      'FULL JOIN', 'CROSS JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY',
      'LIMIT', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'WITH'
    ]);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === 'EOF') break;

      const upperVal = token.value.toUpperCase();

      // Check double-keyword combinations (GROUP BY, ORDER BY, INNER JOIN, etc.)
      let combinedVal = upperVal;
      const nextToken = tokens[i + 1];
      if (nextToken && nextToken.type === 'KEYWORD') {
        const pair = `${upperVal} ${nextToken.value.toUpperCase()}`;
        if (majorKeywords.has(pair)) {
          combinedVal = pair;
          i++; // Consume next keyword
        }
      }

      if (majorKeywords.has(combinedVal)) {
        if (formatted.trim().length > 0) {
          formatted += '\n';
        }
        formatted += combinedVal + '\n  ';
        newLine = true;
        continue;
      }

      if (token.type === 'PUNCTUATION' && token.value === ',') {
        formatted += ',\n  ';
        newLine = true;
        continue;
      }

      if (token.type === 'PUNCTUATION' && token.value === ';') {
        formatted += ';\n\n';
        newLine = true;
        continue;
      }

      if (!newLine && formatted.length > 0 && !formatted.endsWith(' ') && !formatted.endsWith('(') && token.value !== ')') {
        formatted += ' ';
      }

      formatted += token.value;
      newLine = false;
    }

    return formatted.trim();
  } catch (_err) {
    // If tokenization fails due to syntax error, return original string nicely trimmed
    return sql.trim();
  }
}
