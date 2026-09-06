'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Eye, Copy, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface LatexPreviewProps {
  code: string;
}

export default function LatexPreview({ code }: LatexPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [katexLoaded, setKatexLoaded] = useState<boolean>(false);

  useEffect(() => {
    // Dynamically load KaTeX script & CSS from CDN if not present in window
    if (typeof window !== 'undefined') {
      if ((window as any).katex) {
        setKatexLoaded(true);
      } else {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
        script.onload = () => setKatexLoaded(true);
        document.body.appendChild(script);
      }
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || !code) return;

    // Extract equations from LaTeX code:
    // \begin{equation} ... \end{equation}, \[ ... \], $$ ... $$, \begin{pmatrix} ... \end{pmatrix}, $ ... $
    const container = containerRef.current;
    container.innerHTML = '';

    const mathBlocks: string[] = [];

    // Match environment equations
    const envMatches = [...code.matchAll(/\\begin\{(equation|equation\*|align|align\*|pmatrix|bmatrix|vmatrix)\}([\s\S]*?)\\end\{\1\}/g)];
    envMatches.forEach((m) => mathBlocks.push(m[0]));

    // Match display math \[ ... \] or $$ ... $$
    const displayMatches = [...code.matchAll(/(\$\$|\\\[)([\s\S]*?)(\$\$|\\\])/g)];
    displayMatches.forEach((m) => mathBlocks.push(m[2] || m[0]));

    // Match inline math $ ... $
    const inlineMatches = [...code.matchAll(/(?<!\$)\$([^$\n]+)\$(?!\$)/g)];
    inlineMatches.forEach((m) => mathBlocks.push(m[1]));

    if (mathBlocks.length === 0) {
      // Fallback: Treat non-markup math lines or raw latex as equations
      const cleanCode = code
        .replace(/\\documentclass\{[^}]*\}/g, '')
        .replace(/\\usepackage\{[^}]*\}/g, '')
        .replace(/\\title\{[^}]*\}/g, '')
        .replace(/\\author\{[^}]*\}/g, '')
        .replace(/\\date\{[^}]*\}/g, '')
        .replace(/\\begin\{document\}/g, '')
        .replace(/\\end\{document\}/g, '')
        .replace(/\\maketitle/g, '')
        .trim();

      if (cleanCode) mathBlocks.push(cleanCode);
    }

    mathBlocks.forEach((mathStr) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'katex-formula-card';

      if (katexLoaded && (window as any).katex) {
        try {
          (window as any).katex.render(mathStr, wrapper, {
            displayMode: true,
            throwOnError: false,
          });
        } catch (err) {
          wrapper.textContent = mathStr;
        }
      } else {
        wrapper.textContent = mathStr;
      }

      container.appendChild(wrapper);
    });
  }, [code, katexLoaded]);

  const handleCopyRenderedText = () => {
    if (containerRef.current) {
      navigator.clipboard.writeText(containerRef.current.innerText);
    }
  };

  return (
    <div className="latex-preview-wrapper" id="latex-preview-container">
      <div className="preview-top-bar">
        <div className="preview-title">
          <Eye className="w-4 h-4 text-emerald-400" />
          <span>KaTeX Math Render View</span>
        </div>
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={() => setZoomLevel((z) => Math.max(70, z - 10))} title="Zoom Out">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="zoom-indicator">{zoomLevel}%</span>
          <button className="zoom-btn" onClick={() => setZoomLevel((z) => Math.min(200, z + 10))} title="Zoom In">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button className="zoom-btn" onClick={() => setZoomLevel(100)} title="Reset Zoom">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button className="preview-copy-btn" onClick={handleCopyRenderedText} title="Copy Rendered Text">
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="preview-scroll-area">
        <div
          ref={containerRef}
          className="katex-render-body"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
        />
      </div>
    </div>
  );
}
