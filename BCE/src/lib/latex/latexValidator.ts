export interface SyntaxErrorItem {
  line: number;
  message: string;
  type: 'error' | 'warning';
}

export function validateLatex(code: string): SyntaxErrorItem[] {
  const errors: SyntaxErrorItem[] = [];
  if (!code) return errors;

  const lines = code.split('\n');
  const envStack: { name: string; line: number }[] = [];
  let braceDepth = 0;
  let bracketDepth = 0;

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

    for (let i = 0; i < lineText.length; i++) {
      const char = lineText[i];
      const prev = i > 0 ? lineText[i - 1] : '';

      if (prev === '\\') continue;

      if (char === '{') braceDepth++;
      if (char === '}') {
        braceDepth--;
        if (braceDepth < 0) {
          errors.push({
            line: lineNum,
            message: `Unexpected closing brace '}' at line ${lineNum}`,
            type: 'error',
          });
          braceDepth = 0;
        }
      }

      if (char === '[') bracketDepth++;
      if (char === ']') {
        bracketDepth--;
        if (bracketDepth < 0) {
          errors.push({
            line: lineNum,
            message: `Unexpected closing bracket ']' at line ${lineNum}`,
            type: 'error',
          });
          bracketDepth = 0;
        }
      }
    }

    const beginMatches = [...lineText.matchAll(/\\begin\{([a-zA-Z0-9*]+)\}/g)];
    for (const match of beginMatches) {
      envStack.push({ name: match[1], line: lineNum });
    }

    const endMatches = [...lineText.matchAll(/\\end\{([a-zA-Z0-9*]+)\}/g)];
    for (const match of endMatches) {
      const envName = match[1];
      if (envStack.length === 0) {
        errors.push({
          line: lineNum,
          message: `Unmatched \\end{${envName}} without matching \\begin at line ${lineNum}`,
          type: 'error',
        });
      } else {
        const lastEnv = envStack.pop();
        if (lastEnv && lastEnv.name !== envName) {
          errors.push({
            line: lineNum,
            message: `Mismatched environment: expected \\end{${lastEnv.name}} (opened at line ${lastEnv.line}) but found \\end{${envName}} at line ${lineNum}`,
            type: 'error',
          });
        }
      }
    }
  });

  if (braceDepth > 0) {
    errors.push({
      line: lines.length,
      message: `Unclosed curly brace '{' detected (missing ${braceDepth} closing brace(s)).`,
      type: 'warning',
    });
  }

  if (envStack.length > 0) {
    envStack.forEach((unclosed) => {
      errors.push({
        line: unclosed.line,
        message: `Unclosed LaTeX environment '\\begin{${unclosed.name}}' opened at line ${unclosed.line}.`,
        type: 'error',
      });
    });
  }

  return errors;
}
