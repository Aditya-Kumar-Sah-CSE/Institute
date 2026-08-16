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
  LoaderCircle,
  X,
  Code2,
  Zap,
} from 'lucide-react';
import type { CodeLanguage, NormalizedExecutionResult } from '../types';
import { useRouter } from 'next/navigation';
import type { ProblemData } from './ProblemStatementRenderer';
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
  html: 'html',
};

const starters: Record<CodeLanguage, string> = {
  cpp17: '#include <iostream>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Write your solution here\n    return 0;\n}',
  c: '#include <stdio.h>\n\nint main(void) {\n    // Write your solution here\n    return 0;\n}',
  java: 'import java.util.Scanner;\n\nclass Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}',
  python: 'def solve():\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    solve()\n',
  javascript: "'use strict';\n\nfunction solve() {\n    // Write your solution here\n}\n\nsolve();\n",
  html: '<!-- Write your HTML/CSS/React code here -->',
};

type ConsoleTab = 'output' | 'error' | 'input' | 'tests';

export default function CodeEditor({
  problem,
  samples = [],
}: {
  problem: ProblemData;
  samples?: { input: string; expected_output: string; sample_name?: string | null }[];
}) {
  const problemId = problem.id;
  const supportedLanguages = (problem.supported_languages || ['cpp17', 'c', 'java', 'python', 'javascript']) as CodeLanguage[];

  const router = useRouter();
  const [language, setLanguage] = useState<CodeLanguage>(supportedLanguages[0] || 'cpp17');
  const [code, setCode] = useState(() => {
    const firstLang = supportedLanguages[0] || 'cpp17';
    if (problem.starterCode && typeof problem.starterCode === 'object') {
      const customCode = (problem.starterCode as Record<string, string>)[firstLang];
      if (customCode) return customCode;
    }
    return starters[firstLang] || starters.cpp17;
  });
  const [customInput, setCustomInput] = useState(samples[0]?.input || '');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<ConsoleTab>('output');

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [execResult, setExecResult] = useState<NormalizedExecutionResult | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [showCFModal, setShowCFModal] = useState(false);
  const [showLCModal, setShowLCModal] = useState(false);

  const resetCode = () => {
    if (confirm(`Reset code editor to starter template for ${language}?`)) {
      const resetTo = (problem.starterCode && typeof problem.starterCode === 'object')
        ? ((problem.starterCode as Record<string, string>)[language] || starters[language])
        : (starters[language] || starters.cpp17);
      setCode(resetTo);
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
    } catch {
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
        router.refresh();
      }
    } catch {
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
                const nextCode = (problem.starterCode && typeof problem.starterCode === 'object')
                  ? ((problem.starterCode as Record<string, string>)[next] || starters[next])
                  : (starters[next] || starters.cpp17);
                setCode(nextCode);
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
              {supportedLanguages.map((item: CodeLanguage) => (
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

            {problem.source_type === 'CODEFORCES' && (
              <button
                type="button"
                className="btn-submit-cf"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                  border: 'none',
                  color: 'white',
                  fontSize: '13px',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 750,
                  cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(124, 58, 237, 0.35)',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.25px',
                }}
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  setShowCFModal(true);
                  const cfId = problem.external_problem_id || problem.externalId || '';
                  const match = cfId.match(/^(\d+)([A-Z]\d*)$/i);
                  let submitUrl = problem.external_url || `https://codeforces.com/problemset/problem/${cfId}`;
                  if (match) {
                    submitUrl = `https://codeforces.com/contest/${match[1]}/submit?problemIndex=${match[2].toUpperCase()}`;
                  }
                  window.open(submitUrl, '_blank');
                }}
              >
                <Zap size={14} /> Submit to Codeforces
              </button>
            )}

            {problem.source_type === 'LEETCODE' && (
              <button
                type="button"
                className="btn-submit-lc"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #ffa116, #f77f00)',
                  border: 'none',
                  color: 'black',
                  fontSize: '13px',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 750,
                  cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(255, 161, 22, 0.35)',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.25px',
                }}
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  setShowLCModal(true);
                  const submitUrl = problem.external_url || problem.sourceUrl || 'https://leetcode.com/problems';
                  window.open(submitUrl, '_blank');
                }}
              >
                <Zap size={14} /> Submit to LeetCode
              </button>
            )}

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

                <div className="oj-testcases-list">
                  <div className="oj-testcases-header">
                    <span style={{ fontWeight: 600 }}>Test Cases Evaluated</span>
                    <strong style={{ color: submissionResult.status === 'ACCEPTED' ? 'var(--neon-green)' : '#f87171' }}>
                      {submissionResult.passed_tests || 0} / {submissionResult.total_tests || (samples ? samples.length : 1)} Passed
                    </strong>
                  </div>

                  {samples.map((sample, idx) => (
                    <div key={idx} className="oj-testcase-row">
                      <span style={{ color: 'var(--text-muted)' }}>{sample.sample_name || `Sample Case #${idx + 1}`}</span>
                      <span className="oj-testcase-passed">
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

      {showCFModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            maxWidth: '500px',
            width: '100%',
            color: 'var(--text-main)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(124, 58, 237, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Codeforces Submit Gateway
              </h3>
              <button
                type="button"
                onClick={() => setShowCFModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{
              background: 'rgba(6, 182, 212, 0.05)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--neon-cyan)',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'inset 0 0 10px rgba(6, 182, 212, 0.05)'
            }}>
              <Zap size={15} style={{ animation: 'pulse 2s infinite' }} /> Secure Redirect Integration Active
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                BCE respects your account privacy. To keep your login credentials 100% secure, direct solution submission is executed through Codeforces' official gateway.
              </p>

              {/* Steps checklist */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                  ✓ Source Code copied to clipboard
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  ● Selected language: <strong style={{ color: 'var(--neon-purple)', fontFamily: 'monospace' }}>{language === 'cpp17' ? 'C++17' : language.toUpperCase()}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  ● Target URL: <span style={{ color: 'var(--neon-cyan)', textDecoration: 'underline', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                    {(() => {
                      const cfId = problem.external_problem_id || problem.externalId || '';
                      const match = cfId.match(/^(\d+)([A-Z]\d*)$/i);
                      return match ? `contest/${match[1]}/submit` : 'problemset/submit';
                    })()}
                  </span>
                </div>
              </div>
              
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', fontStyle: 'italic' }}>
                Next: Paste your code (Ctrl+V) and click "Submit" on Codeforces.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowCFModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'background 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  setShowCFModal(false);
                  const cfId = problem.external_problem_id || problem.externalId || '';
                  const match = cfId.match(/^(\d+)([A-Z]\d*)$/i);
                  let submitUrl = problem.external_url || `https://codeforces.com/problemset/problem/${cfId}`;
                  if (match) {
                    submitUrl = `https://codeforces.com/contest/${match[1]}/submit?problemIndex=${match[2].toUpperCase()}`;
                  }
                  window.open(submitUrl, '_blank');
                }}
                style={{
                  background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                  border: 'none',
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Go to Submit Portal ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {showLCModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            maxWidth: '500px',
            width: '100%',
            color: 'var(--text-main)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 161, 22, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, background: 'linear-gradient(135deg, #ffa116, #f77f00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                LeetCode Submit Gateway
              </h3>
              <button
                type="button"
                onClick={() => setShowLCModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{
              background: 'rgba(255, 161, 22, 0.05)',
              border: '1px solid rgba(255, 161, 22, 0.2)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              color: '#ffa116',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'inset 0 0 10px rgba(255, 161, 22, 0.05)'
            }}>
              <Zap size={15} style={{ animation: 'pulse 2s infinite' }} /> Secure Redirect Integration Active
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                BCE respects your account privacy. To keep your login credentials 100% secure, direct solution submission is executed through LeetCode's official gateway.
              </p>

              {/* Steps checklist */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                  ✓ Source Code copied to clipboard
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  ● Selected language: <strong style={{ color: 'var(--neon-purple)', fontFamily: 'monospace' }}>{language === 'cpp17' ? 'C++17' : language.toUpperCase()}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  ● Target URL: <span style={{ color: 'var(--neon-cyan)', textDecoration: 'underline', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                    {problem.external_url || problem.sourceUrl || 'leetcode.com/problems'}
                  </span>
                </div>
              </div>
              
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', fontStyle: 'italic' }}>
                Next: Paste your code (Ctrl+V) and click "Submit" on LeetCode.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowLCModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'background 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  setShowLCModal(false);
                  const submitUrl = problem.external_url || problem.sourceUrl || 'https://leetcode.com/problems';
                  window.open(submitUrl, '_blank');
                }}
                style={{
                  background: 'linear-gradient(135deg, #ffa116, #f77f00)',
                  border: 'none',
                  color: 'black',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: '0 4px 15px rgba(255, 161, 22, 0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Go to Submit Portal ↗
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
