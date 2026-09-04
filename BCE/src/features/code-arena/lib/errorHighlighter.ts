/**
 * Utility to parse compilation / runtime errors and highlight error lines in Monaco Editor.
 */

export interface ErrorLineResult {
  lineNumber: number;
  message: string;
}

export function parseErrorLine(errorText: string, codeText: string): ErrorLineResult | null {
  if (!errorText || typeof errorText !== 'string' || !codeText) return null;

  const codeLines = codeText.split('\n');
  const totalLines = codeLines.length;

  // 1. Regular expression patterns for compiler line outputs
  // GCC / Clang: prog.cc:593:2: error: ... OR input.cpp:25:5: error: ...
  // Java: Main.java:25: error: ...
  // Python: File "solution.py", line 25, in ...
  const gccPattern = /(?:[a-zA-Z0-9_\-\./\\]+):(\d+)(?::\d+)?:?\s*(?:error|fatal error|warning)?:?\s*(.*)/i;
  const pyPattern = /File ".*?", line (\d+)(?:, in .*)?[\r\n]+(?:\s*)(.*)/i;
  const javaPattern = /:\s*(\d+):\s*error:\s*(.*)/i;
  const genericLinePattern = /(?:line\s+|:)(\d+)(?::\d+)?/i;

  let rawLine: number | null = null;
  let rawMsg = 'Compilation/Runtime Error';

  const gccMatch = errorText.match(gccPattern);
  const pyMatch = errorText.match(pyPattern);
  const javaMatch = errorText.match(javaPattern);

  if (gccMatch) {
    rawLine = parseInt(gccMatch[1], 10);
    if (gccMatch[2] && gccMatch[2].trim()) rawMsg = gccMatch[2].trim();
  } else if (javaMatch) {
    rawLine = parseInt(javaMatch[1], 10);
    if (javaMatch[2] && javaMatch[2].trim()) rawMsg = javaMatch[2].trim();
  } else if (pyMatch) {
    rawLine = parseInt(pyMatch[1], 10);
    if (pyMatch[2] && pyMatch[2].trim()) rawMsg = pyMatch[2].trim();
  } else {
    const genMatch = errorText.match(genericLinePattern);
    if (genMatch) {
      rawLine = parseInt(genMatch[1], 10);
    }
  }

  if (!rawLine || isNaN(rawLine)) return null;

  // Case A: Line number is directly within student code range (1..totalLines)
  if (rawLine >= 1 && rawLine <= totalLines) {
    return { lineNumber: rawLine, message: rawMsg };
  }

  // Case B: Wrapped harness line (rawLine > totalLines).
  // Check if error output printed a code snippet line, e.g. " 593 | }"
  const snippetMatch = errorText.match(/\d+\s*\|\s*(.+)/);
  if (snippetMatch) {
    const snippetText = snippetMatch[1].trim();
    if (snippetText) {
      // Find matching line in student code from bottom up
      for (let i = totalLines - 1; i >= 0; i--) {
        if (codeLines[i].trim() === snippetText) {
          return { lineNumber: i + 1, message: rawMsg };
        }
      }
    }
  }

  // Fallback: If line number > totalLines, check if moduloLine points to valid line
  if (rawLine > totalLines && totalLines > 0) {
    const moduloLine = ((rawLine - 1) % totalLines) + 1;
    if (moduloLine >= 1 && moduloLine <= totalLines) {
      return { lineNumber: moduloLine, message: rawMsg };
    }
  }

  return null;
}

export function highlightErrorInMonaco(
  editor: any,
  monaco: any,
  errorText: string | null | undefined,
  codeText: string,
  decorationsRef: { current: string[] }
) {
  if (!editor || !monaco) return;

  const model = editor.getModel();
  if (!model) return;

  // Clear previous error markers and line highlights if no error
  if (!errorText || !errorText.trim()) {
    monaco.editor.setModelMarkers(model, 'compiler-error', []);
    if (decorationsRef.current && decorationsRef.current.length > 0) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }
    return;
  }

  const errResult = parseErrorLine(errorText, codeText);
  if (!errResult) {
    // If line couldn't be parsed, clear line highlights
    monaco.editor.setModelMarkers(model, 'compiler-error', []);
    if (decorationsRef.current && decorationsRef.current.length > 0) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }
    return;
  }

  const { lineNumber, message } = errResult;
  const lineContent = model.getLineContent(lineNumber) || '';
  const maxCol = Math.max(lineContent.length + 1, 2);

  // 1. Set Monaco Marker (Inline red squiggly + Hover tooltip)
  monaco.editor.setModelMarkers(model, 'compiler-error', [
    {
      startLineNumber: lineNumber,
      startColumn: 1,
      endLineNumber: lineNumber,
      endColumn: maxCol,
      message: message,
      severity: monaco.MarkerSeverity.Error,
    },
  ]);

  // 2. Set Whole-Line Red Background Decoration
  const newDecorations = [
    {
      range: new monaco.Range(lineNumber, 1, lineNumber, maxCol),
      options: {
        isWholeLine: true,
        className: 'monaco-error-line-highlight',
        glyphMarginClassName: 'monaco-error-line-glyph',
      },
    },
  ];

  if (decorationsRef.current) {
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }

  // 3. Reveal and scroll to the error line
  editor.revealLineInCenterIfOutsideViewport(lineNumber);
}
