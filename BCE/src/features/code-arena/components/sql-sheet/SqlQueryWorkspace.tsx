'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  CheckCircle2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Database,
  Bookmark,
  RotateCcw,
  Sparkles,
  Terminal,
  ListChecks,
  Layers,
  BookOpen,
  AlertCircle,
  Loader2,
  ArrowDownToLine,
} from 'lucide-react';
import {
  PRACTICE_TABLES,
  type SqlSheetQuestion,
  type SqlQuestionProgress,
} from '@/features/code-arena/data/sqlSheetReference';
import { runSqlInSandbox, type SqlRunResult } from '@/features/code-arena/lib/sqlSandbox';

interface SqlQueryWorkspaceProps {
  question: SqlSheetQuestion;
  progress?: SqlQuestionProgress;
  isPublicPreview?: boolean;
  onSaveProgress: (payload: {
    questionNumber: number;
    questionType: 'QUERY';
    isSolved: boolean;
    submittedSql: string;
  }) => Promise<{ xpAwarded?: number } | void>;
  onToggleBookmark: (questionNumber: number, questionType: 'QUERY', nextState: boolean) => Promise<void>;
}

const SQL_CHIPS = [
  'SELECT',
  '*',
  'FROM',
  'WHERE',
  'AND',
  'JOIN',
  'LEFT JOIN',
  'ON',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'DESC',
  'LIMIT',
  'OVER ()',
];

export default function SqlQueryWorkspace({
  question,
  progress,
  isPublicPreview = false,
  onSaveProgress,
  onToggleBookmark,
}: SqlQueryWorkspaceProps) {
  const [sqlInput, setSqlInput] = useState<string>(progress?.submitted_sql || '');
  const [running, setRunning] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<SqlRunResult | null>(null);
  const [outputTab, setOutputTab] = useState<'yours' | 'expected'>('yours');
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [activeSchemaTable, setActiveSchemaTable] = useState<string | null>(null);
  const [recentXp, setRecentXp] = useState<number>(0);
  const [markingSolved, setMarkingSolved] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setRunResult(null);
    setOutputTab('yours');
    setShowSolution(false);
    setRecentXp(0);
  }, [question.question_number]);

  useEffect(() => {
    setSqlInput(progress?.submitted_sql || '');
  }, [question.question_number, progress?.submitted_sql]);

  const isSolved = Boolean(progress?.is_solved);
  const isBookmarked = Boolean(progress?.is_bookmarked);

  const insertToken = (token: string) => {
    const el = textareaRef.current;
    if (!el) {
      setSqlInput((prev) => (prev ? `${prev} ${token}` : token));
      return;
    }
    const start = el.selectionStart ?? sqlInput.length;
    const end = el.selectionEnd ?? sqlInput.length;
    const before = sqlInput.slice(0, start);
    const after = sqlInput.slice(end);
    const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
    const insertStr = `${needsLeadingSpace ? ' ' : ''}${token} `;
    const nextVal = `${before}${insertStr}${after}`;
    setSqlInput(nextVal);
    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length + insertStr.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleRunSql = async (verifyAgainstSolution: boolean) => {
    if (running) return;
    setRunning(true);
    setOutputTab('yours');
    try {
      const res = await runSqlInSandbox(
        sqlInput,
        verifyAgainstSolution ? question.solution_sql : undefined
      );
      setRunResult(res);

      if (verifyAgainstSolution && res.isMatch && !res.error && !isPublicPreview) {
        const saved = await onSaveProgress({
          questionNumber: question.question_number,
          questionType: 'QUERY',
          isSolved: true,
          submittedSql: sqlInput,
        });
        if (saved && saved.xpAwarded && saved.xpAwarded > 0) {
          setRecentXp(saved.xpAwarded);
        }
      }
    } finally {
      setRunning(false);
    }
  };

  const handleManualMarkSolved = async () => {
    if (isPublicPreview || markingSolved) return;
    setMarkingSolved(true);
    try {
      const saved = await onSaveProgress({
        questionNumber: question.question_number,
        questionType: 'QUERY',
        isSolved: true,
        submittedSql: sqlInput || question.solution_sql || '',
      });
      if (saved && saved.xpAwarded && saved.xpAwarded > 0) {
        setRecentXp(saved.xpAwarded);
      }
    } finally {
      setMarkingSolved(false);
    }
  };

  const handleLoadSolution = () => {
    setSqlInput(question.solution_sql || '');
    setShowSolution(true);
  };

  const handleCopySolution = () => {
    if (!question.solution_sql) return;
    navigator.clipboard.writeText(question.solution_sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 1800);
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunSql(true);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const updated = sqlInput.slice(0, start) + '  ' + sqlInput.slice(end);
      setSqlInput(updated);
      requestAnimationFrame(() => {
        target.setSelectionRange(start + 2, start + 2);
      });
    }
  };

  const diffClass =
    question.difficulty === 'HARD'
      ? 'difficulty-HARD'
      : question.difficulty === 'MEDIUM'
      ? 'difficulty-MEDIUM'
      : 'difficulty-EASY';

  const selectedSchemaObj = PRACTICE_TABLES.find((t) => t.name === activeSchemaTable);

  return (
    <div className="sql-workbench-card">
      {/* Header Meta */}
      <div className="sql-card-header-row">
        <div className="sql-card-badges">
          <span className="sql-qnum-badge">Q{question.question_number}</span>
          <span className="sql-type-pill sql-type-query">SQL QUERY</span>
          <span className={`difficulty-badge-styled ${diffClass}`}>{question.difficulty}</span>
          <span className="sql-section-pill">{question.section}</span>
        </div>

        <div className="sql-card-actions-right">
          {(recentXp > 0 || (isSolved && (progress?.xp_awarded || 0) > 0)) && (
            <span className="sql-xp-burst">
              <Sparkles size={12} /> +{recentXp > 0 ? recentXp : progress?.xp_awarded} XP
            </span>
          )}
          {isSolved && (
            <span className="sql-solved-pill">
              <CheckCircle2 size={14} /> Solved
            </span>
          )}
          {!isPublicPreview && (
            <button
              type="button"
              onClick={() => onToggleBookmark(question.question_number, 'QUERY', !isBookmarked)}
              className={`sql-icon-toggle ${isBookmarked ? 'active' : ''}`}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Query'}
            >
              <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </div>

      {/* Prompt */}
      <h2 className="sql-question-heading">{question.question}</h2>

      {/* Quick Schema Pill Strip */}
      <div className="sql-schema-strip-wrap">
        <div className="sql-schema-strip">
          <span className="sql-schema-strip-label">
            <Database size={13} /> Tables:
          </span>
          {PRACTICE_TABLES.map((tbl) => (
            <button
              key={tbl.name}
              type="button"
              onClick={() => setActiveSchemaTable((prev) => (prev === tbl.name ? null : tbl.name))}
              className={`sql-table-chip ${activeSchemaTable === tbl.name ? 'active' : ''}`}
            >
              {tbl.name}
            </button>
          ))}
        </div>

        {selectedSchemaObj && (
          <div className="sql-schema-quick-drawer">
            <div className="sql-schema-drawer-title">
              <span>{selectedSchemaObj.name}</span>
              <span className="sql-schema-drawer-hint">Click any column to insert into query</span>
            </div>
            <div className="sql-column-chips-wrap">
              {selectedSchemaObj.columns.map((col) => (
                <button
                  key={col.name}
                  type="button"
                  onClick={() => insertToken(col.name)}
                  className="sql-col-chip"
                  title={`${col.type}${col.note ? ` (${col.note})` : ''}`}
                >
                  {col.key && <span className={`sql-key-tag ${col.key.toLowerCase()}`}>{col.key}</span>}
                  <span>{col.name}</span>
                  <span className="sql-col-type">{col.type}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive SQL Editor */}
      <div className="sql-editor-shell">
        <div className="sql-editor-topbar">
          <span className="sql-editor-title">
            <Terminal size={14} style={{ color: 'var(--neon-cyan, #06b6d4)' }} />
            Live SQL Sandbox (SQLite + MySQL Compatibility Engine)
          </span>
          <span className="sql-editor-shortcut">Ctrl + Enter to Verify</span>
        </div>

        {/* Mobile/Desktop SQL Keyword Helper Strip */}
        <div className="sql-keyword-bar">
          {SQL_CHIPS.map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => insertToken(kw)}
              className="sql-kw-chip"
            >
              {kw}
            </button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={sqlInput}
          onChange={(e) => setSqlInput(e.target.value)}
          onKeyDown={handleEditorKeyDown}
          placeholder={`-- Write your SQL query for Q${question.question_number} here...\nSELECT * FROM employees;`}
          rows={6}
          spellCheck={false}
          className="sql-code-textarea"
        />

        <div className="sql-editor-footer">
          <div className="sql-editor-btn-group">
            <button
              type="button"
              disabled={running}
              onClick={() => handleRunSql(false)}
              className="sql-btn sql-btn-secondary"
            >
              {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              Run SQL
            </button>

            <button
              type="button"
              disabled={running}
              onClick={() => handleRunSql(true)}
              className="sql-btn sql-btn-primary"
            >
              {running ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Run &amp; Check Output
            </button>

            <button
              type="button"
              onClick={() => setSqlInput('')}
              className="sql-btn sql-btn-ghost"
              title="Clear Editor"
            >
              <RotateCcw size={14} /> Clear
            </button>
          </div>

          <div className="sql-editor-btn-group">
            <button
              type="button"
              onClick={handleLoadSolution}
              className="sql-btn sql-btn-ghost"
              title="Load Solution into Editor to Test"
            >
              <ArrowDownToLine size={14} /> Try Solution
            </button>

            {!isPublicPreview && !isSolved && (
              <button
                type="button"
                disabled={markingSolved}
                onClick={handleManualMarkSolved}
                className="sql-btn sql-btn-emerald"
              >
                <Check size={14} /> Mark Practiced
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Execution Result Output */}
      {runResult && (
        <div className="sql-output-panel">
          <div className="sql-output-header">
            <div className="sql-output-status-wrap">
              {runResult.error ? (
                <span className="sql-status-badge error">
                  <AlertCircle size={14} /> SQL Error
                </span>
              ) : runResult.isMatch === true ? (
                <span className="sql-status-badge success">
                  <CheckCircle2 size={14} /> {runResult.matchReason}
                </span>
              ) : runResult.isMatch === false ? (
                <span className="sql-status-badge warn">
                  <AlertCircle size={14} /> {runResult.matchReason}
                </span>
              ) : (
                <span className="sql-status-badge info">
                  <Check size={14} /> {runResult.message}
                </span>
              )}
              <span className="sql-runtime-badge">{runResult.executionTimeMs} ms</span>
            </div>

            {runResult.expectedColumns && runResult.expectedRows && (
              <div className="sql-output-tab-switch">
                <button
                  type="button"
                  onClick={() => setOutputTab('yours')}
                  className={`sql-mini-tab ${outputTab === 'yours' ? 'active' : ''}`}
                >
                  Your Output ({runResult.rowCount})
                </button>
                <button
                  type="button"
                  onClick={() => setOutputTab('expected')}
                  className={`sql-mini-tab ${outputTab === 'expected' ? 'active' : ''}`}
                >
                  Expected Output ({runResult.expectedRows.length})
                </button>
              </div>
            )}
          </div>

          {runResult.error ? (
            <div className="sql-error-box">{runResult.error}</div>
          ) : (
            (() => {
              const cols = outputTab === 'expected' && runResult.expectedColumns ? runResult.expectedColumns : runResult.columns;
              const rows = outputTab === 'expected' && runResult.expectedRows ? runResult.expectedRows : runResult.rows;

              if (cols.length === 0) {
                return <div className="sql-empty-result">{runResult.message}</div>;
              }

              return (
                <div className="sql-result-table-scroll">
                  <table className="sql-result-table">
                    <thead>
                      <tr>
                        {cols.map((col, idx) => (
                          <th key={`${col}-${idx}`}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={cols.length} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                            (0 rows returned)
                          </td>
                        </tr>
                      ) : (
                        rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx}>
                                {cell === null || cell === undefined ? (
                                  <span className="sql-null-pill">NULL</span>
                                ) : (
                                  String(cell)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Toggle Solution & Deep Explanation */}
      <div className="sql-solution-reveal-bar">
        <button
          type="button"
          onClick={() => setShowSolution((prev) => !prev)}
          className={`sql-reveal-toggle-btn ${showSolution ? 'open' : ''}`}
        >
          {showSolution ? <EyeOff size={16} /> : <Eye size={16} />}
          {showSolution ? 'Hide Solution & Step-by-Step Breakdown' : 'Reveal Reference SQL Solution, Steps & Clause Breakdown'}
        </button>
      </div>

      {showSolution && (
        <div className="sql-solution-details-box">
          {/* Reference SQL */}
          <div className="sql-sol-code-card">
            <div className="sql-sol-code-header">
              <span>Reference SQL Solution</span>
              <button type="button" onClick={handleCopySolution} className="sql-mini-btn">
                {copiedSql ? <Check size={13} /> : <Copy size={13} />}
                {copiedSql ? 'Copied' : 'Copy SQL'}
              </button>
            </div>
            <pre className="sql-sol-pre">
              <code>{question.solution_sql}</code>
            </pre>
          </div>

          {/* Step-by-Step & Clause Breakdown Grid */}
          <div className="sql-breakdown-grid">
            {question.step_by_step && question.step_by_step.length > 0 && (
              <div className="sql-info-subcard">
                <div className="sql-subcard-heading">
                  <ListChecks size={15} className="sql-color-correct" /> Step-by-Step Intuition
                </div>
                <ol className="sql-steps-ol">
                  {question.step_by_step.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {question.clause_breakdown && question.clause_breakdown.length > 0 && (
              <div className="sql-info-subcard">
                <div className="sql-subcard-heading">
                  <Layers size={15} style={{ color: '#38bdf8' }} /> Clause-by-Clause Breakdown
                </div>
                <div className="sql-clauses-stack">
                  {question.clause_breakdown.map((cb, idx) => (
                    <div key={idx} className="sql-clause-row">
                      <code className="sql-clause-code">{cb.code}</code>
                      <span className="sql-clause-meaning">{cb.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Basic Concepts */}
          {question.basic_concepts && question.basic_concepts.length > 0 && (
            <div className="sql-info-subcard" style={{ marginTop: '12px' }}>
              <div className="sql-subcard-heading">
                <BookOpen size={15} style={{ color: '#a855f7' }} /> Basic Concepts to Remember
              </div>
              <ul className="sql-concepts-list compact">
                {question.basic_concepts.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

