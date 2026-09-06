'use client';

import React from 'react';
import { FileText } from 'lucide-react';

interface DocumentPreviewProps {
  code: string;
}

export default function DocumentPreview({ code }: DocumentPreviewProps) {
  // Parse metadata from LaTeX source
  const titleMatch = code.match(/\\title\{([^}]*)\}/);
  const authorMatch = code.match(/\\author\{([^}]*)\}/);
  const dateMatch = code.match(/\\date\{([^}]*)\}/);

  const title = titleMatch ? titleMatch[1] : 'LaTeX Document Preview';
  const author = authorMatch ? authorMatch[1] : 'SkillArena LaTeX Engine';
  const date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString();

  // Extract sections
  const sections: { title: string; body: string }[] = [];
  const sectionSplit = code.split(/\\section\*?\{([^}]*)\}/);

  for (let i = 1; i < sectionSplit.length; i += 2) {
    const secTitle = sectionSplit[i];
    const secBody = sectionSplit[i + 1] || '';
    sections.push({ title: secTitle, body: secBody });
  }

  return (
    <div className="document-preview-paper" id="document-preview-target">
      <div className="paper-header">
        <div className="paper-brand">
          <FileText className="w-5 h-5 text-indigo-400" />
          <span>Document View</span>
        </div>
        <div className="paper-watermark">CONFIDENTIAL &amp; DRAFT</div>
      </div>

      <div className="paper-content">
        <h1 className="doc-title">{title}</h1>
        <div className="doc-meta">
          <span className="doc-author">{author}</span>
          <span className="doc-separator">•</span>
          <span className="doc-date">{date}</span>
        </div>

        <div className="doc-divider" />

        {sections.length > 0 ? (
          sections.map((sec, idx) => (
            <div key={idx} className="doc-section">
              <h2 className="section-title">
                {idx + 1}. {sec.title}
              </h2>
              <div className="section-body">
                {sec.body
                  .replace(/\\begin\{equation\}|\\end\{equation\}/g, '')
                  .replace(/\\begin\{enumerate\}|\\end\{enumerate\}/g, '')
                  .replace(/\\begin\{itemize\}|\\end\{itemize\}/g, '')
                  .replace(/\\item/g, '• ')
                  .replace(/\\end\{document\}/g, '')
                  .trim()
                  .split('\n')
                  .map((line, lIdx) => (
                    <p key={lIdx} className="doc-paragraph">
                      {line}
                    </p>
                  ))}
              </div>
            </div>
          ))
        ) : (
          <div className="doc-body-fallback">
            <p>{code.replace(/\\documentclass\{[^}]*\}/, '').replace(/\\usepackage\{[^}]*\}/, '')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
