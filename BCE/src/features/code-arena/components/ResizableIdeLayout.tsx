'use client';

import { useState, useEffect, useRef } from 'react';
import { BookOpen, Code2, Play } from 'lucide-react';
import ProblemStatementRenderer, { ProblemData } from './ProblemStatementRenderer';
import CodeEditor from './CodeEditor';
import { useLivePageContext } from '@/features/analytics/context/LivePageContext';

export default function ResizableIdeLayout({ problemData }: { problemData: ProblemData }) {
  const [leftWidth, setLeftWidth] = useState(32); // default 32%
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<'statement' | 'editor' | 'results'>('statement');
  const containerRef = useRef<HTMLDivElement>(null);
  const { setLiveContext } = useLivePageContext();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setLiveContext({
      route: `/code-arena/problems/${problemData.id}`,
      pageType: 'dsa_problem',
      pageTitle: problemData.title,
      loadState: 'ready',
      currentEntity: {
        type: 'problem',
        id: problemData.id,
        title: problemData.title,
        metadata: {
          difficulty: problemData.difficulty,
          topic: problemData.source_type || 'DSA'
        }
      },
      problemContext: {
        title: problemData.title,
        statement: problemData.statement || problemData.description || '',
        inputFormat: problemData.input_format || problemData.inputDescription || '',
        outputFormat: problemData.output_format || problemData.outputDescription || '',
        constraints: problemData.constraints || '',
        examples: (problemData.examples || problemData.samples || []).map(sample => ({
          input: sample.input || '',
          output: sample.output || sample.expected_output || '',
          explanation: sample.explanation || undefined
        })),
        explanation: problemData.explanation || '',
        starterCode: problemData.starterCode || undefined,
        functionSignature: typeof problemData.signature === 'string' ? problemData.signature : undefined,
        supportedLanguages: problemData.supported_languages || undefined
      },
      availableActions: ['submit_code', 'run_tests', 'search_youtube', 'open_latex']
    });
  }, [problemData, setLiveContext]);

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
      if (!isResizing || !containerRef.current || isMobile) return;
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
  }, [isResizing, leftWidth, isMobile]);

  return (
    <div 
      ref={containerRef}
      className={`code-arena-ide-layout resizable-ide ${isMobile ? 'is-mobile-view' : ''}`}
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        width: '100%',
        position: 'relative'
      }}
    >
      {/* Mobile Tab Switcher: Statement / Code Editor / Result */}
      {isMobile && (
        <div
          className="mobile-ide-tab-bar"
          style={{
            display: 'flex',
            width: '100%',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--glass-border)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '10px',
            gap: '4px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            boxSizing: 'border-box'
          }}
        >
          <button
            type="button"
            onClick={() => setMobileTab('statement')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              background: mobileTab === 'statement' ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'transparent',
              color: mobileTab === 'statement' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: mobileTab === 'statement' ? '0 2px 8px rgba(6, 182, 212, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <BookOpen size={14} /> Statement
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('editor')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              background: mobileTab === 'editor' ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : 'transparent',
              color: mobileTab === 'editor' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: mobileTab === 'editor' ? '0 2px 8px rgba(139, 92, 246, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Code2 size={14} /> Editor
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('results')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '7px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              background: mobileTab === 'results' ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'transparent',
              color: mobileTab === 'results' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: mobileTab === 'results' ? '0 2px 8px rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Play size={14} /> Result
          </button>
        </div>
      )}

      {/* Left panel: Statement */}
      <section 
        className="code-statement-panel" 
        style={{ 
          width: isMobile ? '100%' : `${leftWidth}%`,
          display: isMobile && mobileTab !== 'statement' ? 'none' : 'block',
          height: isMobile ? 'auto' : '100%'
        }}
      >
        <ProblemStatementRenderer problem={problemData} />
      </section>

      {/* Resizer bar (Desktop Only) */}
      {!isMobile && (
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
      )}

      {/* Right panel: Editor */}
      <div 
        className="code-editor-resizable-wrapper" 
        style={{ 
          width: isMobile ? '100%' : `${100 - leftWidth}%`,
          display: isMobile && mobileTab === 'statement' ? 'none' : 'flex',
          flexDirection: 'column',
          height: isMobile ? 'calc(100vh - 160px)' : '100%',
          minHeight: isMobile ? '550px' : '0'
        }}
      >
        <CodeEditor
          key={problemData.id}
          problem={problemData}
          samples={problemData.samples as any}
          mobileTab={isMobile ? (mobileTab === 'results' ? 'results' : 'editor') : undefined}
          onMobileTabChange={isMobile ? (tab) => setMobileTab(tab) : undefined}
        />
      </div>
    </div>
  );
}
