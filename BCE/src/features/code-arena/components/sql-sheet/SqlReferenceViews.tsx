'use client';

import React, { useState, useMemo } from 'react';
import {
  Database,
  Sparkles,
  Search,
  KeyRound,
  BookOpen,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import {
  PRACTICE_TABLES,
  DIALECT_NOTES,
  QUICK_REVISION_CHEAT_SHEET,
  STUDY_TIPS,
  type SqlSheetQuestion,
  type SqlQuestionProgress,
} from '@/features/code-arena/data/sqlSheetReference';
import FocusTimer from '@/features/code-arena/components/FocusTimer';

export function PracticeTablesView() {
  const [selectedTable, setSelectedTable] = useState<string>('employees');
  const activeTable = PRACTICE_TABLES.find((t) => t.name === selectedTable) || PRACTICE_TABLES[0];

  return (
    <div className="sql-reference-container">
      {/* Study Tips Card */}
      <div className="sql-ref-card">
        <div className="sql-ref-header">
          <BookOpen size={18} style={{ color: 'var(--neon-cyan, #06b6d4)' }} />
          <h3>How to Master This TCS SQL Sheet</h3>
        </div>
        <div className="sql-tips-grid">
          {STUDY_TIPS.map((tip, idx) => (
            <div key={idx} className="sql-tip-item">
              <span className="sql-tip-num">{idx + 1}</span>
              <p>{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Practice Tables Viewer */}
      <div className="sql-ref-card">
        <div className="sql-ref-header">
          <Database size={18} style={{ color: '#a855f7' }} />
          <h3>Practice Database Schema &amp; Live Sample Data</h3>
        </div>
        <p className="sql-ref-desc">
          Every SQL Query Practice question (Q383–Q530) runs in our in-browser SQL engine seeded with these 5 interview tables.
        </p>

        <div className="sql-table-selector-tabs">
          {PRACTICE_TABLES.map((tbl) => (
            <button
              key={tbl.name}
              type="button"
              onClick={() => setSelectedTable(tbl.name)}
              className={`sql-table-tab-btn ${tbl.name === selectedTable ? 'active' : ''}`}
            >
              <Database size={14} /> {tbl.name}
              <span className="sql-table-col-count">{tbl.columns.length} cols</span>
            </button>
          ))}
        </div>

        <div className="sql-selected-table-detail">
          <div className="sql-table-meta-desc">{activeTable.description}</div>

          {/* Columns Schema Grid */}
          <div className="sql-schema-cols-grid">
            {activeTable.columns.map((col) => (
              <div key={col.name} className="sql-schema-col-box">
                <div className="sql-schema-col-top">
                  <span className="sql-schema-col-name">{col.name}</span>
                  {col.key && (
                    <span className={`sql-key-tag ${col.key.toLowerCase()}`}>
                      <KeyRound size={10} /> {col.key}
                    </span>
                  )}
                </div>
                <div className="sql-schema-col-type">
                  {col.type}
                  {col.note ? ` • ${col.note}` : ''}
                </div>
              </div>
            ))}
          </div>

          {/* Sample Rows Table */}
          <div className="sql-sample-rows-heading">Sample Preloaded Rows ({activeTable.sampleRows.length})</div>
          <div className="sql-result-table-scroll">
            <table className="sql-result-table">
              <thead>
                <tr>
                  {Object.keys(activeTable.sampleRows[0] || {}).map((k) => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeTable.sampleRows.map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((val, cIdx) => (
                      <td key={cIdx}>
                        {val === null ? <span className="sql-null-pill">NULL</span> : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dialect Notes Comparison Matrix */}
      <div className="sql-ref-card">
        <div className="sql-ref-header">
          <Sparkles size={18} style={{ color: '#f59e0b' }} />
          <h3>SQL Dialect Notes (Crucial for TCS Interviews)</h3>
        </div>
        <div className="sql-result-table-scroll">
          <table className="sql-result-table">
            <thead>
              <tr>
                <th>Concept</th>
                <th>MySQL / PostgreSQL</th>
                <th>SQL Server</th>
                <th>Oracle</th>
              </tr>
            </thead>
            <tbody>
              {DIALECT_NOTES.map((row) => (
                <tr key={row.topic}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.topic}</td>
                  <td><code>{row.mysqlPg}</code></td>
                  <td><code>{row.sqlServer}</code></td>
                  <td><code>{row.oracle}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CheatSheetView() {
  const [filter, setFilter] = useState('');

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return QUICK_REVISION_CHEAT_SHEET;
    return QUICK_REVISION_CHEAT_SHEET.filter(
      (r) => r.topic.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q)
    );
  }, [filter]);

  return (
    <div className="sql-reference-container">
      <div className="sql-ref-card">
        <div className="sql-cheat-header-bar">
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <Sparkles size={18} style={{ color: 'var(--neon-cyan, #06b6d4)' }} />
              SQL Quick Revision Cheat Sheet (Last-Minute TCS Interview Prep)
            </h3>
            <p className="sql-ref-desc" style={{ marginTop: '6px' }}>
              12 high-yield summary cards distilled from the 78-page SQL Mastery handbook.
            </p>
          </div>
          <div className="sql-cheat-search-box">
            <Search size={15} style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter cheat sheet..."
            />
          </div>
        </div>

        <div className="sql-cheatsheet-grid">
          {filteredRows.map((item) => (
            <div key={item.topic} className="sql-cheat-card">
              <div className="sql-cheat-topic">{item.topic}</div>
              <div className="sql-cheat-summary">{item.summary}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface QuizSessionViewProps {
  questions: SqlSheetQuestion[];
  progressMap: Record<number, SqlQuestionProgress>;
  isPublicPreview?: boolean;
  onSubmitMcq: (payload: {
    questionNumber: number;
    questionType: 'MCQ';
    isSolved: boolean;
    selectedOption: string;
  }) => Promise<{ xpAwarded?: number } | void>;
}

export function QuizSessionView({
  questions,
  progressMap,
  isPublicPreview = false,
  onSubmitMcq,
}: QuizSessionViewProps) {
  const mcqs = useMemo(() => questions.filter((q) => q.type === 'MCQ'), [questions]);
  const mcqSections = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    mcqs.forEach((q) => {
      if (!seen.has(q.section)) {
        seen.add(q.section);
        list.push(q.section);
      }
    });
    return list;
  }, [mcqs]);

  const [selectedSection, setSelectedSection] = useState<string>('ALL_MIX_20');
  const [onlyUnsolved, setOnlyUnsolved] = useState<boolean>(false);
  const [quizActive, setQuizActive] = useState<boolean>(false);
  const [quizDeck, setQuizDeck] = useState<SqlSheetQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [sessionXp, setSessionXp] = useState<number>(0);
  const [finished, setFinished] = useState<boolean>(false);

  const startQuiz = () => {
    let pool = [...mcqs];
    if (onlyUnsolved) {
      pool = pool.filter((q) => !progressMap[q.question_number]?.is_solved);
    }
    if (selectedSection === 'ALL_MIX_20') {
      // Deterministic-ish shuffle then take 20
      pool = [...pool].sort(() => Math.random() - 0.5).slice(0, 20);
    } else if (selectedSection !== 'ALL') {
      pool = pool.filter((q) => q.section === selectedSection);
    }
    setQuizDeck(pool);
    setCurrentIdx(0);
    setAnswers({});
    setSessionXp(0);
    setFinished(false);
    setQuizActive(true);
  };

  if (!quizActive) {
    return (
      <div className="sql-reference-container">
        <div className="sql-ref-card">
          <div className="sql-ref-header">
            <Trophy size={18} style={{ color: '#f59e0b' }} />
            <h3>TCS MCQ Practice Quiz Mode</h3>
          </div>
          <p className="sql-ref-desc">
            Test yourself under interview conditions across specific MCQ modules or a rapid 20-question randomized TCS mix. Solved answers automatically sync to your sheet progress!
          </p>

          <div className="sql-quiz-setup-grid">
            <div className="sql-quiz-field">
              <label>Choose Module / Deck</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="sql-select"
              >
                <option value="ALL_MIX_20">Randomized Mock Test (20 MCQs)</option>
                {mcqSections.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
                <option value="ALL">All 382 MCQs Marathon</option>
              </select>
            </div>

            <label className="sql-checkbox-row">
              <input
                type="checkbox"
                checked={onlyUnsolved}
                onChange={(e) => setOnlyUnsolved(e.target.checked)}
              />
              <span>Only include Unsolved MCQs</span>
            </label>
          </div>

          <button type="button" onClick={startQuiz} className="sql-btn sql-btn-primary" style={{ marginTop: '16px' }}>
            <Play size={15} /> Start Practice Quiz
          </button>
        </div>
      </div>
    );
  }

  if (quizDeck.length === 0) {
    return (
      <div className="sql-ref-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          No matching MCQs found (you may have already solved all questions in this filter!).
        </p>
        <button type="button" onClick={() => setQuizActive(false)} className="sql-btn sql-btn-secondary">
          <RotateCcw size={15} /> Back to Quiz Setup
        </button>
      </div>
    );
  }

  const totalQ = quizDeck.length;
  const correctCount = quizDeck.filter(
    (q) => answers[q.question_number]?.toUpperCase() === (q.correct_option || '').toUpperCase()
  ).length;
  const answeredCount = Object.keys(answers).length;

  if (finished) {
    const pct = Math.round((correctCount / totalQ) * 100);
    return (
      <div className="sql-ref-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
        <Trophy size={42} style={{ color: '#f59e0b', margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: '0 0 8px' }}>Quiz Session Complete!</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Total Correct: <strong className="sql-color-correct">{correctCount} / {totalQ}</strong> ({pct}% accuracy)
          {sessionXp > 0 && (
            <>
              {' • '}
              <strong className="sql-color-bookmark">+{sessionXp} XP Earned</strong>
            </>
          )}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button type="button" onClick={startQuiz} className="sql-btn sql-btn-primary">
            <RotateCcw size={15} /> New Session
          </button>
          <button type="button" onClick={() => setQuizActive(false)} className="sql-btn sql-btn-secondary">
            Change Module
          </button>
        </div>
      </div>
    );
  }

  const currentQ = quizDeck[currentIdx];
  const userChoice = answers[currentQ.question_number];
  const correctChoice = (currentQ.correct_option || '').toUpperCase();

  const handleChoose = async (optKey: string) => {
    if (userChoice) return;
    setAnswers((prev) => ({ ...prev, [currentQ.question_number]: optKey }));
    if (!isPublicPreview) {
      const res = await onSubmitMcq({
        questionNumber: currentQ.question_number,
        questionType: 'MCQ',
        isSolved: optKey.toUpperCase() === correctChoice,
        selectedOption: optKey,
      });
      if (res && res.xpAwarded && res.xpAwarded > 0) {
        setSessionXp((prev) => prev + (res.xpAwarded || 0));
      }
    }
  };

  return (
    <div className="sql-workbench-card">
      <div className="sql-card-header-row">
        <div className="sql-card-badges">
          <span className="sql-qnum-badge">
            {currentIdx + 1} / {totalQ}
          </span>
          <span className="sql-section-pill">{currentQ.section}</span>
        </div>
        <div className="sql-card-actions-right">
          <FocusTimer resetKey={currentQ.question_number} />
          {sessionXp > 0 && (
            <span className="sql-xp-burst">
              <Sparkles size={12} /> +{sessionXp} XP
            </span>
          )}
          <span className="sql-solved-pill">
            Correct: {correctCount}/{answeredCount || 0}
          </span>
          <button type="button" onClick={() => setQuizActive(false)} className="sql-mini-btn">
            Exit Quiz
          </button>
        </div>
      </div>

      <h3 className="sql-question-heading">
        Q{currentQ.question_number}. {currentQ.question}
      </h3>

      <div className="sql-mcq-options-grid">
        {Object.entries(currentQ.options || {})
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, val]) => {
            const picked = userChoice?.toUpperCase() === k.toUpperCase();
            const isRight = correctChoice === k.toUpperCase();
            let cls = '';
            if (userChoice) {
              cls = isRight ? 'sql-opt-correct' : picked ? 'sql-opt-wrong' : 'sql-opt-dimmed';
            }
            return (
              <button
                key={k}
                type="button"
                onClick={() => handleChoose(k)}
                className={`sql-mcq-option-btn ${cls}`}
              >
                <span className="sql-opt-letter">{k}</span>
                <span className="sql-opt-text">{val}</span>
                {userChoice && isRight && <CheckCircle2 size={18} className="sql-opt-status-icon text-emerald-400" />}
                {userChoice && picked && !isRight && <XCircle size={18} className="sql-opt-status-icon text-rose-400" />}
              </button>
            );
          })}
      </div>

      {userChoice && currentQ.explanation_points && currentQ.explanation_points.length > 0 && (
        <div
          className={`sql-explanation-box ${
            userChoice.toUpperCase() === correctChoice ? 'correct' : 'wrong'
          }`}
        >
          <ul className="sql-exp-list" style={{ margin: 0 }}>
            {currentQ.explanation_points.map((pt, i) => (
              <li key={i}>{pt}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="sql-quiz-nav-row">
        <button
          type="button"
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          className="sql-btn sql-btn-secondary"
        >
          Previous
        </button>

        {currentIdx < totalQ - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentIdx((i) => Math.min(totalQ - 1, i + 1))}
            className="sql-btn sql-btn-primary"
          >
            Next Question <ArrowRight size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setFinished(true)}
            className="sql-btn sql-btn-emerald"
          >
            Finish &amp; View Score
          </button>
        )}
      </div>
    </div>
  );
}

