'use client';

import React from 'react';

interface SymbolToolbarProps {
  onInsertSnippet: (snippet: string) => void;
}

export default function SymbolToolbar({ onInsertSnippet }: SymbolToolbarProps) {
  const symbols = [
    { label: '∫ Integrals', snippet: '\\int_{a}^{b} f(x) \\, dx' },
    { label: '∬ Double Int', snippet: '\\iint_{R} f(x, y) \\, dA' },
    { label: 'd/dx Deriv', snippet: '\\frac{d}{dx}\\left( f(x) \\right)' },
    { label: '∑ Summation', snippet: '\\sum_{n=1}^{\\infty} a_n' },
    { label: 'lim Limit', snippet: '\\lim_{x \\to 0}' },
    { label: 'a/b Fraction', snippet: '\\frac{a}{b}' },
    { label: '√ Root', snippet: '\\sqrt{x}' },
    { label: '3x3 Matrix', snippet: '\\begin{pmatrix}\n  a & b & c \\\\\n  d & e & f \\\\\n  g & h & i\n\\end{pmatrix}' },
    { label: '2x2 Matrix', snippet: '\\begin{pmatrix}\n  a & b \\\\\n  c & d\n\\end{pmatrix}' },
    { label: 'α Alpha', snippet: '\\alpha' },
    { label: 'β Beta', snippet: '\\beta' },
    { label: 'θ Theta', snippet: '\\theta' },
    { label: 'π Pi', snippet: '\\pi' },
    { label: '∞ Infinity', snippet: '\\infty' },
    { label: '± Plus-Minus', snippet: '\\pm' },
    { label: '≤ Less/Eq', snippet: '\\le' },
    { label: '≥ Greater/Eq', snippet: '\\ge' },
    { label: '≠ Not Equal', snippet: '\\ne' },
    { label: '→ Arrow', snippet: '\\rightarrow' },
    { label: 'Aligned Env', snippet: '\\begin{aligned}\n  a &= b + c \\\\\n  d &= e + f\n\\end{aligned}' },
  ];

  return (
    <div className="symbol-toolbar">
      <div className="toolbar-label">Quick Snippets:</div>
      <div className="symbol-chips-wrapper">
        {symbols.map((item) => (
          <button
            key={item.label}
            className="symbol-chip"
            onClick={() => onInsertSnippet(item.snippet)}
            title={`Click to insert ${item.label}`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
