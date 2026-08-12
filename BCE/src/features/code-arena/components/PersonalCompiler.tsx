'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
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

const STATUS_CONFIG: Record<ExecutionStatus, { label: string; icon: string; className: string }> = {
  SUCCESS: { label: 'Accepted', icon: '🟢', className: 'oj-badge-SUCCESS' },
  COMPILATION_ERROR: { label: 'Compilation Error', icon: '🔴', className: 'oj-badge-COMPILATION_ERROR' },
  RUNTIME_ERROR: { label: 'Runtime Error', icon: '🔴', className: 'oj-badge-RUNTIME_ERROR' },
  WRONG_ANSWER: { label: 'Wrong Answer', icon: '🟠', className: 'oj-badge-WRONG_ANSWER' },
  TIME_LIMIT_EXCEEDED: { label: 'Time Limit Exceeded', icon: '🟠', className: 'oj-badge-TIME_LIMIT_EXCEEDED' },
  MEMORY_LIMIT_EXCEEDED: { label: 'Memory Limit Exceeded', icon: '🟠', className: 'oj-badge-MEMORY_LIMIT_EXCEEDED' },
  SYSTEM_ERROR: { label: 'System Error', icon: '🔴', className: 'oj-badge-SYSTEM_ERROR' },
};

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

  // OJ Output State
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

  const del = async () => {
    if (!active || !confirm(`Delete ${active.title}?`)) return;
    try {
      await fetch(`/api/coding/snippets/${active.id}`, { method: 'DELETE' });
    } catch {}
    setSnippets((items) => items.filter((x) => x.id !== active.id));
    newSnippet();
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
        stderr: err?.message || 'Execution call failed',
        compileStdout: '',
        compileStderr: '',
        exitCode: null,
        signal: null,
        executionTimeMs: null,
        memoryUsedMb: null,
        message: 'System execution error',
      });
      setActiveTab('error');
    } finally {
      setRunning(false);
    }
  };

  const currentStatusConfig = result ? STATUS_CONFIG[result.status] : null;
  const hasError = result && (result.compileStderr || result.stderr || result.status !== 'SUCCESS');

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
          height="460px"
          theme="vs-dark"
          language={monaco[language]}
          value={code}
          onChange={(v) => {
            setCode(v || '');
            schedule();
          }}
          options={{ automaticLayout: true, minimap: { enabled: false }, fontSize: 14 }}
        />

        <section className="code-console">
          <div>
            <label htmlFor="playground-input">Custom Input (stdin)</label>
            <textarea
              id="playground-input"
              value={stdin}
              placeholder="Enter custom input here..."
              onChange={(e) => {
                setStdin(e.target.value);
                schedule();
              }}
            />
          </div>

          <div>
            <div className="oj-output-panel">
              <div className="oj-status-header">
                <strong>Console & Output</strong>
                {running ? (
                  <span className="oj-badge" style={{ background: 'var(--bg-elevated)', color: 'var(--neon-cyan)' }}>
                    ⚡ Compiling & Executing...
                  </span>
                ) : currentStatusConfig ? (
                  <span className={`oj-badge ${currentStatusConfig.className}`}>
                    {currentStatusConfig.icon} {currentStatusConfig.label}
                  </span>
                ) : (
                  <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                    Click "Run Code" to execute
                  </span>
                )}
              </div>

              {/* Tab navigation */}
              <div className="oj-tab-bar">
                <button
                  type="button"
                  className={`oj-tab-btn ${activeTab === 'output' ? 'active' : ''}`}
                  onClick={() => setActiveTab('output')}
                >
                  Output
                </button>
                <button
                  type="button"
                  className={`oj-tab-btn ${activeTab === 'error' ? 'active' : ''} ${hasError ? 'has-error' : ''}`}
                  onClick={() => setActiveTab('error')}
                >
                  Error {hasError ? '•' : ''}
                </button>
                <button
                  type="button"
                  className={`oj-tab-btn ${activeTab === 'input' ? 'active' : ''}`}
                  onClick={() => setActiveTab('input')}
                >
                  Input
                </button>
                <button
                  type="button"
                  className={`oj-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                  onClick={() => setActiveTab('details')}
                >
                  Details
                </button>
              </div>

              {/* Tab Content Box */}
              <div className="oj-content-box">
                {activeTab === 'output' && (
                  <pre className="oj-code-block">
                    {result ? (
                      result.stdout ? (
                        result.stdout
                      ) : result.status === 'SUCCESS' ? (
                        <span className="text-secondary">Program executed successfully with no stdout output.</span>
                      ) : (
                        <span className="text-secondary">No stdout produced. Check the Error tab for diagnostics.</span>
                      )
                    ) : (
                      <span className="text-secondary">Ready. Write code and click "Run Code".</span>
                    )}
                  </pre>
                )}

                {activeTab === 'error' && (
                  <pre className="oj-code-block oj-code-error">
                    {result ? (
                      result.compileStderr ? (
                        `[Compilation Error]\n\n${result.compileStderr}`
                      ) : result.stderr ? (
                        `[Runtime Error / Stderr]\n\n${result.stderr}`
                      ) : result.status === 'SUCCESS' ? (
                        <span className="text-secondary" style={{ color: '#4ade80' }}>No errors. Compilation & execution finished cleanly.</span>
                      ) : (
                        result.message || 'Execution error.'
                      )
                    ) : (
                      <span className="text-secondary">No compilation or runtime errors.</span>
                    )}
                  </pre>
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
                      <span className="oj-detail-val">{result ? result.status : 'N/A'}</span>
                    </div>
                    <div className="oj-detail-item">
                      <span className="oj-detail-label">Exit Code</span>
                      <span className="oj-detail-val">{result?.exitCode !== null && result?.exitCode !== undefined ? result.exitCode : 'N/A'}</span>
                    </div>
                    <div className="oj-detail-item">
                      <span className="oj-detail-label">Signal</span>
                      <span className="oj-detail-val">{result?.signal || 'None'}</span>
                    </div>
                    <div className="oj-detail-item">
                      <span className="oj-detail-label">Execution Time</span>
                      <span className="oj-detail-val">{result?.executionTimeMs ? `${result.executionTimeMs} ms` : 'Not available'}</span>
                    </div>
                    <div className="oj-detail-item">
                      <span className="oj-detail-label">Memory</span>
                      <span className="oj-detail-val">{result?.memoryUsedMb ? `${result.memoryUsedMb} MB` : 'Not available'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="code-actions" style={{ marginTop: 'var(--space-sm)' }}>
              <Button variant="secondary" onClick={runCode} isLoading={running}>
                Run Code
              </Button>
              <Button variant="ghost" onClick={() => setCode(starters[language])}>
                Reset
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setResult(null);
                  setActiveTab('output');
                }}
              >
                Clear console
              </Button>
              {active && (
                <Button variant="danger" onClick={del}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
