'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
  Play,
  Send,
  RotateCcw,
  Maximize2,
  Minimize2,
  Terminal,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LoaderCircle,
  X,
  Code2,
  Zap,
} from 'lucide-react';
import type { CodeLanguage, NormalizedExecutionResult } from '../types';
import './CodeArena.css';

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="code-editor-loading">Loading IDE workspace editor…</div>,
});

const languageMap: Record<CodeLanguage, string> = {
  cpp17: 'cpp',
  c: 'c',
  java: 'java',
  python: 'python',
  javascript: 'javascript',
};

const starters: Record<CodeLanguage, string> = {
  cpp17: '#include <iostream>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Write your solution here\n    return 0;\n}',
  c: '#include <stdio.h>\n\nint main(void) {\n    // Write your solution here\n    return 0;\n}',
  java: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}',
  python: 'def solve():\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    solve()\n',
  javascript: "'use strict';\n\nfunction solve() {\n    // Write your solution here\n}\n\nsolve();\n",
};

type ConsoleTab = 'output' | 'error' | 'input' | 'tests';

export default function CodeEditor({
  problemId,
  supportedLanguages = ['cpp17', 'c', 'java', 'python', 'javascript'],
  samples = [],
}: {
  problemId: string;
  supportedLanguages?: CodeLanguage[];
  samples?: { input: string; expected_output: string; sample_name?: string | null }[];
}) {
  const [language, setLanguage] = useState<CodeLanguage>(supportedLanguages[0] || 'cpp17');
  const [code, setCode] = useState(starters[supportedLanguages[0] || 'cpp17']);
  const [customInput, setCustomInput] = useState(samples[0]?.input || '');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<ConsoleTab>('output');

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [execResult, setExecResult] = useState<NormalizedExecutionResult | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);

  const resetCode = () => {
    if (confirm(`Reset code editor to starter template for ${language}?`)) {
      setCode(starters[language] || starters.cpp17);
    }
  };

  const runCode = async () => {
    setRunning(true);
    setExecResult(null);
    setSubmissionResult(null);

    try {
      const res = await fetch('/api/coding/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          stdin: customInput,
        }),
      });

      const data: NormalizedExecutionResult = await res.json();
      setExecResult(data);

      if (data.status === 'COMPILATION_ERROR' || data.status === 'RUNTIME_ERROR' || data.status === 'SYSTEM_ERROR') {
        setActiveTab('error');
      } else {
        setActiveTab('output');
      }
    } catch (e: any) {
      setExecResult({
        status: 'SYSTEM_ERROR',
        stdout: '',
        stderr: '',
        compileStdout: '',
        compileStderr: '',
        exitCode: null,
        signal: null,
        executionTimeMs: null,
        memoryUsedMb: null,
        message: 'Execution server temporarily unavailable. Please try again.',
      });
      setActiveTab('error');
    } finally {
      setRunning(false);
    }
  };

  const submitCode = async () => {
    setSubmitting(true);
    setSubmissionResult(null);
    setExecResult(null);

    try {
      const res = await fetch('/api/coding/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          language,
          sourceCode: code,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        setSubmissionResult({ error: payload.error || 'Submission failed' });
        setActiveTab('error');
      } else {
        setSubmissionResult(payload.data);
        setActiveTab('tests');
      }
    } catch (e: any) {
      setSubmissionResult({ error: 'Unable to submit solution. Please check network connection.' });
      setActiveTab('error');
    } finally {
      setSubmitting(false);
    }
  };

  const errorCount =
    (execResult && (execResult.compileStderr || execResult.stderr || execResult.status !== 'SUCCESS')) ||
    (submissionResult && submissionResult.error)
      ? 1
      : 0;

  return (
    <section className="code-workspace-panel" aria-label="Coding Workspace">
      {/* Monaco Container with Fullscreen Toggle */}
      <div className={`code-monaco-wrapper ${isFullscreen ? 'code-editor-fullscreen' : ''}`}>
        {/* Editor Toolbar */}
        <div className="code-editor-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Code2 size={13} style={{ color: 'var(--neon-cyan)' }} /> Language:
            </span>
            <select
              value={language}
              onChange={(e) => {
                const next = e.target.value as CodeLanguage;
                setLanguage(next);
                setCode(starters[next] || starters.cpp17);
              }}
              aria-label="Select programming language"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-main)',
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {supportedLanguages.map((item) => (
                <option key={item} value={item}>
                  {item === 'cpp17' ? 'C++17' : item.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={resetCode}
              aria-label="Reset starter code"
              title="Reset code template"
              className="oj-icon-btn"
            >
              <RotateCcw size={14} />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Maximize Editor'}
              title={isFullscreen ? 'Exit Fullscreen Mode' : 'Maximize Editor Mode'}
              className="oj-icon-btn"
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <Editor
          height={isFullscreen ? 'calc(100vh - 50px)' : '380px'}
          language={languageMap[language]}
          theme="vs-dark"
          value={code}
          onChange={(v) => setCode(v || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            padding: { top: 10, bottom: 10 },
          }}
        />
      </div>

      {/* Terminal Custom Input Card */}
      <div className="oj-input-card">
        <div className="oj-input-header">
          <span className="oj-input-title">
            <Terminal size={14} style={{ color: 'var(--neon-cyan)' }} /> Custom Stdin Input
          </span>
          <div className="oj-icon-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {samples && samples.length > 0 && (
              <select
                aria-label="Select sample input example"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--neon-cyan)',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onChange={(e) => {
                  const idx = parseInt(e.target.value, 10);
                  if (!isNaN(idx) && samples[idx]) {
                    setCustomInput(samples[idx].input);
                    setActiveTab('input');
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Use Example...
                </option>
                {samples.map((s, idx) => (
                  <option key={idx} value={idx}>
                    {s.sample_name || `Example ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="oj-icon-btn"
              aria-label="Clear input content"
              title="Clear custom input"
              onClick={() => setCustomInput('')}
            >
              <Trash2 size={13} />
            </button>
            <button
              type="button"
              className="oj-icon-btn"
              aria-label="Copy custom input"
              title="Copy input"
              onClick={() => {
                if (customInput) navigator.clipboard.writeText(customInput);
              }}
            >
              <Copy size={13} />
            </button>
          </div>
        </div>
        <textarea
          className="oj-input-textarea"
          value={customInput}
          placeholder="Paste or enter custom test stdin input here..."
          onChange={(e) => setCustomInput(e.target.value)}
        />
      </div>

      {/* Console & Test Results Tabbed Section */}
      <div className="oj-console-wrapper">
        <div className="oj-output-header">
          <div className="oj-title-group">
            <span className="oj-output-title">Console & Judge Results</span>
          </div>

          <div className="oj-control-btns">
            <button
              type="button"
              className="btn-run-secondary"
              disabled={running || submitting}
              onClick={runCode}
            >
              {running ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={15} />}
              {running ? 'Running...' : 'Run Code'}
            </button>

            <button
              type="button"
              className="btn-submit-primary"
              disabled={running || submitting}
              onClick={submitCode}
            >
              {submitting ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}
              {submitting ? 'Judging...' : 'Submit Solution'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
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
            Error {errorCount > 0 && <span className="oj-err-badge">{errorCount}</span>}
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
            className={`oj-tab ${activeTab === 'tests' ? 'active' : ''}`}
            onClick={() => setActiveTab('tests')}
          >
            Tests
          </button>
        </div>

        {/* Console Display Body */}
        <div className="oj-console-body">
          {activeTab === 'output' && (
            !execResult && !submissionResult ? (
              <div className="oj-empty-state">
                <div className="oj-terminal-icon-box">
                  <Terminal size={22} />
                  <span className="oj-check-badge">
                    <CheckCircle2 size={12} />
                  </span>
                </div>
                <p className="oj-empty-title">Console ready</p>
                <p className="oj-empty-sub">Click “Run Code” or “Submit Solution” to inspect output and judge evaluation results.</p>
              </div>
            ) : execResult ? (
              <div>
                <div className={`oj-status-banner oj-status-${execResult.status}`}>
                  {execResult.status === 'SUCCESS' ? '✓ Program Executed Successfully' : `● ${execResult.status}`}
                </div>
                <pre className="oj-code-block">
                  {execResult.stdout ? execResult.stdout : <span className="text-secondary">Program executed cleanly with no stdout output.</span>}
                </pre>
              </div>
            ) : submissionResult ? (
              <div>
                <div className={`oj-status-banner oj-status-${submissionResult.status || 'SUCCESS'}`}>
                  {submissionResult.status === 'ACCEPTED' ? '✓ Accepted' : `● ${submissionResult.status || 'Processed'}`}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-main)', margin: '4px 0' }}>
                  Submission ID: <strong style={{ fontFamily: 'monospace' }}>{submissionResult.id || 'N/A'}</strong>
                </p>
              </div>
            ) : null
          )}

          {activeTab === 'error' && (
            !execResult && !submissionResult ? (
              <div className="oj-empty-state">
                <p className="oj-empty-sub">No errors recorded.</p>
              </div>
            ) : execResult ? (
              <div>
                <div className={`oj-status-banner oj-status-${execResult.status}`}>
                  {execResult.status === 'COMPILATION_ERROR'
                    ? '● Compilation Error'
                    : execResult.status === 'SYSTEM_ERROR'
                    ? '⚠ Execution Server Unavailable'
                    : '● Error Output'}
                </div>
                <pre className="oj-code-block oj-code-error">
                  {execResult.compileStderr || execResult.stderr || execResult.message || 'No compilation/runtime error details returned.'}
                </pre>
              </div>
            ) : submissionResult?.error ? (
              <div>
                <div className="oj-status-banner oj-status-SYSTEM_ERROR">
                  ● Submission Error
                </div>
                <pre className="oj-code-block oj-code-error">{submissionResult.error}</pre>
              </div>
            ) : null
          )}

          {activeTab === 'input' && (
            <pre className="oj-code-block">
              {customInput ? customInput : <span className="text-secondary">No custom stdin input provided.</span>}
            </pre>
          )}

          {activeTab === 'tests' && (
            submissionResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className={`oj-status-banner oj-status-${submissionResult.status || 'SUCCESS'}`}>
                  {submissionResult.status === 'ACCEPTED'
                    ? '✓ Accepted — All Tests Passed'
                    : `● ${submissionResult.status || 'Evaluated'}`}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--glass-border)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>Test Cases Evaluated</span>
                    <strong style={{ color: submissionResult.status === 'ACCEPTED' ? 'var(--neon-emerald)' : '#f87171' }}>
                      {submissionResult.passed_tests || 0} / {submissionResult.total_tests || (samples ? samples.length : 1)} Passed
                    </strong>
                  </div>

                  {samples.map((sample, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>{sample.sample_name || `Sample Case #${idx + 1}`}</span>
                      <span style={{ color: 'var(--neon-emerald)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={13} /> Passed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="oj-empty-state">
                <p className="oj-empty-sub">Submit your solution to view test case pass/fail evaluations.</p>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
