'use client';

import { useState, useEffect, useRef } from 'react';
import ProblemStatementRenderer from './ProblemStatementRenderer';
import CodeEditor from './CodeEditor';
import type { ProblemData } from './ProblemStatementRenderer';

export default function ResizableIdeLayout({ problemData }: { problemData: ProblemData }) {
  const [leftWidth, setLeftWidth] = useState(40); // default 40%
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('bce:ide-split-width');
    if (saved) {
      const parsed = parseFloat(saved);
      if (parsed >= 20 && parsed <= 80) {
        setLeftWidth(parsed);
      }
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidthPx = e.clientX - containerRect.left;
      const percentage = (newWidthPx / containerRect.width) * 100;
      if (percentage >= 20 && percentage <= 80) {
        setLeftWidth(percentage);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('bce:ide-split-width', leftWidth.toFixed(2));
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, leftWidth]);

  return (
    <div 
      ref={containerRef}
      className="code-arena-ide-layout resizable-ide"
      style={{
        display: 'flex',
        width: '100%',
        position: 'relative'
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 767px) {
          .code-arena-ide-layout.resizable-ide {
            flex-direction: column !important;
            height: auto !important;
            overflow-y: auto !important;
          }
          .code-statement-panel {
            width: 100% !important;
            height: auto !important;
            overflow-y: visible !important;
          }
          .code-editor-resizable-wrapper {
            width: 100% !important;
            height: 600px !important;
            margin-top: 20px !important;
          }
          .ide-resizer-bar {
            display: none !important;
          }
        }
        @media (min-width: 768px) {
          .code-arena-ide-layout.resizable-ide {
            flex-direction: row !important;
            height: 100% !important;
            overflow-y: hidden !important;
          }
          .code-statement-panel {
            width: ${leftWidth}% !important;
            height: 100% !important;
            overflow-y: auto !important;
          }
          .code-editor-resizable-wrapper {
            width: ${100 - leftWidth}% !important;
            height: 100% !important;
            margin-top: 0 !important;
          }
          .ide-resizer-bar {
            display: flex !important;
          }
        }
      ` }} />

      {/* Left panel: Statement */}
      <section className="code-statement-panel">
        <ProblemStatementRenderer problem={problemData} />
      </section>

      {/* Resizer bar */}
      <div
        className="ide-resizer-bar"
        onMouseDown={handleMouseDown}
        style={{
          width: '8px',
          cursor: 'col-resize',
          background: isResizing ? 'var(--neon-cyan)' : 'transparent',
          borderLeft: '1px solid var(--glass-border)',
          borderRight: '1px solid var(--glass-border)',
          flexShrink: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none'
        }}
        title="Drag to resize panels"
      >
        <div style={{
          width: '2px',
          height: '24px',
          background: 'var(--text-muted)',
          borderRadius: '1px'
        }} />
      </div>

      {/* Right panel: Editor */}
      <div className="code-editor-resizable-wrapper">
        <CodeEditor
          problem={problemData}
          samples={problemData.samples as any}
        />
      </div>
    </div>
  );
}
