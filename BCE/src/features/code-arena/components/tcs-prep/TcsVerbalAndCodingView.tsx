'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  Eye,
  EyeOff,
  Lightbulb,
  Mail,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  XCircle,
} from 'lucide-react';
import {
  scoreTextMatchRatio,
  type TcsDrill,
  type TcsProgress,
} from '@/features/code-arena/data/tcsPrepTypes';

interface VerbalStudioProps {
  drills: TcsDrill[];
  progressMap: Record<string, TcsProgress>;
  isPublicPreview?: boolean;
  onSaveDrill: (payload: {
    itemKey: string;
    itemType: 'PASSAGE_RECALL' | 'EMAIL_WRITING';
    isSolved: boolean;
    submittedText: string;
  }) => Promise<{ xpAwarded?: number } | void>;
}

const CPP_STARTER = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // Write your solution here
    
    return 0;
}
`;

export function TcsVerbalStudioView({
  drills,
  progressMap,
  isPublicPreview = false,
  onSaveDrill,
}: VerbalStudioProps) {
  const passages = useMemo(() => drills.filter((d) => d.drill_type === 'PASSAGE_RECALL'), [drills]);
  const emails = useMemo(() => drills.filter((d) => d.drill_type === 'EMAIL_WRITING'), [drills]);

  const [subTab, setSubTab] = useState<'passage' | 'email'>('passage');
  const [selectedCode, setSelectedCode] = useState<string>(passages[0]?.drill_code || 'PR-1');

  const activeList = subTab === 'passage' ? passages : emails;
  const activeDrill = activeList.find((d) => d.drill_code === selectedCode) || activeList[0];

  // Passage Recall State: idle | reading | writing | reviewed
  const [phase, setPhase] = useState<'idle' | 'reading' | 'writing' | 'reviewed'>('idle');
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [responseText, setResponseText] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [xpToast, setXpToast] = useState<number>(0);

  useEffect(() => {
    setXpToast(0);
    if (!activeDrill) return;
    const saved = progressMap[activeDrill.drill_code]?.submitted_text || '';
    if (activeDrill.drill_type === 'PASSAGE_RECALL') {
      setResponseText(saved);
      setPhase(progressMap[activeDrill.drill_code]?.is_solved ? 'reviewed' : 'idle');
      setSecondsLeft(activeDrill.meta?.read_seconds || 30);
    } else {
      const lines = saved.split('\n');
      const subjLine = lines[0]?.startsWith('Subject:') ? lines[0].replace(/^Subject:\s*/, '') : '';
      const bodyPart = lines[0]?.startsWith('Subject:') ? lines.slice(1).join('\n').trim() : saved;
      setEmailSubject(subjLine);
      setResponseText(bodyPart);
      setPhase(progressMap[activeDrill.drill_code]?.is_solved ? 'reviewed' : 'writing');
      setSecondsLeft(activeDrill.meta?.time_seconds || 540);
    }
  }, [activeDrill?.drill_code, activeDrill?.drill_type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeDrill) return;
    if (activeDrill.drill_type === 'PASSAGE_RECALL') {
      if (phase !== 'reading' && phase !== 'writing') return;
      if (secondsLeft <= 0) {
        if (phase === 'reading') {
          setPhase('writing');
          setSecondsLeft(activeDrill.meta?.write_seconds || 90);
        } else {
          setPhase('reviewed');
        }
        return;
      }
      const t = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000);
      return () => window.clearInterval(t);
    } else {
      if (phase !== 'writing' || secondsLeft <= 0) return;
      const t = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
      return () => window.clearInterval(t);
    }
  }, [phase, secondsLeft, activeDrill]);

  if (!activeDrill) return null;

  const keywords = activeDrill.meta?.keywords || [];
  const fullEmailDraft = emailSubject.trim()
    ? `Subject: ${emailSubject.trim()}\n\n${responseText}`
    : responseText;
  const matchRatio =
    activeDrill.drill_type === 'PASSAGE_RECALL'
      ? scoreTextMatchRatio(responseText, keywords)
      : scoreTextMatchRatio(fullEmailDraft, keywords);
  const matchPct = Math.round(matchRatio * 100);

  const handleSubmit = async () => {
    setPhase('reviewed');
    if (isPublicPreview) return;
    setSaving(true);
    try {
      const textToSave = activeDrill.drill_type === 'EMAIL_WRITING' ? fullEmailDraft : responseText;
      const res = await onSaveDrill({
        itemKey: activeDrill.drill_code,
        itemType: activeDrill.drill_type as 'PASSAGE_RECALL' | 'EMAIL_WRITING',
        isSolved: textToSave.trim().length >= 15,
        submittedText: textToSave,
      });
      if (res && res.xpAwarded && res.xpAwarded > 0) setXpToast(res.xpAwarded);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="tcs-drill-tabs">
        <button
          type="button"
          onClick={() => {
            setSubTab('passage');
            if (passages[0]) setSelectedCode(passages[0].drill_code);
          }}
          className={`sql-filter-pill ${subTab === 'passage' ? 'active' : ''}`}
        >
          <BookOpen size={14} /> Passage Recall ({passages.length} · 30s Read / 90s Write)
        </button>
        <button
          type="button"
          onClick={() => {
            setSubTab('email');
            if (emails[0]) setSelectedCode(emails[0].drill_code);
          }}
          className={`sql-filter-pill ${subTab === 'email' ? 'active' : ''}`}
        >
          <Mail size={14} /> Formal Email Writing ({emails.length} · 9m each)
        </button>
      </div>

      <div className="tcs-lab-grid">
        <div className="sql-glass-panel" style={{ padding: '14px' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '13.5px', fontWeight: 800 }}>
            {subTab === 'passage' ? '8 Passage Recall Drills' : '3 TCS Email Scenarios'}
          </h4>
          <div className="tcs-problem-list">
            {activeList.map((d) => {
              const solved = Boolean(progressMap[d.drill_code]?.is_solved);
              return (
                <button
                  key={d.drill_code}
                  type="button"
                  onClick={() => setSelectedCode(d.drill_code)}
                  className={`tcs-problem-item ${selectedCode === d.drill_code ? 'active' : ''}`}
                >
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>{d.title}</span>
                  {solved && <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sql-workbench-card">
          <div className="sql-card-header-row">
            <div className="sql-card-badges">
              <span className="sql-qnum-badge">{activeDrill.drill_code}</span>
              <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{activeDrill.title}</strong>
            </div>
            <div className="sql-card-actions-right">
              <span className="sql-xp-burst">
                <Clock size={12} /> {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
              </span>
              {xpToast > 0 && (
                <span className="sql-xp-burst">
                  <Sparkles size={12} /> +{xpToast} XP
                </span>
              )}
              {progressMap[activeDrill.drill_code]?.is_solved && (
                <span className="sql-solved-pill">
                  <CheckCircle2 size={14} /> Completed
                </span>
              )}
            </div>
          </div>

          {activeDrill.drill_type === 'PASSAGE_RECALL' ? (
            <>
              {phase === 'idle' && (
                <div className="tcs-passage-hidden-card">
                  <h4 style={{ margin: '0 0 8px' }}>TCS Passage Recall Simulation</h4>
                  <p style={{ margin: '0 0 14px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                    You will have <strong>30 seconds</strong> to read the short passage carefully. It automatically hides afterward, and you will have <strong>90 seconds</strong> to reproduce its facts in your own words.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setResponseText('');
                      setSecondsLeft(30);
                      setPhase('reading');
                    }}
                    className="sql-btn sql-btn-primary"
                  >
                    <Play size={14} fill="currentColor" /> Start 30s Reading Phase
                  </button>
                </div>
              )}

              {phase === 'reading' && (
                <div className="apt-example-callout" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span className="sql-exp-subtitle" style={{ margin: 0 }}>
                      <Eye size={14} /> Memorize Key Facts ({secondsLeft}s remaining)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPhase('writing');
                        setSecondsLeft(90);
                      }}
                      className="sql-mini-btn"
                    >
                      <EyeOff size={12} /> Hide &amp; Start Writing
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.7 }}>{activeDrill.prompt}</p>
                </div>
              )}

              {(phase === 'writing' || phase === 'reviewed') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {phase === 'writing' && (
                    <div className="tcs-passage-hidden-card" style={{ padding: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7' }}>
                        Passage hidden! Reproduce names, timing, cause, action &amp; result from memory ({secondsLeft}s left).
                      </span>
                    </div>
                  )}

                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Type the recalled passage in clean, grammatical sentences..."
                    rows={5}
                    className="sql-code-input"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-default, #cbd5e1)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                    }}
                  />

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={saving || responseText.trim().length < 5}
                      onClick={handleSubmit}
                      className="sql-btn sql-btn-emerald"
                    >
                      <CheckCircle2 size={15} /> {saving ? 'Saving...' : 'Check & Compare Recall'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setResponseText('');
                        setSecondsLeft(30);
                        setPhase('reading');
                      }}
                      className="sql-btn sql-btn-secondary"
                    >
                      <RotateCcw size={14} /> Restart 30s Timer
                    </button>
                  </div>

                  {phase === 'reviewed' && (
                    <div className={`sql-explanation-box ${matchPct >= 55 ? 'correct' : 'wrong'}`}>
                      <div className="sql-explanation-banner">
                        <strong style={{ fontSize: '14px' }}>
                          Key-Fact Coverage Score: {matchPct}%
                        </strong>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {activeDrill.hint}
                        </span>
                      </div>
                      <div className="sql-exp-section">
                        <div className="sql-exp-subtitle">Original Reference Passage</div>
                        <p className="sql-exp-paragraph">{activeDrill.solution_text}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="apt-example-callout">
                <div className="sql-exp-subtitle" style={{ marginBottom: '4px' }}>
                  <Mail size={13} /> Email Prompt
                </div>
                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55 }}>{activeDrill.prompt}</p>
              </div>

              {keywords.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {keywords.map((kw, idx) => {
                    const hit = scoreTextMatchRatio(fullEmailDraft, [kw]) > 0;
                    return (
                      <span
                        key={idx}
                        className="sql-section-pill"
                        style={{
                          color: hit ? '#059669' : undefined,
                          borderColor: hit ? '#10b981' : undefined,
                        }}
                      >
                        {hit ? '✓ ' : '○ '}
                        {kw}
                      </span>
                    );
                  })}
                </div>
              )}

              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Subject: Concise formal email subject..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-default, #cbd5e1)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                }}
              />

              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Dear Sir/Madam,&#10;&#10;Write your formal email covering all required details...&#10;&#10;Regards,&#10;Aman"
                rows={7}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-default, #cbd5e1)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: '13.5px',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Word count: {responseText.trim() ? responseText.trim().split(/\s+/).length : 0} • Coverage: {matchPct}%
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSecondsLeft(540);
                      setPhase('writing');
                    }}
                    className="sql-btn sql-btn-secondary"
                  >
                    <RotateCcw size={14} /> Reset 9m Timer
                  </button>
                  <button
                    type="button"
                    disabled={saving || responseText.trim().length < 15}
                    onClick={handleSubmit}
                    className="sql-btn sql-btn-emerald"
                  >
                    <CheckCircle2 size={14} /> {saving ? 'Saving...' : 'Submit & View Model Email'}
                  </button>
                </div>
              </div>

              {phase === 'reviewed' && (
                <div className="sql-explanation-box correct">
                  <div className="sql-exp-section">
                    <div className="sql-exp-subtitle">Model Business Email (From Workbook)</div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13px', lineHeight: 1.55 }}>
                      {activeDrill.solution_text}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CodingLabProps {
  drills: TcsDrill[];
  progressMap: Record<string, TcsProgress>;
  isPublicPreview?: boolean;
  onSaveCoding: (payload: {
    itemKey: string;
    itemType: 'CODING';
    isSolved: boolean;
    submittedCode: string;
  }) => Promise<{ xpAwarded?: number } | void>;
}

export function TcsCodingLabView({
  drills,
  progressMap,
  isPublicPreview = false,
  onSaveCoding,
}: CodingLabProps) {
  const problems = useMemo(() => drills.filter((d) => d.drill_type === 'CODING'), [drills]);
  const [selectedCode, setSelectedCode] = useState<string>(problems[0]?.drill_code || 'CPP-1');
  const activeProb = problems.find((p) => p.drill_code === selectedCode) || problems[0];

  const [language, setLanguage] = useState<'cpp17' | 'python' | 'java' | 'javascript'>('cpp17');
  const [code, setCode] = useState<string>(CPP_STARTER);
  const [customInput, setCustomInput] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [runOut, setRunOut] = useState<{
    status: string;
    stdout: string;
    stderr: string;
    matchedSample: boolean;
    execMs?: number | null;
  } | null>(null);
  const [xpToast, setXpToast] = useState<number>(0);

  useEffect(() => {
    if (!activeProb) return;
    setCode(progressMap[activeProb.drill_code]?.submitted_code || CPP_STARTER);
    setCustomInput(activeProb.sample_input || '');
    setShowHint(false);
    setShowSolution(false);
    setRunOut(null);
    setXpToast(0);
  }, [activeProb?.drill_code]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activeProb) return null;

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setRunOut(null);
    try {
      const res = await fetch('/api/coding/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          stdin: customInput,
          raw: true,
        }),
      });
      const json = await res.json();
      const normOut = String(json.stdout || '').trim().replace(/\s+/g, ' ');
      const normExpected = String(activeProb.sample_output || '').trim().replace(/\s+/g, ' ');
      const matched =
        json.status === 'SUCCESS' &&
        customInput.trim() === (activeProb.sample_input || '').trim() &&
        normOut === normExpected;

      setRunOut({
        status: json.status || 'ERROR',
        stdout: json.stdout || '',
        stderr: json.compileStderr || json.stderr || json.message || '',
        matchedSample: matched,
        execMs: json.executionTimeMs,
      });

      if (matched && !isPublicPreview) {
        const saved = await onSaveCoding({
          itemKey: activeProb.drill_code,
          itemType: 'CODING',
          isSolved: true,
          submittedCode: code,
        });
        if (saved && saved.xpAwarded && saved.xpAwarded > 0) setXpToast(saved.xpAwarded);
      }
    } catch (err: any) {
      setRunOut({
        status: 'SYSTEM_ERROR',
        stdout: '',
        stderr: err?.message || 'Execution failed.',
        matchedSample: false,
      });
    } finally {
      setRunning(false);
    }
  };

  const diffClass =
    activeProb.difficulty === 'HARD'
      ? 'difficulty-HARD'
      : activeProb.difficulty === 'MEDIUM'
      ? 'difficulty-MEDIUM'
      : 'difficulty-EASY';

  return (
    <div className="tcs-lab-grid">
      <div className="sql-glass-panel" style={{ padding: '14px' }}>
        <h4 style={{ margin: '0 0 10px', fontSize: '13.5px', fontWeight: 800 }}>
          23 C++17 Syllabus Coding Problems
        </h4>
        <div className="tcs-problem-list">
          {problems.map((p) => {
            const solved = Boolean(progressMap[p.drill_code]?.is_solved);
            return (
              <button
                key={p.drill_code}
                type="button"
                onClick={() => setSelectedCode(p.drill_code)}
                className={`tcs-problem-item ${selectedCode === p.drill_code ? 'active' : ''}`}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{p.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {p.meta?.level_label || p.difficulty}
                  </div>
                </div>
                {solved && <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sql-workbench-card">
        <div className="sql-card-header-row">
          <div className="sql-card-badges">
            <span className="sql-qnum-badge">{activeProb.drill_code}</span>
            <span className={`difficulty-badge-styled ${diffClass}`}>
              {activeProb.meta?.level_label || activeProb.difficulty}
            </span>
          </div>
          <div className="sql-card-actions-right">
            {xpToast > 0 && (
              <span className="sql-xp-burst">
                <Sparkles size={12} /> +{xpToast} XP
              </span>
            )}
            {progressMap[activeProb.drill_code]?.is_solved && (
              <span className="sql-solved-pill">
                <CheckCircle2 size={14} /> Accepted
              </span>
            )}
          </div>
        </div>

        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{activeProb.title}</h3>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          {activeProb.prompt}
        </p>

        <div className="tcs-io-grid">
          <div className="tcs-io-box">
            <strong>Sample Input:</strong>
            {'\n'}
            {activeProb.sample_input}
          </div>
          <div className="tcs-io-box">
            <strong>Sample Output:</strong>
            {'\n'}
            {activeProb.sample_output}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Code2 size={16} style={{ color: '#06b6d4' }} />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="sql-select"
              style={{ minWidth: '150px' }}
            >
              <option value="cpp17">C++17 (g++)</option>
              <option value="python">Python 3</option>
              <option value="java">Java</option>
              <option value="javascript">JavaScript</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {activeProb.hint && (
              <button type="button" onClick={() => setShowHint((v) => !v)} className="sql-mini-btn">
                <Lightbulb size={13} /> {showHint ? 'Hide Hint' : 'Hint'}
              </button>
            )}
            <button type="button" onClick={() => setShowSolution((v) => !v)} className="sql-mini-btn">
              <Terminal size={13} /> {showSolution ? 'Hide C++17 Solution' : 'C++17 Solution'}
            </button>
            <button type="button" onClick={handleRun} disabled={running} className="sql-btn sql-btn-emerald">
              <Play size={14} fill="currentColor" /> {running ? 'Running...' : 'Run & Test'}
            </button>
          </div>
        </div>

        {showHint && activeProb.hint && (
          <div className="apt-example-callout">
            <strong style={{ fontSize: '12.5px' }}>Hint:</strong>{' '}
            <span style={{ fontSize: '13px' }}>{activeProb.hint}</span>
          </div>
        )}

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="tcs-code-textarea"
        />

        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
            Standard Input (stdin)
          </label>
          <textarea
            rows={2}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="tcs-io-box"
            style={{ width: '100%' }}
          />
        </div>

        {runOut && (
          <div className={`sql-explanation-box ${runOut.matchedSample ? 'correct' : runOut.status === 'SUCCESS' ? '' : 'wrong'}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '13.5px' }}>
                {runOut.matchedSample ? (
                  <>
                    <CheckCircle2 size={17} style={{ color: '#10b981' }} /> Sample Test Passed! ({runOut.execMs || 1} ms)
                  </>
                ) : runOut.status === 'SUCCESS' ? (
                  <>
                    <XCircle size={17} style={{ color: '#f59e0b' }} /> Output Mismatch vs Sample Output
                  </>
                ) : (
                  <>
                    <XCircle size={17} style={{ color: '#f43f5e' }} /> {runOut.status}
                  </>
                )}
              </span>
            </div>
            {runOut.stdout && (
              <pre style={{ margin: 0, fontSize: '12.5px', whiteSpace: 'pre-wrap' }}>stdout: {runOut.stdout}</pre>
            )}
            {runOut.stderr && (
              <pre style={{ margin: 0, fontSize: '12px', color: '#e11d48', whiteSpace: 'pre-wrap' }}>{runOut.stderr}</pre>
            )}
          </div>
        )}

        {showSolution && activeProb.solution_code && (
          <div className="apt-example-callout">
            <div className="sql-exp-subtitle" style={{ marginBottom: '6px' }}>
              <Terminal size={13} /> Reference Solution (C++17)
            </div>
            <pre className="tcs-code-textarea" style={{ minHeight: 'auto', margin: 0 }}>
              {activeProb.solution_code}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

