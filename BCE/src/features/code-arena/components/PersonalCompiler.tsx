'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import {
  Play,
  RotateCcw,
  Eraser,
  Trash2,
  Copy,
  Maximize2,
  X,
  Info,
  Terminal,
  CheckCircle2,
  Zap,
  Maximize,
} from 'lucide-react';
import type { CodeLanguage, ExecutionStatus, NormalizedExecutionResult } from '../types';
import './CodeArena.css';

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="code-editor-loading">Loading personal workspace…</div>,
});

const starters: Record<CodeLanguage, string> = {
  cpp17: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, BCE Code Arena!" << endl;\n    return 0;\n}',
  c: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, BCE Code Arena!\\n");\n    return 0;\n}',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, BCE Code Arena!");\n    }\n}',
  python: 'def solve():\n    print("Hello, BCE Code Arena!")\n\nsolve()\n',
  javascript: "'use strict';\n\nfunction solve(input) {\n    console.log('Hello, BCE Code Arena!');\n}\n\nsolve();\n",
};

const monaco: Record<CodeLanguage, string> = {
  cpp17: 'cpp',
  c: 'c',
  java: 'java',
  python: 'python',
  javascript: 'javascript',
};

type Snippet = {
  id: string;
  title: string;
  language: CodeLanguage;
  source_code: string;
  stdin: string;
  updated_at: string;
};

type TabType = 'output' | 'error' | 'input' | 'details';

export default function PersonalCompiler({ initialSnippets }: { initialSnippets: Snippet[] }) {
  const [snippets, setSnippets] = useState<Snippet[]>(initialSnippets);
  const [active, setActive] = useState<Snippet | undefined>(initialSnippets[0]);
  const [title, setTitle] = useState(initialSnippets[0]?.title || 'Untitled snippet');
  const [language, setLanguage] = useState<CodeLanguage>(initialSnippets[0]?.language || 'cpp17');
  const [code, setCode] = useState(initialSnippets[0]?.source_code || starters.cpp17);
  const [stdin, setStdin] = useState(initialSnippets[0]?.stdin || '');
  const [state, setState] = useState('Saved');
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  // Input Box UI state
  const [expandedInput, setExpandedInput] = useState(false);

  // OJ Output state
  const [result, setResult] = useState<NormalizedExecutionResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('output');

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const persist = async (force = false) => {
    if (!dirty.current && !force) return;
    setSaving(true);
    setState('Saving…');
    try {
      const r = await fetch('/api/coding/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: active?.id, title, language, sourceCode: code, stdin }),
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error || 'Failed to save');
      if (p.data) {
        setActive(p.data);
        setSnippets((items) => [p.data, ...items.filter((x) => x.id !== p.data.id)]);
      }
      dirty.current = false;
      setState('Saved');
    } catch (e) {
      setState(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const schedule = () => {
    dirty.current = true;
    setState('Unsaved changes');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(), 1000);
  };

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const select = (s: Snippet) => {
    if (timer.current) clearTimeout(timer.current);
    setActive(s);
    setTitle(s.title);
    setLanguage(s.language);
    setCode(s.source_code);
    setStdin(s.stdin);
    dirty.current = false;
    setState('Saved');
  };

  const newSnippet = () => {
    setActive(undefined);
    setTitle('Untitled snippet');
    setLanguage('cpp17');
    setCode(starters.cpp17);
    setStdin('');
    dirty.current = true;
    setState('Unsaved changes');
  };

  // Delete saved snippet file (Destructive action)
  const delSnippet = async () => {
    if (!active || !confirm(`Are you sure you want to delete "${active.title}" snippet?`)) return;
    try {
      await fetch(`/api/coding/snippets/${active.id}`, { method: 'DELETE' });
    } catch {}
    setSnippets((items) => items.filter((x) => x.id !== active.id));
    newSnippet();
  };

  // Clear output console only
  const clearConsole = () => {
    setResult(null);
    setActiveTab('output');
  };

  // Reset code to starter template
  const resetCode = () => {
    if (confirm('Reset editor to default starter template for ' + language + '?')) {
      setCode(starters[language]);
      schedule();
    }
  };

  const runCode = async () => {
    setRunning(true);
    setResult(null);

    try {
      const res = await fetch('/api/coding/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          stdin,
        }),
      });

      const data: NormalizedExecutionResult = await res.json();
      setResult(data);

      if (data.status === 'COMPILATION_ERROR' || (data.status === 'RUNTIME_ERROR' && !data.stdout)) {
        setActiveTab('error');
      } else {
        setActiveTab('output');
      }
    } catch (err: any) {
      setResult({
        status: 'SYSTEM_ERROR',
        stdout: '',
        stderr: '',
        compileStdout: '',
        compileStderr: '',
        exitCode: null,
        signal: null,
        executionTimeMs: null,
        memoryUsedMb: null,
        message: 'Unable to reach execution server. Please try again.',
      });
      setActiveTab('error');
    } finally {
      setRunning(false);
    }
  };

  const errorCount = result && (result.compileStderr || result.stderr || result.status === 'COMPILATION_ERROR' || result.status === 'RUNTIME_ERROR') ? 1 : 0;

  return (
    <div className="compiler-layout">
      <aside className="snippet-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Files / Snippets</strong>
          <Button size="sm" variant="ghost" onClick={newSnippet}>
            + New
          </Button>
        </div>
        <div className="snippet-list">
          {snippets.map((s) => (
            <button key={s.id} className={active?.id === s.id ? 'snippet-active' : ''} onClick={() => select(s)}>
              {s.title}
            </button>
          ))}
        </div>
      </aside>

      <section className="compiler-main">
        <header className="code-editor-toolbar">
          <input aria-label="Snippet title" value={title} onChange={(e) => { setTitle(e.target.value); schedule(); }} />
          <select
            value={language}
            onChange={(e) => {
              const l = e.target.value as CodeLanguage;
              setLanguage(l);
              setCode(starters[l]);
              schedule();
            }}
          >
            {Object.keys(starters).map((l) => (
              <option key={l} value={l}>
                {l === 'cpp17' ? 'C++17' : l.toUpperCase()}
              </option>
            ))}
          </select>
          <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
            {state}
          </span>
          <Button size="sm" variant="secondary" onClick={() => persist(true)} isLoading={saving}>
            Save
          </Button>
        </header>

        <Editor
          height="420px"
          theme="vs-dark"
          language={monaco[language]}
          value={code}
          onChange={(v) => {
            setCode(v || '');
            schedule();
          }}
          options={{ automaticLayout: true, minimap: { enabled: false }, fontSize: 14 }}
        />

        {/* Console & Output Wrapper matching Screenshot */}
        <section className="oj-console-wrapper">
          {/* Header row */}
          <div className="oj-top-header">
            <div className="oj-title-group">
              <h3>Console & Output</h3>
              <span className="oj-pill oj-pill-ready">
                <span className="oj-dot" /> Ready
              </span>
            </div>
            <div className="oj-header-pills">
              <span className="oj-pill oj-pill-system">
                <span className="oj-dot" /> All Systems Operational
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="oj-tabs-bar">
            <button
              type="button"
              className={`oj-tab ${activeTab === 'output' ? 'active' : ''}`}
              onClick={() => setActiveTab('output')}
            >
              Output
            </button>
            <button
              type="button"
              className={`oj-tab ${activeTab === 'error' ? 'active' : ''}`}
              onClick={() => setActiveTab('error')}
            >
              Error <span className="oj-err-badge">{errorCount}</span>
            </button>
            <button
              type="button"
              className={`oj-tab ${activeTab === 'input' ? 'active' : ''}`}
              onClick={() => setActiveTab('input')}
            >
              Input
            </button>
            <button
              type="button"
              className={`oj-tab ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
          </div>

          {/* Custom Input Card placed BEFORE Output/Console as requested */}
          <div className="oj-input-card">
            <div className="oj-input-header">
              <span className="oj-input-title">
                Custom Input <span title="Enter standard input (stdin) for your code execution" style={{ display: 'inline-flex', alignItems: 'center' }}><Info size={14} /></span>
              </span>
              <div className="oj-icon-actions">
                <button
                  type="button"
                  className="oj-icon-btn"
                  aria-label="Clear input content"
                  title="Clear input"
                  onClick={() => {
                    setStdin('');
                    schedule();
                  }}
                >
                  <X size={14} />
                </button>
                <button
                  type="button"
                  className="oj-icon-btn"
                  aria-label="Delete input content"
                  title="Delete input"
                  onClick={() => {
                    setStdin('');
                    schedule();
                  }}
                >
                  <Trash2 size={14} />
                </button>
                <button
                  type="button"
                  className="oj-icon-btn"
                  aria-label="Copy input"
                  title="Copy input"
                  onClick={() => {
                    if (stdin) navigator.clipboard.writeText(stdin);
                  }}
                >
                  <Copy size={14} />
                </button>
                <button
                  type="button"
                  className="oj-icon-btn"
                  aria-label="Expand input"
                  title="Toggle fullscreen input"
                  onClick={() => setExpandedInput(!expandedInput)}
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>
            <textarea
              className="oj-input-textarea"
              style={{ minHeight: expandedInput ? '180px' : '80px' }}
              value={stdin}
              placeholder="Enter custom input for your program (stdin)"
              onChange={(e) => {
                setStdin(e.target.value);
                schedule();
              }}
            />
          </div>

          {/* Output / Console Controls Header */}
          <div className="oj-output-header">
            <span className="oj-output-title">Output / Console</span>
            <div className="oj-control-btns">
              <button
                type="button"
                className="oj-btn-run"
                disabled={running}
                onClick={runCode}
              >
                <Play size={15} fill="currentColor" /> {running ? 'Running code...' : 'Run Code'}
              </button>
              <button
                type="button"
                className="oj-btn-reset"
                onClick={resetCode}
                title="Restore starter code template"
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                type="button"
                className="oj-btn-clear"
                onClick={clearConsole}
                title="Clear console output area only"
              >
                <Eraser size={14} /> Clear
              </button>
              {active && (
                <button
                  type="button"
                  className="oj-btn-delete"
                  onClick={delSnippet}
                  title="Delete saved snippet file"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
          </div>

          {/* Console Display Body */}
          <div className="oj-console-body">
            {activeTab === 'output' && (
              !result ? (
                /* Initial Terminal Graphic Empty State */
                <div className="oj-empty-state">
                  <div className="oj-terminal-icon-box">
                    <Terminal size={24} />
                    <span className="oj-check-badge">
                      <CheckCircle2 size={14} />
                    </span>
                  </div>
                  <p className="oj-empty-title">Ready to run your code</p>
                  <p className="oj-empty-sub">Enter input (if required) and click “Run Code” to see the output.</p>
                </div>
              ) : (
                <div>
                  <div className={`oj-status-banner oj-status-${result.status}`}>
                    {result.status === 'SUCCESS' && '✓ Accepted'}
                    {result.status === 'COMPILATION_ERROR' && '● Compilation Error'}
                    {result.status === 'RUNTIME_ERROR' && '● Runtime Error'}
                    {result.status === 'SYSTEM_ERROR' && '● System Error'}
                  </div>
                  <pre className="oj-code-block">
                    {result.stdout ? result.stdout : <span className="text-secondary">Program executed with no stdout output.</span>}
                  </pre>
                </div>
              )
            )}

            {activeTab === 'error' && (
              !result ? (
                <div className="oj-empty-state">
                  <p className="oj-empty-sub">No errors recorded.</p>
                </div>
              ) : (
                <div>
                  <div className={`oj-status-banner oj-status-${result.status}`}>
                    {result.status === 'COMPILATION_ERROR' ? '● Compilation Error' : result.status === 'SYSTEM_ERROR' ? '● System Error' : '● Error Output'}
                  </div>
                  <pre className="oj-code-block oj-code-error">
                    {result.compileStderr
                      ? result.compileStderr
                      : result.stderr
                      ? result.stderr
                      : result.message
                      ? result.message
                      : <span className="text-secondary" style={{ color: '#4ade80' }}>No errors. Program ran cleanly.</span>}
                  </pre>
                </div>
              )
            )}

            {activeTab === 'input' && (
              <pre className="oj-code-block">
                {stdin ? stdin : <span className="text-secondary">No custom stdin input provided.</span>}
              </pre>
            )}

            {activeTab === 'details' && (
              <div className="oj-details-grid">
                <div className="oj-detail-item">
                  <span className="oj-detail-label">Language</span>
                  <span className="oj-detail-val">{language === 'cpp17' ? 'C++17' : language.toUpperCase()}</span>
                </div>
                <div className="oj-detail-item">
                  <span className="oj-detail-label">Status</span>
                  <span className="oj-detail-val">{result ? result.status : 'Ready'}</span>
                </div>
                <div className="oj-detail-item">
                  <span className="oj-detail-label">Exit Code</span>
                  <span className="oj-detail-val">{result?.exitCode !== null && result?.exitCode !== undefined ? result.exitCode : '—'}</span>
                </div>
                <div className="oj-detail-item">
                  <span className="oj-detail-label">Signal</span>
                  <span className="oj-detail-val">{result?.signal || '—'}</span>
                </div>
                <div className="oj-detail-item">
                  <span className="oj-detail-label">Execution Server</span>
                  <span className="oj-detail-val">Wandbox / GCC Engine</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar matching mockup screenshot */}
          <div className="oj-bottom-meta-bar">
            <div className="oj-meta-left">
              <select
                className="oj-meta-select"
                value={language}
                onChange={(e) => {
                  const l = e.target.value as CodeLanguage;
                  setLanguage(l);
                  setCode(starters[l]);
                  schedule();
                }}
              >
                {Object.keys(starters).map((l) => (
                  <option key={l} value={l}>
                    {l === 'cpp17' ? 'C++17' : l.toUpperCase()}
                  </option>
                ))}
              </select>
              <span title="Wandbox Engine Active"><Zap size={14} style={{ color: 'var(--neon-gold)' }} /></span>
              <span>Time Limit: <strong style={{ color: 'var(--neon-cyan)' }}>1000 ms</strong></span>
              <span>Memory Limit: <strong style={{ color: 'var(--neon-cyan)' }}>256 MB</strong></span>
            </div>
            <button
              type="button"
              className="oj-tab"
              onClick={() => alert('Compiler is now running in workspace mode.')}
            >
              <Maximize size={14} /> Open in Fullscreen
            </button>
          </div>
        </section>
      </section>
    </div>
  );
}
