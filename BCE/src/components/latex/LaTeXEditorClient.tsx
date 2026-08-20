'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Editor from '@monaco-editor/react';
import { 
  DEFAULT_ATS_LATEX_RESUME 
} from '@/lib/latex-templates';
import { parseLaTeXDocument } from '@/lib/latex-parser';
import { 
  RotateCcw, 
  Copy, 
  Download, 
  Printer, 
  Maximize2, 
  Minimize2, 
  Check, 
  FileCode,
  Eye,
  Save,
  AlertCircle
} from 'lucide-react';
import './LaTeXEditor.css';

const LOCAL_STORAGE_KEY = 'bce_latex_resume_code';

export default function LaTeXEditorClient() {
  const [latexCode, setLatexCode] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState<number>(50); // percentage for left pane
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load code from LocalStorage on mount (Client-only)
  useEffect(() => {
    try {
      const savedCode = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedCode && savedCode.trim().length > 0) {
        setLatexCode(savedCode);
      } else {
        setLatexCode(DEFAULT_ATS_LATEX_RESUME);
      }
    } catch (err) {
      console.error('Failed to read from localStorage:', err);
      setLatexCode(DEFAULT_ATS_LATEX_RESUME);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to LocalStorage with 400ms debounce
  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setLatexCode(newCode);
    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, newCode);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save to localStorage:', err);
      }
    }, 400);
  };

  // Toast notifications helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Toolbar Action: Reset Template
  const handleResetTemplate = () => {
    const confirmReset = window.confirm(
      'Are you sure you want to reset to the default ATS LaTeX resume template? Any unsaved edits will be replaced.'
    );
    if (!confirmReset) return;

    setLatexCode(DEFAULT_ATS_LATEX_RESUME);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, DEFAULT_ATS_LATEX_RESUME);
      setSaveStatus('saved');
      showToast('Template reset to default ATS Resume');
    } catch (err) {
      console.error('Failed to reset localStorage:', err);
    }
  };

  // Toolbar Action: Copy Code
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(latexCode);
      showToast('LaTeX code copied to clipboard!');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      showToast('Failed to copy code');
    }
  };

  // Toolbar Action: Download .tex file
  const handleDownloadTex = () => {
    try {
      const blob = new Blob([latexCode], { type: 'text/x-tex;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'resume.tex';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Downloaded resume.tex');
    } catch (err) {
      console.error('Download failed:', err);
      showToast('Failed to download .tex file');
    }
  };

  // Toolbar Action: Print / PDF Export
  const handlePrint = () => {
    window.print();
  };

  // Toolbar Action: Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(true);
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Draggable Resizer Handler
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    const newRatio = (newWidth / containerRect.width) * 100;
    // Constrain between 25% and 75%
    if (newRatio >= 25 && newRatio <= 75) {
      setSplitRatio(newRatio);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Calculated Stats
  const lineCount = latexCode.split('\n').length;
  const charCount = latexCode.length;

  if (!isInitialized) {
    return (
      <div className="latex-editor-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save className="animate-spin" size={20} />
          Loading LaTeX Workspace...
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`latex-editor-container ${isFullscreen ? 'is-fullscreen' : ''}`}
    >
      {/* Top Toolbar */}
      <div className="latex-toolbar">
        <div className="latex-toolbar-title-section">
          <div className="latex-toolbar-title">
            <FileCode className="text-neon-cyan" size={20} />
            <span>LaTeX Editor & ATS Resume Builder</span>
          </div>
          <span className={`latex-save-status ${saveStatus}`}>
            {saveStatus === 'saved' ? (
              <>
                <Check size={14} /> Saved locally
              </>
            ) : (
              <>
                <Save className="animate-spin" size={14} /> Saving...
              </>
            )}
          </span>
        </div>

        <div className="latex-toolbar-actions">
          <button 
            type="button" 
            onClick={handleResetTemplate} 
            className="latex-btn latex-btn-danger"
            title="Reset to default ATS template"
          >
            <RotateCcw size={15} />
            <span>Reset Template</span>
          </button>

          <button 
            type="button" 
            onClick={handleCopyCode} 
            className="latex-btn"
            title="Copy LaTeX source code"
          >
            <Copy size={15} />
            <span>Copy Code</span>
          </button>

          <button 
            type="button" 
            onClick={handleDownloadTex} 
            className="latex-btn"
            title="Download .tex file"
          >
            <Download size={15} />
            <span>Download .tex</span>
          </button>

          <button 
            type="button" 
            onClick={handlePrint} 
            className="latex-btn latex-btn-primary"
            title="Print or Save as PDF"
          >
            <Printer size={15} />
            <span>Print / PDF</span>
          </button>

          <button 
            type="button" 
            onClick={toggleFullscreen} 
            className="latex-btn"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Main Workspace Split */}
      <div className="latex-workspace">
        {/* Left Pane: Monaco LaTeX Editor */}
        <div 
          className="latex-pane-editor" 
          style={{ width: `${splitRatio}%` }}
        >
          <div className="latex-editor-header">
            <span>resume.tex</span>
            <span className="latex-stats-badge">
              {lineCount} lines | {charCount} chars
            </span>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <Suspense fallback={<div style={{ padding: '20px', color: '#94a3b8' }}>Loading Monaco Editor...</div>}>
              <Editor
                height="100%"
                defaultLanguage="latex"
                theme="vs-dark"
                value={latexCode}
                onChange={handleCodeChange}
                options={{
                  wordWrap: 'on',
                  minimap: { enabled: false },
                  fontSize: 13.5,
                  lineHeight: 22,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  padding: { top: 12, bottom: 12 },
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                }}
              />
            </Suspense>
          </div>
        </div>

        {/* Draggable Divider */}
        <div 
          className={`latex-resizer ${isDragging ? 'is-dragging' : ''}`}
          onMouseDown={handleMouseDown}
          title="Drag to resize panels"
        />

        {/* Right Pane: Live ATS Resume Preview */}
        <div className="latex-pane-preview">
          <div className="latex-preview-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={15} className="text-neon-cyan" />
              <span>Real-Time ATS Resume Preview</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              A4 Single-Column Paper Layout
            </span>
          </div>

          <div className="latex-preview-body">
            <div className="ats-resume-paper">
              {parseLaTeXDocument(latexCode)}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="latex-toast">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
