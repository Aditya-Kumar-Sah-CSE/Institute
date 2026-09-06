export function insertSnippetAtPosition(
  currentCode: string,
  snippet: string,
  selectionStart: number = currentCode.length
): { newCode: string; newCursorPos: number } {
  const before = currentCode.substring(0, selectionStart);
  const after = currentCode.substring(selectionStart);
  const newCode = before + snippet + after;
  return {
    newCode,
    newCursorPos: selectionStart + snippet.length,
  };
}

export function replaceTitleInLatex(currentCode: string, newTitle: string): string {
  if (/\\title\{[^}]*\}/.test(currentCode)) {
    return currentCode.replace(/\\title\{[^}]*\}/, `\\title{${newTitle}}`);
  } else if (/\\section\*?\{[^}]*\}/.test(currentCode)) {
    return currentCode.replace(/\\section\*?\{[^}]*\}/, `\\section*{${newTitle}}`);
  } else {
    return `\\title{${newTitle}}\n` + currentCode;
  }
}

export function generateMatrixSnippet(rows: number = 3, cols: number = 3, envType: string = 'pmatrix'): string {
  let lines: string[] = [];
  lines.push(`\\begin{${envType}}`);
  for (let r = 0; r < rows; r++) {
    let rowVals: string[] = [];
    for (let c = 0; c < cols; c++) {
      rowVals.push(`a_{${r + 1}${c + 1}}`);
    }
    lines.push('  ' + rowVals.join(' & ') + (r < rows - 1 ? ' \\\\' : ''));
  }
  lines.push(`\\end{${envType}}`);
  return lines.join('\n');
}

export function generateSymmetricMatrix(size: number = 3): string {
  let lines: string[] = [];
  lines.push(`\\begin{pmatrix}`);
  for (let r = 0; r < size; r++) {
    let rowVals: string[] = [];
    for (let c = 0; c < size; c++) {
      if (r === c) {
        rowVals.push(`${r + 1}`);
      } else {
        const minIdx = Math.min(r + 1, c + 1);
        const maxIdx = Math.max(r + 1, c + 1);
        rowVals.push(`k_{${minIdx}${maxIdx}}`);
      }
    }
    lines.push('  ' + rowVals.join(' & ') + (r < size - 1 ? ' \\\\' : ''));
  }
  lines.push(`\\end{pmatrix}`);
  return lines.join('\n');
}

export function makeCurrentMatrixSymmetric(currentCode: string): string {
  // If there's an existing pmatrix or bmatrix, attempt to balance it symmetrically
  return currentCode.replace(/\\begin\{(pmatrix|bmatrix)\}([\s\S]*?)\\end\{\1\}/g, () => {
    return generateSymmetricMatrix(3);
  });
}
