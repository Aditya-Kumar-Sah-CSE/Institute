'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Lightbulb,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react';
import type {
  AptitudeCategory,
  AptitudeChapter,
  AptitudeQuestion,
  AptitudeProgress,
} from '@/features/code-arena/data/aptitudeSheetTypes';

interface ChaptersHandbookProps {
  chapters: AptitudeChapter[];
  questions: AptitudeQuestion[];
  progressMap: Record<number, AptitudeProgress>;
  onPracticeChapter: (chapterNum: number, levelFilter?: 'ALL' | 'EASY' | 'MEDIUM' | 'HARD') => void;
}

export function AptitudeChaptersHandbookView({
  chapters,
  questions,
  progressMap,
  onPracticeChapter,
}: ChaptersHandbookProps) {
  const [catFilter, setCatFilter] = useState<'ALL' | AptitudeCategory>('ALL');
  const [search, setSearch] = useState('');

  const chapterProgress = useMemo(() => {
    const map: Record<number, { solved: number; total: number }> = {};
    for (const q of questions) {
      if (!map[q.chapter_number]) map[q.chapter_number] = { solved: 0, total: 0 };
      map[q.chapter_number].total++;
      if (progressMap[q.question_number]?.is_solved) {
        map[q.chapter_number].solved++;
      }
    }
    return map;
  }, [questions, progressMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chapters.filter((ch) => {
      if (catFilter !== 'ALL' && ch.category !== catFilter) return false;
      if (!q) return true;
      return (
        ch.title.toLowerCase().includes(q) ||
        ch.category.toLowerCase().includes(q) ||
        ch.theory.some((t) => t.toLowerCase().includes(q)) ||
        ch.short_tricks.some((t) => t.toLowerCase().includes(q)) ||
        ch.solved_example.toLowerCase().includes(q)
      );
    });
  }, [chapters, catFilter, search]);

  const categories: Array<'ALL' | AptitudeCategory> = [
    'ALL',
    'Quantitative Aptitude',
    'Logical Reasoning',
    'Verbal Ability',
  ];

  return (
    <div className="sql-reference-container">
      <div className="sql-ref-card">
        <div className="sql-cheat-header-bar">
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <BookOpen size={18} style={{ color: 'var(--neon-cyan, #06b6d4)' }} />
              29 Chapters — Theory, Formulas, Short Tricks &amp; Solved Examples
            </h3>
            <p className="sql-ref-desc" style={{ marginTop: '6px', marginBottom: 0 }}>
              Pehle har chapter ki theory aur solved example dekho, phir Basic → Medium → Advance levels practice karo.
            </p>
          </div>
          <div className="sql-cheat-search-box">
            <Search size={15} style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search formula, trick, chapter..."
            />
          </div>
        </div>

        <div className="sql-pill-group" style={{ marginTop: '14px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCatFilter(cat)}
              className={`sql-filter-pill ${catFilter === cat ? 'active' : ''}`}
            >
              {cat === 'ALL'
                ? `All Chapters (${chapters.length})`
                : `${cat} (${chapters.filter((c) => c.category === cat).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="apt-chapters-grid">
        {filtered.map((ch) => {
          const stat = chapterProgress[ch.chapter_number] || { solved: 0, total: ch.question_count };
          const pct = stat.total > 0 ? Math.round((stat.solved / stat.total) * 100) : 0;
          return (
            <div key={ch.chapter_number} className="sql-ref-card apt-chapter-card">
              <div className="apt-chapter-head">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="sql-qnum-badge">Chapter {ch.chapter_number}</span>
                    <span className="sql-section-pill">{ch.category}</span>
                    <span className="sql-section-pill">
                      Q{ch.start_q}–Q{ch.end_q}
                    </span>
                  </div>
                  <h4 className="apt-chapter-title">{ch.title}</h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: pct === 100 ? '#10b981' : '#0284c7' }}>
                    {stat.solved} / {stat.total} Solved
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pct}% complete</div>
                </div>
              </div>

              {ch.theory.length > 0 && (
                <div>
                  <div className="sql-exp-subtitle">
                    <BookOpen size={13} style={{ color: '#0284c7' }} /> Theory &amp; Formulas
                  </div>
                  <ul className="sql-concepts-list">
                    {ch.theory.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {ch.short_tricks.length > 0 && (
                <div>
                  <div className="sql-exp-subtitle">
                    <Zap size={13} style={{ color: '#f59e0b' }} /> Short Tricks
                  </div>
                  <ul className="sql-concepts-list">
                    {ch.short_tricks.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {ch.solved_example && (
                <div className="apt-example-callout">
                  <div className="sql-exp-subtitle" style={{ marginBottom: '4px' }}>
                    <Lightbulb size={13} style={{ color: '#10b981' }} /> Solved Example
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>{ch.solved_example}</p>
                </div>
              )}

              <div className="apt-chapter-actions">
                <button
                  type="button"
                  onClick={() => onPracticeChapter(ch.chapter_number, 'ALL')}
                  className="sql-btn sql-btn-primary"
                >
                  <Play size={13} fill="currentColor" /> Practice Chapter ({ch.question_count} Qs)
                </button>
                <button
                  type="button"
                  onClick={() => onPracticeChapter(ch.chapter_number, 'EASY')}
                  className="sql-mini-btn"
                >
                  Basic
                </button>
                <button
                  type="button"
                  onClick={() => onPracticeChapter(ch.chapter_number, 'MEDIUM')}
                  className="sql-mini-btn"
                >
                  Medium
                </button>
                <button
                  type="button"
                  onClick={() => onPracticeChapter(ch.chapter_number, 'HARD')}
                  className="sql-mini-btn"
                >
                  Advance
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AptitudeMockTestProps {
  chapters: AptitudeChapter[];
  questions: AptitudeQuestion[];
  progressMap: Record<number, AptitudeProgress>;
  isPublicPreview?: boolean;
  onSubmitMcq: (payload: {
    questionNumber: number;
    isSolved: boolean;
    selectedOption: string;
  }) => Promise<{ xpAwarded?: number } | void>;
}

export function AptitudeMockTestView({
  chapters,
  questions,
  progressMap,
  isPublicPreview = false,
  onSubmitMcq,
}: AptitudeMockTestProps) {
  const [scope, setScope] = useState<string>('PLACEMENT_MIX');
  const [deckSize, setDeckSize] = useState<number>(20);
  const [onlyUnsolved, setOnlyUnsolved] = useState<boolean>(false);
  const [enableTimer, setEnableTimer] = useState<boolean>(true);

  const [quizActive, setQuizActive] = useState<boolean>(false);
  const [quizDeck, setQuizDeck] = useState<AptitudeQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [sessionXp, setSessionXp] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [finished, setFinished] = useState<boolean>(false);

  useEffect(() => {
    if (!quizActive || finished || !enableTimer) return;
    if (secondsLeft <= 0) {
      setFinished(true);
      return;
    }
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [quizActive, finished, enableTimer, secondsLeft]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startMock = () => {
    let pool = [...questions];
    if (onlyUnsolved) {
      pool = pool.filter((q) => !progressMap[q.question_number]?.is_solved);
    }
    if (scope.startsWith('CAT:')) {
      const cat = scope.slice(4);
      pool = pool.filter((q) => q.category === cat);
    } else if (scope.startsWith('CH:')) {
      const chNum = Number(scope.slice(3));
      pool = pool.filter((q) => q.chapter_number === chNum);
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, deckSize);
    setQuizDeck(shuffled);
    setCurrentIdx(0);
    setAnswers({});
    setSessionXp(0);
    setSecondsLeft(shuffled.length * 60);
    setFinished(false);
    setQuizActive(true);
  };

  if (!quizActive) {
    return (
      <div className="sql-reference-container">
        <div className="sql-ref-card">
          <div className="sql-ref-header">
            <Trophy size={18} style={{ color: '#f59e0b' }} />
            <h3>Placement Timed Mock Test (1 Minute / Question)</h3>
          </div>
          <p className="sql-ref-desc">
            As advised in the Placement Aptitude Practice Book: <em>&ldquo;Doosri baar 1 minute per question ka target rakho.&rdquo;</em> Pick a full placement mix (Quant + Logical + Verbal) or drill any single chapter. Every solved question automatically saves to your sheet progress &amp; XP.
          </p>

          <div className="sql-quiz-setup-grid">
            <div className="sql-quiz-field">
              <label>Test Scope / Chapter</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="sql-select"
              >
                <option value="PLACEMENT_MIX">Full Placement Mix (All 29 Chapters)</option>
                <optgroup label="By Section">
                  <option value="CAT:Quantitative Aptitude">Quantitative Aptitude Only (19 Chapters)</option>
                  <option value="CAT:Logical Reasoning">Logical Reasoning Only (7 Chapters)</option>
                  <option value="CAT:Verbal Ability">Verbal Ability Only (3 Chapters)</option>
                </optgroup>
                <optgroup label="By Chapter">
                  {chapters.map((ch) => (
                    <option key={ch.chapter_number} value={`CH:${ch.chapter_number}`}>
                      Ch {ch.chapter_number}: {ch.title} ({ch.question_count} Qs)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="sql-quiz-field">
              <label>Questions &amp; Target Time</label>
              <select
                value={deckSize}
                onChange={(e) => setDeckSize(Number(e.target.value))}
                className="sql-select"
              >
                <option value={10}>10 Questions (10 mins)</option>
                <option value={20}>20 Questions (20 mins)</option>
                <option value={30}>30 Questions (30 mins)</option>
                <option value={50}>50 Questions Full Test (50 mins)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '14px' }}>
            <label className="sql-checkbox-row">
              <input
                type="checkbox"
                checked={onlyUnsolved}
                onChange={(e) => setOnlyUnsolved(e.target.checked)}
              />
              <span>Only include Unsolved Questions</span>
            </label>

            <label className="sql-checkbox-row">
              <input
                type="checkbox"
                checked={enableTimer}
                onChange={(e) => setEnableTimer(e.target.checked)}
              />
              <span>Enable 1 min / question Countdown Timer</span>
            </label>
          </div>

          <button type="button" onClick={startMock} className="sql-btn sql-btn-primary" style={{ marginTop: '18px' }}>
            <Play size={15} fill="currentColor" /> Start Timed Mock Test
          </button>
        </div>
      </div>
    );
  }

  if (quizDeck.length === 0) {
    return (
      <div className="sql-ref-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          No matching questions found in this filter (all may already be solved!).
        </p>
        <button type="button" onClick={() => setQuizActive(false)} className="sql-btn sql-btn-secondary">
          <RotateCcw size={15} /> Back to Setup
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
      <div className="sql-reference-container">
        <div className="sql-ref-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <Trophy size={42} style={{ color: '#f59e0b', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: '0 0 8px' }}>
            Mock Test Complete!
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Score: <strong className="sql-color-correct">{correctCount} / {totalQ}</strong> ({pct}% accuracy)
            {' · '}Attempted: <strong>{answeredCount} / {totalQ}</strong>
            {sessionXp > 0 && (
              <>
                {' · '}
                <strong className="sql-color-bookmark">+{sessionXp} XP Earned</strong>
              </>
            )}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button type="button" onClick={startMock} className="sql-btn sql-btn-primary">
              <RotateCcw size={15} /> Retake Similar Set
            </button>
            <button type="button" onClick={() => setQuizActive(false)} className="sql-btn sql-btn-secondary">
              Change Settings
            </button>
          </div>
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
          <span className="sql-section-pill">{currentQ.category}</span>
          <span className="sql-section-pill">
            Ch {currentQ.chapter_number}: {currentQ.chapter_title}
          </span>
        </div>
        <div className="sql-card-actions-right">
          {enableTimer && (
            <span className="sql-xp-burst" style={{ color: secondsLeft < 60 ? '#ef4444' : '#0284c7' }}>
              <Clock size={12} /> {formatTimer(secondsLeft)}
            </span>
          )}
          {sessionXp > 0 && (
            <span className="sql-xp-burst">
              <Sparkles size={12} /> +{sessionXp} XP
            </span>
          )}
          <span className="sql-solved-pill">
            Score: {correctCount}/{answeredCount || 0}
          </span>
          <button type="button" onClick={() => setFinished(true)} className="sql-mini-btn">
            Finish Early
          </button>
        </div>
      </div>

      <div className="sql-question-heading" style={{ whiteSpace: 'pre-line' }}>
        Q{currentQ.question_number}. {currentQ.question}
      </div>

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

      {userChoice && currentQ.explanation && (
        <div
          className={`sql-explanation-box ${
            userChoice.toUpperCase() === correctChoice ? 'correct' : 'wrong'
          }`}
        >
          <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55, color: 'var(--text-primary)' }}>
            {currentQ.explanation}
          </p>
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

