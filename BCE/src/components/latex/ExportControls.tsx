'use client';

import React, { useState } from 'react';
import { Download, Image, Copy, FileCode, Check } from 'lucide-react';
import { downloadLatexFile, exportElementAsPng } from '@/lib/latex/exportLatex';

interface ExportControlsProps {
  code: string;
}

export default function ExportControls({ code }: ExportControlsProps) {
  const [copiedTex, setCopiedTex] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);

  const handleCopyTex = () => {
    navigator.clipboard.writeText(code);
    setCopiedTex(true);
    setTimeout(() => setCopiedTex(false), 2000);
  };

  const handleCopyMarkdown = () => {
    const mdSnippet = `\`\`\`latex\n${code}\n\`\`\``;
    navigator.clipboard.writeText(mdSnippet);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleDownloadTex = () => {
    downloadLatexFile(code, 'latex-document.tex');
  };

  const handleExportPng = async () => {
    setIsExportingPng(true);
    await exportElementAsPng('latex-preview-container', 'latex-rendered.png');
    setIsExportingPng(false);
  };

  return (
    <div className="export-controls-bar">
      <div className="export-group">
        <button className="export-btn primary" onClick={handleDownloadTex}>
          <Download className="w-4 h-4" />
          <span>Download .tex</span>
        </button>

        <button className="export-btn secondary" onClick={handleExportPng} disabled={isExportingPng}>
          <Image className="w-4 h-4 text-emerald-400" />
          <span>{isExportingPng ? 'Exporting...' : 'Export PNG'}</span>
        </button>
      </div>

      <div className="export-group">
        <button className="export-btn outline" onClick={handleCopyTex}>
          {copiedTex ? <Check className="w-4 h-4 text-emerald-400" /> : <FileCode className="w-4 h-4" />}
          <span>{copiedTex ? 'Copied TeX' : 'Copy TeX'}</span>
        </button>

        <button className="export-btn outline" onClick={handleCopyMarkdown}>
          {copiedMd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copiedMd ? 'Copied MD' : 'Copy Markdown'}</span>
        </button>
      </div>
    </div>
  );
}
