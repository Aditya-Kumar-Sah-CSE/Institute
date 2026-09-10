import { DiagnosticError } from './types';

export class ErrorParser {
  /**
   * Parses raw terminal / compilation stdout & stderr into structured DiagnosticError objects.
   */
  public static parseCompilerOutput(rawOutput: string): DiagnosticError[] {
    if (!rawOutput || typeof rawOutput !== 'string') return [];

    const diagnostics: DiagnosticError[] = [];
    const lines = rawOutput.split('\n');

    // Pattern 1: TypeScript compiler error: "src/app/login/page.tsx(14,23): error TS2304: Cannot find name 'foo'."
    const tsErrorPattern = /^([^\s(:]+)\((\d+),(\d+)\):\s*(error|warning)\s*(TS\d+)?:?\s*(.+)$/i;

    // Pattern 2: Next.js build error: "Type error: Cannot find module '@/components/ui/Button' or its corresponding type declarations."
    // Followed by "./src/app/login/page.tsx:12:34"
    const nextPathPattern = /^\s*(\.\/)?([^\s:]+):(\d+):(\d+)\s*$/;

    let currentFile = '';
    let currentLine = 1;
    let currentCol = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      const matchTS = line.match(tsErrorPattern);
      if (matchTS) {
        diagnostics.push({
          file: matchTS[1].replace(/\\/g, '/'),
          line: parseInt(matchTS[2], 10),
          column: parseInt(matchTS[3], 10),
          severity: matchTS[4].toLowerCase() === 'warning' ? 'warning' : 'error',
          code: matchTS[5] || undefined,
          message: matchTS[6].trim()
        });
        continue;
      }

      const matchNext = line.match(nextPathPattern);
      if (matchNext) {
        currentFile = matchNext[2].replace(/\\/g, '/');
        currentLine = parseInt(matchNext[3], 10);
        currentCol = parseInt(matchNext[4], 10);
      }

      if (line.startsWith('Type error:') || line.startsWith('Failed to compile')) {
        diagnostics.push({
          file: currentFile || 'unknown',
          line: currentLine,
          column: currentCol,
          severity: 'error',
          message: line
        });
      }
    }

    return diagnostics;
  }
}
