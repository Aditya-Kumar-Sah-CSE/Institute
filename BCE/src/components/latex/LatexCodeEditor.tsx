'use client';

import React, { useRef } from 'react';
import { Code, Trash2, Copy, Check } from 'lucide-react';

interface LatexCodeEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  onSelectionChange: (selectionStart: number) => void;
  onClear: () => void;
}

export default function LatexCodeEditor({
  code,
  onChange,
  onSelectionChange,
  onClear,
}: LatexCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = React.useState(false);

  const lines = code.split('\n');
  const lineCount = lines.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectOrClick = () => {
    if (textareaRef.current) {
      onSelectionChange(textareaRef.current.selectionStart);
    }
  };

  return (
    <div className="latex-editor-wrapper">
      <div className="editor-top-bar">
        <div className="editor-title">
          <Code className="w-4 h-4 text-cyan-400" />
          <span>LaTeX Source Code</span>
          <span className="stats-badge">{lineCount} lines</span>
        </div>
        <div className="editor-actions">
          <button className="editor-action-btn" onClick={handleCopy} title="Copy LaTeX Source">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button className="editor-action-btn danger" onClick={onClear} title="Clear Code">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="editor-container">
        <div className="line-numbers" aria-hidden="true">
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i + 1} className="line-num">
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="code-textarea"
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onClick={handleSelectOrClick}
          onKeyUp={handleSelectOrClick}
          spellCheck={false}
          placeholder="Type or speak LaTeX code here..."
        />
      </div>
    </div>
  );
}
