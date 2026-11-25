'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  Eye,
  EyeOff,
  Flame,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import type {
  RoadmapProblem,
  RoadmapProblemProgress,
} from '@/features/code-arena/data/roadmapSheetTypes';
import {
  buildPrebuiltHarnessCase,
  buildRoadmapStdin,
  buildRunnableRoadmapCpp,
  compareRoadmapOutputs,
  parsePrimaryCppSignature,
} from '@/features/code-arena/lib/roadmapHarness';

interface TestRunResultItem {
  index: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  status: string;
  passed: boolean;
  errorText?: string;
}

function deriveStarterCpp(referenceCode: string): string {
  const sig = parsePrimaryCppSignature(referenceCode);
  if (!sig) {
    return `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your C++17 solution here\n    return 0;\n}`;
  }
  const paramStr = sig.params.map((p) => `${p.rawType} ${p.name}`).join(', ');
  let defaultReturn = '';
  if (sig.returnType === 'bool') defaultReturn = '\n    return false;';
  else if (sig.returnType === 'string') defaultReturn = '\n    return "";';
  else if (sig.returnType.startsWith('vector')) defaultReturn = '\n    return {};';
  else if (sig.returnType !== 'void') defaultReturn = '\n    return 0;';

  return `${sig.returnType} ${sig.name}(${paramStr}) {\n    // Write your C++17 solution here${defaultReturn}\n}`;
}

export default function RoadmapProblemWorkbench({
  problem,
  positionIndex,
  filteredTotal,
  progress,
  isPublicPreview = false,
  focusMode,
  onToggleFocus,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onJumpToCode,
  onSaveProgress,
}: {
  problem: RoadmapProblem;
  positionIndex: number;
  filteredTotal: number;
  progress?: RoadmapProblemProgress;
  isPublicPreview?: boolean;
  focusMode: boolean;
  onToggleFocus: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onJumpToCode: (query: string) => void;
  onSaveProgress: (payload: {
    problemCode: string;
    levelNumber: number;
    isSolved?: boolean;
    isRevised?: boolean;
    isBookmarked?: boolean;
    submittedCode?: string;
    incrementAttempts?: boolean;
  }) => Promise<void>;
}) {
  const [activeSubTab, setActiveSubTab] = useState<'solutions' | 'sandbox'>('solutions');
  const [revealSolutions, setRevealSolutions] = useState(true);
  const [solutionView, setSolutionView] = useState<'compare' | 'brute' | 'optimized'>('compare');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [jumpInput, setJumpInput] = useState('');

  const starterCode = useMemo(
    () => deriveStarterCpp(problem.optimized?.code_cpp || problem.brute_force?.code_cpp || ''),
    [problem]
  );

  const [editorCode, setEditorCode] = useState<string>(
    progress?.submitted_code?.trim() ? progress.submitted_code : starterCode
  );
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestRunResultItem[] | null>(null);
  const [customStdin, setCustomStdin] = useState<string>(problem.test_cases?.[0]?.input || '');
  const [customOutput, setCustomOutput] = useState<string | null>(null);
  const [savingFlag, setSavingFlag] = useState(false);

  // Sync editor and custom stdin when switching problems
  useEffect(() => {
    setEditorCode(progress?.submitted_code?.trim() ? progress.submitted_code : starterCode);
    setTestResults(null);
    setRunError(null);
    setCustomOutput(null);
    setCustomStdin(problem.test_cases?.[0]?.input || '');
  }, [problem.problem_code, starterCode, progress?.submitted_code, problem.test_cases]);

  const xpReward = problem.difficulty === 'HARD' ? 30 : problem.difficulty === 'MEDIUM' ? 20 : 10;

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {}
  };

  const handleLoadIntoSandbox = (code: string) => {
    setEditorCode(code);
    setActiveSubTab('sandbox');
    setTestResults(null);
    setRunError(null);
  };

  const handleRunTestCases = async () => {
    if (isPublicPreview) {
      setRunError('Please sign in to Code Arena to compile & execute C++17 solutions.');
      return;
    }
    const cases = Array.isArray(problem.test_cases) ? problem.test_cases : [];
    if (cases.length === 0) {
      setRunError('No test cases found for this problem.');
      return;
    }

    setRunning(true);
    setRunError(null);
    setTestResults(null);
    setCustomOutput(null);

    try {
      const refCode = problem.optimized?.code_cpp || problem.brute_force?.code_cpp || '';
      const built = buildRunnableRoadmapCpp(editorCode, refCode, cases[0]?.output || '');
      const formattedCases = cases.map((tc) => buildPrebuiltHarnessCase(tc, built.signature));

      const res = await fetch('/api/coding/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: built.code,
          language: 'cpp17',
          testCases: formattedCases,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRunError(data?.error || data?.message || 'Execution failed');
        setRunning(false);
        return;
      }

      if (data.status === 'COMPILATION_ERROR') {
        setRunError(data.compilerOutput || 'Compilation error in C++17 code');
        setRunning(false);
        return;
      }

      let rawItems: any[] = [];
      try {
        rawItems = typeof data.runtimeOutput === 'string' ? JSON.parse(data.runtimeOutput) : [];
      } catch {
        rawItems = [];
      }

      const evaluated: TestRunResultItem[] = cases.map((tc, idx) => {
        const item = rawItems[idx] || {};
        const actual = String(item.actualOutput || '').trim();
        const isRuntimeErr = item.status === 'RUNTIME_ERROR' || item.status === 'TIME_LIMIT_EXCEEDED';
        const passed = !isRuntimeErr && compareRoadmapOutputs(actual, tc.output, problem.problem_code);
        return {
          index: idx + 1,
          input: tc.input,
          expectedOutput: tc.output,
          actualOutput: actual,
          status: isRuntimeErr ? item.status : passed ? 'PASSED' : 'WRONG_ANSWER',
          passed,
          errorText: item.stderr,
        };
      });

      setTestResults(evaluated);

      const allPassed = evaluated.length > 0 && evaluated.every((r) => r.passed);
      await onSaveProgress({
        problemCode: problem.problem_code,
        levelNumber: problem.level_number,
        isSolved: allPassed ? true : undefined,
        submittedCode: editorCode,
        incrementAttempts: true,
      });
    } catch (err: any) {
      setRunError(err?.message || 'Execution error');
    } finally {
      setRunning(false);
    }
  };

  const handleRunCustomStdin = async () => {
    if (isPublicPreview) {
      setRunError('Please sign in to Code Arena to execute custom inputs.');
      return;
    }
    setRunning(true);
    setRunError(null);
    setCustomOutput(null);
    try {
      const refCode = problem.optimized?.code_cpp || problem.brute_force?.code_cpp || '';
      const built = buildRunnableRoadmapCpp(editorCode, refCode, problem.test_cases?.[0]?.output || '');
      const stdinStr = built.hasCustomMain ? customStdin : buildRoadmapStdin(customStdin, built.signature);

      const res = await fetch('/api/coding/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: built.code,
          language: 'cpp17',
          stdin: stdinStr,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunError(data?.error || data?.message || 'Execution failed');
      } else if (data.status === 'COMPILATION_ERROR') {
        setRunError(data.compileStderr || data.stderr || 'Compilation Error');
      } else if (data.stderr && !data.stdout) {
        setRunError(data.stderr);
      } else {
        setCustomOutput(String(data.stdout || '').trim() || '(empty output)');
      }
    } catch (err: any) {
      setRunError(err?.message || 'Custom run error');
    } finally {
      setRunning(false);
    }
  };

  const handleToggleSolved = async () => {
    if (isPublicPreview) return;
    setSavingFlag(true);
    try {
      await onSaveProgress({
        problemCode: problem.problem_code,
        levelNumber: problem.level_number,
        isSolved: !progress?.is_solved,
        submittedCode: editorCode,
      });
    } finally {
      setSavingFlag(false);
    }
  };

  const handleToggleRevised = async () => {
    if (isPublicPreview) return;
    setSavingFlag(true);
    try {
      await onSaveProgress({
        problemCode: problem.problem_code,
        levelNumber: problem.level_number,
        isRevised: !progress?.is_revised,
      });
    } finally {
      setSavingFlag(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (isPublicPreview) return;
    setSavingFlag(true);
    try {
      await onSaveProgress({
        problemCode: problem.problem_code,
        levelNumber: problem.level_number,
        isBookmarked: !progress?.is_bookmarked,
      });
    } finally {
      setSavingFlag(false);
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const next = editorCode.substring(0, start) + '    ' + editorCode.substring(end);
      setEditorCode(next);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      });
    }
  };

  const isSolved = Boolean(progress?.is_solved);
  const isRevised = Boolean(progress?.is_revised);
  const isBookmarked = Boolean(progress?.is_bookmarked);

  return (
    <div className="rm-workbench-card">
      {/* Top Navigator Bar */}
      <div className="rm-nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onToggleFocus}
            className="rm-btn-outline"
            title={focusMode ? 'Show problem sidebar' : 'Hide sidebar (Focus Mode)'}
            style={{ padding: '6px 10px' }}
          >
            {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{focusMode ? 'Show List' : 'Focus Mode'}</span>
          </button>

          <button type="button" onClick={onPrev} disabled={!hasPrev} className="rm-btn-outline" style={{ padding: '6px 10px' }}>
            <ChevronLeft size={15} /> Prev
          </button>

          <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary, #475569)' }}>
            {positionIndex + 1} of {filteredTotal}
          </span>

          <button type="button" onClick={onNext} disabled={!hasNext} className="rm-btn-outline" style={{ padding: '6px 10px' }}>
            Next <ChevronRight size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (jumpInput.trim()) {
                onJumpToCode(jumpInput.trim());
                setJumpInput('');
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <input
              type="text"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder="L1-045 / 45"
              style={{
                width: '86px',
                padding: '6px 9px',
                borderRadius: '8px',
                border: '1px solid var(--border-default, #cbd5e1)',
                background: 'var(--bg-secondary, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            />
            <button type="submit" className="rm-btn-outline" style={{ padding: '6px 10px' }}>
              Go
            </button>
          </form>

          {!isPublicPreview && (
            <>
              <button
                type="button"
                onClick={handleToggleBookmark}
                disabled={savingFlag}
                className="rm-btn-outline"
                style={{
                  padding: '6px 10px',
                  borderColor: isBookmarked ? '#f59e0b' : undefined,
                  color: isBookmarked ? '#d97706' : undefined,
                }}
                title="Bookmark problem"
              >
                <Bookmark size={14} fill={isBookmarked ? '#f59e0b' : 'none'} />
              </button>

              <button
                type="button"
                onClick={handleToggleRevised}
                disabled={savingFlag}
                className="rm-btn-outline"
                style={{
                  padding: '6px 11px',
                  borderColor: isRevised ? '#8b5cf6' : undefined,
                  color: isRevised ? '#7c3aed' : undefined,
                }}
                title="Mark for Revision Done"
              >
                <RotateCcw size={13} /> {isRevised ? 'Revised' : 'Mark Revised'}
              </button>

              <button
                type="button"
                onClick={handleToggleSolved}
                disabled={savingFlag}
                className={isSolved ? 'rm-btn-success' : 'rm-btn-primary'}
                style={{ padding: '7px 13px' }}
              >
                <CheckCircle2 size={15} />
                {isSolved ? 'Solved ✓' : `Mark Solved (+${xpReward} XP)`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Problem Header Metadata */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              background: 'rgba(2, 132, 199, 0.12)',
              color: '#0284c7',
              border: '1px solid rgba(2, 132, 199, 0.3)',
            }}
          >
            {problem.problem_code}
          </span>
          <span className={`rm-diff-badge ${problem.difficulty}`}>{problem.difficulty}</span>
          <span className="rm-company-chip" style={{ fontWeight: 800 }}>
            <Layers size={11} style={{ marginRight: '4px' }} /> {problem.topic}
          </span>
          {problem.batch_name && (
            <span className="rm-company-chip">
              Level {problem.level_number} • {problem.batch_name}
            </span>
          )}
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '11.5px',
              fontWeight: 800,
              color: '#059669',
            }}
          >
            +{xpReward} XP
          </span>
        </div>

        <h2 style={{ margin: 0, fontSize: 'clamp(1.15rem, 2vw, 1.45rem)', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
          {problem.title}
        </h2>

        {/* Company Tags */}
        {Array.isArray(problem.company_tags) && problem.company_tags.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginRight: '2px' }}>
              Frequently Asked In:
            </span>
            {problem.company_tags.map((tag) => (
              <span key={tag} className="rm-company-chip">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Statement & Hinglish Description */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            fontSize: '14.5px',
            lineHeight: 1.65,
            fontWeight: 600,
            color: 'var(--text-primary, #0f172a)',
          }}
        >
          {problem.problem_statement}
        </div>

        {problem.description && (
          <div className="rm-info-callout hinglish">
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
              Hinglish Samajh (Problem Summary)
            </span>
            <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55, color: 'var(--text-primary, #0f172a)' }}>
              {problem.description}
            </p>
          </div>
        )}
      </div>

      {/* Constraints & Edge Cases */}
      <div className="rm-compare-grid">
        {Array.isArray(problem.constraints) && problem.constraints.length > 0 && (
          <div className="rm-approach-card">
            <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
              Constraints
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {problem.constraints.map((c, idx) => (
                <code key={idx} className="rm-mono-pill">
                  {c}
                </code>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(problem.edge_cases) && problem.edge_cases.length > 0 && (
          <div className="rm-info-callout edge">
            <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <AlertTriangle size={14} /> INTERVIEW EDGE CASES
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-primary, #0f172a)', lineHeight: 1.5 }}>
              {problem.edge_cases.map((e, idx) => (
                <li key={idx}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 3+ Test Cases Grid */}
      {Array.isArray(problem.test_cases) && problem.test_cases.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary, #475569)', textTransform: 'uppercase' }}>
            Sample Test Cases ({problem.test_cases.length})
          </div>
          <div className="rm-tc-grid">
            {problem.test_cases.map((tc, idx) => (
              <div key={idx} className="rm-tc-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7' }}>Case #{idx + 1}</span>
                  <button
                    type="button"
                    className="rm-btn-outline"
                    style={{ padding: '2px 8px', fontSize: '11px' }}
                    onClick={() => {
                      setCustomStdin(tc.input);
                      setActiveSubTab('sandbox');
                    }}
                  >
                    Try in Sandbox
                  </button>
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>Input:</div>
                <code className="rm-mono-pill">{tc.input}</code>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>Output:</div>
                <code className="rm-mono-pill" style={{ color: '#059669', fontWeight: 700 }}>{tc.output}</code>
                {tc.explanation && (
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary, #475569)', lineHeight: 1.45 }}>
                    {tc.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hinglish Concept Theory Box */}
      {problem.theory && (
        <div className="rm-info-callout theory">
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} /> PROBLEM THEORY & PATTERN HINT
          </div>
          <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55, color: 'var(--text-primary, #0f172a)' }}>
            {problem.theory}
          </p>
        </div>
      )}

      {/* Solutions & Live C++17 Sandbox Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '6px', borderTop: '1px solid var(--border-default, #e2e8f0)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveSubTab('solutions')}
            className={activeSubTab === 'solutions' ? 'rm-btn-primary' : 'rm-btn-outline'}
          >
            <Zap size={14} /> Brute Force vs Optimized (C++17)
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('sandbox')}
            className={activeSubTab === 'sandbox' ? 'rm-btn-primary' : 'rm-btn-outline'}
          >
            <Terminal size={14} /> Live C++17 Sandbox & Judge
          </button>
        </div>

        {activeSubTab === 'solutions' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setRevealSolutions((v) => !v)}
              className="rm-btn-outline"
              style={{ fontSize: '12px' }}
            >
              {revealSolutions ? <EyeOff size={13} /> : <Eye size={13} />}
              {revealSolutions ? 'Hide Solutions (Self-Think Mode)' : 'Reveal Brute & Optimal'}
            </button>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: BRUTE FORCE VS OPTIMIZED COMPARE */}
      {activeSubTab === 'solutions' && (
        <>
          {!revealSolutions ? (
            <div className="rm-approach-card" style={{ textAlign: 'center', padding: '28px 16px' }}>
              <Flame size={28} color="#f59e0b" style={{ margin: '0 auto' }} />
              <h4 style={{ margin: '6px 0 2px', fontSize: '15px', fontWeight: 800 }}>Self-Think Mode Active</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #475569)' }}>
                Pehle brute force complexity socho, phir bottleneck optimize karo — ya Live Sandbox me khud code run karo!
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setActiveSubTab('sandbox')} className="rm-btn-primary">
                  Open Live C++ Sandbox
                </button>
                <button type="button" onClick={() => setRevealSolutions(true)} className="rm-btn-outline">
                  Show Solutions
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['compare', 'brute', 'optimized'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSolutionView(mode)}
                    className={solutionView === mode ? 'rm-btn-primary' : 'rm-btn-outline'}
                    style={{ padding: '5px 11px', fontSize: '12px' }}
                  >
                    {mode === 'compare' ? 'Side-by-Side Compare' : mode === 'brute' ? 'Brute Force Only' : 'Optimized Only'}
                  </button>
                ))}
              </div>

              <div className={solutionView === 'compare' ? 'rm-compare-grid' : undefined} style={solutionView !== 'compare' ? { display: 'flex', flexDirection: 'column', gap: '12px' } : undefined}>
                {/* Brute Force */}
                {(solutionView === 'compare' || solutionView === 'brute') && (
                  <div className="rm-approach-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>
                        Brute Force Approach
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span className="rm-mono-pill">T: {problem.brute_force?.time || 'N/A'}</span>
                        <span className="rm-mono-pill">S: {problem.brute_force?.space || 'N/A'}</span>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary, #0f172a)', lineHeight: 1.5 }}>
                      {problem.brute_force?.approach}
                    </p>
                    <pre className="rm-code-pre">{problem.brute_force?.code_cpp}</pre>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="rm-btn-outline"
                        style={{ padding: '5px 10px', fontSize: '11.5px' }}
                        onClick={() => handleCopy('brute', problem.brute_force?.code_cpp || '')}
                      >
                        {copiedId === 'brute' ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                        {copiedId === 'brute' ? 'Copied' : 'Copy Code'}
                      </button>
                      <button
                        type="button"
                        className="rm-btn-outline"
                        style={{ padding: '5px 10px', fontSize: '11.5px' }}
                        onClick={() => handleLoadIntoSandbox(problem.brute_force?.code_cpp || '')}
                      >
                        <Play size={13} /> Run in Sandbox
                      </button>
                    </div>
                  </div>
                )}

                {/* Optimized */}
                {(solutionView === 'compare' || solutionView === 'optimized') && (
                  <div className="rm-approach-card" style={{ borderColor: 'rgba(16, 185, 129, 0.35)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
                        Optimized Interview Solution
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span className="rm-mono-pill" style={{ color: '#059669', fontWeight: 700 }}>
                          T: {problem.optimized?.time || 'N/A'}
                        </span>
                        <span className="rm-mono-pill" style={{ color: '#0284c7', fontWeight: 700 }}>
                          S: {problem.optimized?.space || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary, #0f172a)', lineHeight: 1.5 }}>
                      {problem.optimized?.approach}
                    </p>
                    <pre className="rm-code-pre">{problem.optimized?.code_cpp}</pre>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="rm-btn-outline"
                        style={{ padding: '5px 10px', fontSize: '11.5px' }}
                        onClick={() => handleCopy('opt', problem.optimized?.code_cpp || '')}
                      >
                        {copiedId === 'opt' ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                        {copiedId === 'opt' ? 'Copied' : 'Copy Code'}
                      </button>
                      <button
                        type="button"
                        className="rm-btn-primary"
                        style={{ padding: '5px 11px', fontSize: '11.5px' }}
                        onClick={() => handleLoadIntoSandbox(problem.optimized?.code_cpp || '')}
                      >
                        <Play size={13} /> Test in Sandbox
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Hinglish Step-by-Step Explanation */}
              {problem.explanation && (
                <div className="rm-info-callout hinglish">
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Code2 size={14} /> HINGLISH STEP-BY-STEP EXPLANATION
                  </div>
                  <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6, color: 'var(--text-primary, #0f172a)' }}>
                    {problem.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* SUB-TAB 2: LIVE C++17 SANDBOX & JUDGE */}
      {activeSubTab === 'sandbox' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setEditorCode(starterCode)}
                className="rm-btn-outline"
                style={{ padding: '5px 10px', fontSize: '12px' }}
              >
                Reset Starter
              </button>
              <button
                type="button"
                onClick={() => setEditorCode(problem.brute_force?.code_cpp || starterCode)}
                className="rm-btn-outline"
                style={{ padding: '5px 10px', fontSize: '12px' }}
              >
                Load Brute Force
              </button>
              <button
                type="button"
                onClick={() => setEditorCode(problem.optimized?.code_cpp || starterCode)}
                className="rm-btn-outline"
                style={{ padding: '5px 10px', fontSize: '12px' }}
              >
                Load Optimized
              </button>
            </div>

            <button
              type="button"
              onClick={handleRunTestCases}
              disabled={running}
              className="rm-btn-primary"
            >
              {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              {running ? 'Compiling & Running C++17...' : `Run All Test Cases (${problem.test_cases?.length || 0})`}
            </button>
          </div>

          <textarea
            className="rm-cpp-editor"
            value={editorCode}
            onChange={(e) => setEditorCode(e.target.value)}
            onKeyDown={handleEditorKeyDown}
            spellCheck={false}
          />

          <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>
            Tip: Write either the standalone C++17 function (e.g. <code>{parsePrimaryCppSignature(problem.optimized?.code_cpp || '')?.name || 'solution'}(...)</code>) OR a full <code>int main()</code> program with <code>#include &lt;bits/stdc++.h&gt;</code>. Passing all test cases automatically marks Solved & awards +{xpReward} XP!
          </p>

          {/* Custom Stdin Bar */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              value={customStdin}
              onChange={(e) => setCustomStdin(e.target.value)}
              placeholder="Custom test input (e.g. [3,2,1,5,2])"
              style={{
                flex: '1 1 240px',
                padding: '8px 12px',
                borderRadius: '9px',
                border: '1px solid var(--border-default, #cbd5e1)',
                background: 'var(--bg-secondary, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '12.5px',
                fontFamily: 'monospace',
              }}
            />
            <button
              type="button"
              onClick={handleRunCustomStdin}
              disabled={running}
              className="rm-btn-outline"
            >
              <Play size={13} /> Run Custom Input
            </button>
          </div>

          {runError && (
            <div className="rm-info-callout edge" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#ef4444' }}>Compilation / Runtime Output</span>
              <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', color: 'var(--text-primary, #0f172a)' }}>{runError}</pre>
            </div>
          )}

          {customOutput !== null && (
            <div className="rm-info-callout hinglish">
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0284c7' }}>Custom Input Stdout</span>
              <code className="rm-mono-pill">{customOutput}</code>
            </div>
          )}

          {testResults && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: testResults.every((t) => t.passed) ? '#059669' : '#ef4444' }}>
                  {testResults.filter((t) => t.passed).length} / {testResults.length} Test Cases Passed
                </span>
              </div>
              <div className="rm-tc-grid">
                {testResults.map((r) => (
                  <div
                    key={r.index}
                    className="rm-tc-card"
                    style={{
                      borderColor: r.passed ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 800 }}>Case #{r.index}</span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          color: r.passed ? '#059669' : '#ef4444',
                        }}
                      >
                        {r.passed ? 'PASSED ✓' : r.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>Input:</div>
                    <code className="rm-mono-pill">{r.input}</code>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>Expected vs Your Output:</div>
                    <code className="rm-mono-pill">Exp: {r.expectedOutput}</code>
                    <code className="rm-mono-pill" style={{ color: r.passed ? '#059669' : '#ef4444' }}>
                      Got: {r.actualOutput || r.errorText || '(empty)'}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

