import React from 'react';

/**
 * Sanitizes URLs to allow only safe protocols (http, https, mailto).
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '#';
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:')
  ) {
    return trimmed;
  }
  return '#';
}

/**
 * Unescapes LaTeX special character escape sequences and replaces dashes.
 */
export function unescapeLaTeXText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\%/g, '%')
    .replace(/\\&/g, '&')
    .replace(/\\\$/g, '$')
    .replace(/\\#/g, '#')
    .replace(/\\_/g, '_')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    .replace(/\\~/g, '~')
    .replace(/\\backslash/g, '\\')
    .replace(/---/g, '—')
    .replace(/--/g, '–');
}

/**
 * Strips comments and LaTeX document preamble.
 */
export function stripPreambleAndComments(latexCode: string): string {
  if (!latexCode) return '';

  let code = latexCode;

  // 1. Extract document environment if present
  const docMatch = code.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (docMatch) {
    code = docMatch[1];
  } else {
    // Strip preamble commands if no \begin{document} wrapper
    code = code
      .replace(/\\documentclass(\[[^\]]*\])?\{[^}]*\}/g, '')
      .replace(/\\usepackage(\[[^\]]*\])?\{[^}]*\}/g, '')
      .replace(/\\hypersetup\{[^}]*\}/g, '')
      .replace(/\\setlist(\[[^\]]*\])?\{[^}]*\}/g, '')
      .replace(/\\titleformat\{[^}]*\}(\[[^\]]*\])?\{[^}]*\}\{[^}]*\}\{[^}]*\}(\[[^\]]*\])?/g, '');
  }

  // 2. Remove comments (% ...), making sure not to remove escaped \%
  const lines = code.split('\n');
  const cleanedLines = lines.map((line) => {
    let result = '';
    let isEscaped = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '\\') {
        isEscaped = !isEscaped;
        result += char;
      } else if (char === '%' && !isEscaped) {
        // Comment starts here, discard rest of line
        break;
      } else {
        isEscaped = false;
        result += char;
      }
    }
    return result;
  });

  return cleanedLines.join('\n').trim();
}

/**
 * Finds the index of the matching closing brace '}' starting from the position of '{'.
 */
export function findMatchingBrace(text: string, openIndex: number): number {
  if (text[openIndex] !== '{') return -1;
  let depth = 1;
  for (let i = openIndex + 1; i < text.length; i++) {
    if (text[i] === '{' && text[i - 1] !== '\\') {
      depth++;
    } else if (text[i] === '}' && text[i - 1] !== '\\') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Finds the index of the matching closing bracket ']' starting from the position of '['.
 */
export function findMatchingBracket(text: string, openIndex: number): number {
  if (text[openIndex] !== '[') return -1;
  let depth = 1;
  for (let i = openIndex + 1; i < text.length; i++) {
    if (text[i] === '[' && text[i - 1] !== '\\') {
      depth++;
    } else if (text[i] === ']' && text[i - 1] !== '\\') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Reads a LaTeX argument in braces `{...}` starting at index.
 * Returns the inner string and the next index after `}`.
 */
function readBraceArg(text: string, startIndex: number): { content: string; nextIndex: number } | null {
  // Skip whitespace
  let pos = startIndex;
  while (pos < text.length && /\s/.test(text[pos])) pos++;

  if (pos >= text.length || text[pos] !== '{') return null;

  const closeIdx = findMatchingBrace(text, pos);
  if (closeIdx === -1) return null;

  return {
    content: text.slice(pos + 1, closeIdx),
    nextIndex: closeIdx + 1,
  };
}

/**
 * Reads an optional LaTeX argument in brackets `[...]` starting at index.
 * Returns the inner string and the next index after `]`.
 */
function readOptArg(text: string, startIndex: number): { content: string; nextIndex: number } | null {
  let pos = startIndex;
  while (pos < text.length && /\s/.test(text[pos])) pos++;

  if (pos >= text.length || text[pos] !== '[') return null;

  const closeIdx = findMatchingBracket(text, pos);
  if (closeIdx === -1) return null;

  return {
    content: text.slice(pos + 1, closeIdx),
    nextIndex: closeIdx + 1,
  };
}

/**
 * Finds environment bounds `\begin{name}` ... `\end{name}`.
 */
function findEnvironment(text: string, startIndex: number, envName: string): { body: string; nextIndex: number } | null {
  const endTag = `\\end{${envName}}`;
  let depth = 1;
  let searchPos = startIndex;

  const beginPattern = new RegExp(`\\\\begin\\{${envName}\\}`);
  const endPattern = new RegExp(`\\\\end\\{${envName}\\}`);

  while (searchPos < text.length) {
    const nextBegin = text.slice(searchPos).search(beginPattern);
    const nextEnd = text.slice(searchPos).search(endPattern);

    if (nextEnd === -1) return null;

    if (nextBegin !== -1 && nextBegin < nextEnd) {
      depth++;
      searchPos += nextBegin + `\\begin{${envName}}`.length;
    } else {
      depth--;
      if (depth === 0) {
        const body = text.slice(startIndex, searchPos + nextEnd);
        const nextIndex = searchPos + nextEnd + endTag.length;
        return { body, nextIndex };
      }
      searchPos += nextEnd + endTag.length;
    }
  }

  return null;
}

/**
 * Recursive LaTeX AST to React Node Renderer
 */
export function parseLaTeXToReact(latexInput: string, parentFontSize?: string): React.ReactNode[] {
  if (!latexInput) return [];

  const nodes: React.ReactNode[] = [];
  let pos = 0;
  let keyIdx = 0;
  let textBuffer = '';

  const flushText = () => {
    if (textBuffer) {
      let clean = unescapeLaTeXText(textBuffer);
      if (nodes.length === 0) {
        clean = clean.trimStart();
      }
      if (clean) {
        if (parentFontSize) {
          nodes.push(
            React.createElement('span', { key: `txt-${keyIdx++}`, className: parentFontSize }, clean)
          );
        } else {
          nodes.push(clean);
        }
      }
      textBuffer = '';
    }
  };

  while (pos < latexInput.length) {
    const char = latexInput[pos];

    // ----------------------------------------------------
    // 1. Line Break \\ or \\[spacing]
    // ----------------------------------------------------
    if (char === '\\' && latexInput[pos + 1] === '\\') {
      flushText();
      let nextPos = pos + 2;
      // Consume optional spacing argument e.g. \\[3pt] or \\[2pt]
      const opt = readOptArg(latexInput, nextPos);
      if (opt) {
        nextPos = opt.nextIndex;
      }
      nodes.push(React.createElement('br', { key: `br-${keyIdx++}`, className: 'ats-br' }));
      pos = nextPos;
      continue;
    }

    // ----------------------------------------------------
    // 2. Non-breaking space ~
    // ----------------------------------------------------
    if (char === '~') {
      flushText();
      nodes.push('\u00A0');
      pos++;
      continue;
    }

    // ----------------------------------------------------
    // 3. LaTeX Commands starting with \
    // ----------------------------------------------------
    if (char === '\\') {
      // Check for escaped special characters: \%, \&, \$, \#, \_, \{, \}
      const nextChar = latexInput[pos + 1];
      if (['%', '&', '$', '#', '_', '{', '}'].includes(nextChar)) {
        textBuffer += nextChar;
        pos += 2;
        continue;
      }

      // Read command name
      const cmdMatch = latexInput.slice(pos).match(/^\\([a-zA-Z]+)/);
      if (cmdMatch) {
        const cmdName = cmdMatch[1];
        const cmdEndPos = pos + cmdMatch[0].length;

        // --- \begin{environment} ---
        if (cmdName === 'begin') {
          const envArg = readBraceArg(latexInput, cmdEndPos);
          if (envArg) {
            const envName = envArg.content.trim();
            let envStartPos = envArg.nextIndex;

            // Consume optional environment arguments like [leftmargin=*] or [noitemsep]
            const opt = readOptArg(latexInput, envStartPos);
            if (opt) {
              envStartPos = opt.nextIndex;
            }

            const envData = findEnvironment(latexInput, envStartPos, envName);
            if (envData) {
              flushText();

              if (envName === 'center') {
                nodes.push(
                  React.createElement(
                    'div',
                    { key: `center-${keyIdx++}`, className: 'ats-center' },
                    parseLaTeXToReact(envData.body)
                  )
                );
              } else if (envName === 'itemize' || envName === 'enumerate') {
                const isOrdered = envName === 'enumerate';
                const Tag = isOrdered ? 'ol' : 'ul';

                // Split body by \item
                const itemParts = envData.body.split(/\\item\b/);
                const listItems: React.ReactNode[] = [];

                itemParts.forEach((part, itemIdx) => {
                  const trimmedPart = part.trim();
                  if (trimmedPart) {
                    listItems.push(
                      React.createElement(
                        'li',
                        { key: `li-${itemIdx}`, className: 'ats-list-item' },
                        parseLaTeXToReact(trimmedPart)
                      )
                    );
                  }
                });

                nodes.push(
                  React.createElement(
                    Tag,
                    { key: `list-${keyIdx++}`, className: 'ats-list' },
                    listItems
                  )
                );
              } else {
                // Unsupported environment fallback
                nodes.push(
                  React.createElement(
                    'div',
                    { key: `env-${keyIdx++}`, className: `ats-env-${envName}` },
                    parseLaTeXToReact(envData.body)
                  )
                );
              }

              pos = envData.nextIndex;
              continue;
            }
          }
        }

        // --- Inline Formatting Commands ---
        if (cmdName === 'textbf') {
          const arg = readBraceArg(latexInput, cmdEndPos);
          if (arg) {
            flushText();
            nodes.push(
              React.createElement(
                'strong',
                { key: `bold-${keyIdx++}`, className: 'ats-bold' },
                parseLaTeXToReact(arg.content)
              )
            );
            pos = arg.nextIndex;
            continue;
          }
        }

        if (cmdName === 'textit' || cmdName === 'emph') {
          const arg = readBraceArg(latexInput, cmdEndPos);
          if (arg) {
            flushText();
            nodes.push(
              React.createElement(
                'em',
                { key: `italic-${keyIdx++}`, className: 'ats-italic' },
                parseLaTeXToReact(arg.content)
              )
            );
            pos = arg.nextIndex;
            continue;
          }
        }

        if (cmdName === 'texttt') {
          const arg = readBraceArg(latexInput, cmdEndPos);
          if (arg) {
            flushText();
            nodes.push(
              React.createElement(
                'code',
                { key: `code-${keyIdx++}`, className: 'ats-code' },
                parseLaTeXToReact(arg.content)
              )
            );
            pos = arg.nextIndex;
            continue;
          }
        }

        // --- Links \href{url}{label} ---
        if (cmdName === 'href') {
          const urlArg = readBraceArg(latexInput, cmdEndPos);
          if (urlArg) {
            const labelArg = readBraceArg(latexInput, urlArg.nextIndex);
            if (labelArg) {
              flushText();
              const safeUrl = sanitizeUrl(urlArg.content);
              nodes.push(
                React.createElement(
                  'a',
                  {
                    key: `href-${keyIdx++}`,
                    href: safeUrl,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: 'ats-link',
                  },
                  parseLaTeXToReact(labelArg.content)
                )
              );
              pos = labelArg.nextIndex;
              continue;
            }
          }
        }

        // --- Sections & Subsections ---
        if (cmdName === 'section') {
          const arg = readBraceArg(latexInput, cmdEndPos);
          if (arg) {
            flushText();
            nodes.push(
              React.createElement(
                'div',
                { key: `sec-wrapper-${keyIdx++}`, className: 'ats-section-wrapper' },
                React.createElement(
                  'h2',
                  { className: 'ats-section-title' },
                  parseLaTeXToReact(arg.content)
                ),
                React.createElement('hr', { className: 'ats-section-divider' })
              )
            );
            pos = arg.nextIndex;
            continue;
          }
        }

        if (cmdName === 'subsection') {
          const arg = readBraceArg(latexInput, cmdEndPos);
          if (arg) {
            flushText();
            nodes.push(
              React.createElement(
                'h3',
                { key: `subsec-${keyIdx++}`, className: 'ats-subsection-title' },
                parseLaTeXToReact(arg.content)
              )
            );
            pos = arg.nextIndex;
            continue;
          }
        }

        // --- Spacing Commands ---
        if (cmdName === 'hfill') {
          flushText();
          nodes.push(React.createElement('span', { key: `hfill-${keyIdx++}`, className: 'ats-spacer' }));
          pos = cmdEndPos;
          continue;
        }

        if (cmdName === 'vspace' || cmdName === 'hspace') {
          const arg = readBraceArg(latexInput, cmdEndPos);
          pos = arg ? arg.nextIndex : cmdEndPos;
          continue;
        }

        // --- Font Sizes (\Large, \large, \normalsize, \small, \huge, \Huge) ---
        if (['Large', 'large', 'normalsize', 'small', 'huge', 'Huge'].includes(cmdName)) {
          // If standalone, skip the command name
          pos = cmdEndPos;
          continue;
        }
      }

      // Unhandled single-backslash command or text
      textBuffer += latexInput[pos];
      pos++;
      continue;
    }

    // ----------------------------------------------------
    // 4. Scoped Groups {...} e.g. {\Large \textbf{ADITYA}}
    // ----------------------------------------------------
    if (char === '{') {
      const closeIdx = findMatchingBrace(latexInput, pos);
      if (closeIdx !== -1) {
        flushText();
        const groupContent = latexInput.slice(pos + 1, closeIdx);

        // Check if group starts with a font size modifier like \Large
        let groupFontSize = parentFontSize;
        const fontMatch = groupContent.match(/^\\(Large|large|normalsize|small|huge|Huge)\b/);
        let innerContent = groupContent;

        if (fontMatch) {
          const fontCmd = fontMatch[1].toLowerCase();
          groupFontSize = `ats-${fontCmd}`;
          innerContent = groupContent.slice(fontMatch[0].length);
        }

        const childNodes = parseLaTeXToReact(innerContent, groupFontSize);
        if (groupFontSize && !parentFontSize) {
          nodes.push(
            React.createElement(
              'span',
              { key: `group-${keyIdx++}`, className: groupFontSize },
              childNodes
            )
          );
        } else {
          nodes.push(...childNodes);
        }

        pos = closeIdx + 1;
        continue;
      }
    }

    // ----------------------------------------------------
    // 5. Default: Collect text character
    // ----------------------------------------------------
    textBuffer += char;
    pos++;
  }

  flushText();
  return nodes;
}

/**
 * Main Exported LaTeX Document Parser for ATS Resume Preview
 */
export function parseLaTeXDocument(latexCode: string): React.ReactNode[] {
  if (!latexCode || typeof latexCode !== 'string') return [];
  const cleanCode = stripPreambleAndComments(latexCode);
  return parseLaTeXToReact(cleanCode);
}
