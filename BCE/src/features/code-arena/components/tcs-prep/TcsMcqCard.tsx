'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Pencil,
  RotateCcw,
  XCircle,
  Zap,
} from 'lucide-react';
import type {
  TcsChapter,
  TcsPrepQuestion,
  TcsProgress,
} from '@/features/code-arena/data/tcsPrepTypes';
import FocusTimer from '@/features/code-arena/components/FocusTimer';

interface TcsMcqCardProps {
  question: TcsPrepQuestion;
  chapter?: TcsChapter;
  progress?: TcsProgress;
  isPublicPreview?: boolean;
  canEdit?: boolean;
  onEditQuestion?: () => void;
  onSubmitAnswer: (payload: {
    itemKey: string;
    itemType: 'MCQ';
    isSolved: boolean;
    selectedOption: string;
  }) => Promise<{ xpAwarded?: number } | void>;
  onToggleBookmark: (itemKey: string, itemType: 'MCQ', nextState: boolean) => Promise<void>;
}

export default function TcsMcqCard({
  question,
  chapter,
  progress,
  isPublicPreview = false,
  canEdit = false,
  onEditQuestion,
  onSubmitAnswer,
  onToggleBookmark,
}: TcsMcqCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(progress?.selected_option || null);
  const [hasChecked, setHasChecked] = useState<boolean>(Boolean(progress?.selected_option || progress?.is_solved));
  const [showChapterNotes, setShowChapterNotes] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [recentXp, setRecentXp] = useState<number>(0);
  const [retryNonce, setRetryNonce] = useState<number>(0);

  const itemKey = `MCQ-${question.question_number}`;

  useEffect(() => {
    setRecentXp(0);
    setShowChapterNotes(false);
    setRetryNonce(0);
  }, [question.question_number]);

  useEffect(() => {
    setSelectedOption(progress?.selected_option || (progress?.is_solved ? question.correct_option || null : null));
    setHasChecked(Boolean(progress?.selected_option || progress?.is_solved));
  }, [question.question_number, progress?.selected_option, progress?.is_solved, question.correct_option]);

  const options = question.options || {};
  const optionKeys = Object.keys(options).sort();
  const correctOpt = (question.correct_option || '').toUpperCase();
  const isCorrect = Boolean(selectedOption && selectedOption.toUpperCase() === correctOpt);
  const isSolved = Boolean(progress?.is_solved);
  const isBookmarked = Boolean(progress?.is_bookmarked);
  const potentialXp = question.difficulty === 'HARD' ? 8 : question.difficulty === 'MEDIUM' ? 5 : 3;

  const handleSelectOption = async (optKey: string) => {
    if (saving) return;
    setSelectedOption(optKey);
    setHasChecked(true);
    if (isPublicPreview) return;

    const answeredCorrectly = optKey.toUpperCase() === correctOpt;
    setSaving(true);
    try {
      const res = await onSubmitAnswer({
        itemKey,
        itemType: 'MCQ',
        isSolved: answeredCorrectly,
        selectedOption: optKey,
      });
      if (res && res.xpAwarded && res.xpAwarded > 0) {
        setRecentXp(res.xpAwarded);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedOption(null);
    setHasChecked(false);
    setRecentXp(0);
    setRetryNonce((n) => n + 1);
  };

  const diffClass =
    question.difficulty === 'HARD'
      ? 'difficulty-HARD'
      : question.difficulty === 'MEDIUM'
      ? 'difficulty-MEDIUM'
      : 'difficulty-EASY';

  return (
    <div className="sql-workbench-card">
      <div className="sql-card-header-row">
        <div className="sql-card-badges">
          <span className="sql-qnum-badge">Q{question.question_number}</span>
          <span className="sql-type-pill sql-type-mcq">
            Ch {question.chapter_number} · Q{question.chapter_question_number}
          </span>
          <span className={`difficulty-badge-styled ${diffClass}`}>
            {question.level_label || question.difficulty}
          </span>
          <span className="sql-section-pill">{question.category}</span>
          <span className="sql-section-pill">{question.chapter_title}</span>
        </div>

        <div className="sql-card-actions-right">
          <FocusTimer resetKey={`${question.question_number}-${retryNonce}`} />
          {recentXp > 0 || (isSolved && (progress?.xp_awarded || 0) > 0) ? (
            <span className="sql-xp-burst">
              <Zap size={12} /> +{recentXp > 0 ? recentXp : progress?.xp_awarded} XP
            </span>
          ) : (
            <span className="sql-section-pill" style={{ color: '#059669' }}>
              +{potentialXp} XP
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
              onClick={() => onToggleBookmark(itemKey, 'MCQ', !isBookmarked)}
              className={`sql-icon-toggle ${isBookmarked ? 'active' : ''}`}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark for 3-Day Revision'}
            >
              <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
          )}
          {canEdit && onEditQuestion && (
            <button
              type="button"
              onClick={onEditQuestion}
              className="sql-icon-toggle"
              title="Edit Question"
            >
              <Pencil size={15} />
            </button>
          )}
        </div>
      </div>

      {chapter && (
        <div className="sql-concepts-accordion" style={{ marginTop: 0 }}>
          <button
            type="button"
            onClick={() => setShowChapterNotes((prev) => !prev)}
            className="sql-concepts-toggle"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={15} style={{ color: 'var(--neon-cyan, #06b6d4)' }} />
              Ch {chapter.chapter_number}: {chapter.title} — Theory, Short Tricks &amp; Solved Example
            </span>
            {showChapterNotes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showChapterNotes && (
            <div className="apt-chapter-inline-notes">
              {chapter.theory && chapter.theory.length > 0 && (
                <div>
                  <div className="sql-exp-subtitle">
                    <BookOpen size={13} style={{ color: '#0284c7' }} /> Theory / Concept
                  </div>
                  <ul className="sql-concepts-list">
                    {chapter.theory.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {chapter.short_tricks && chapter.short_tricks.length > 0 && (
                <div>
                  <div className="sql-exp-subtitle">
                    <Zap size={13} style={{ color: '#f59e0b' }} /> Short Tricks
                  </div>
                  <ul className="sql-concepts-list">
                    {chapter.short_tricks.map((st, idx) => (
                      <li key={idx}>{st}</li>
                    ))}
                  </ul>
                </div>
              )}

              {chapter.solved_example && (
                <div className="apt-example-callout">
                  <div className="sql-exp-subtitle" style={{ marginBottom: '4px' }}>
                    <Lightbulb size={13} style={{ color: '#10b981' }} /> Solved Example
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>{chapter.solved_example}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="sql-question-heading" style={{ whiteSpace: 'pre-line' }}>
        {question.question}
      </div>

      {question.image_url && (
        <div className="tcs-diagram-frame">
          <img
            src={question.image_url}
            alt={`Diagram for Question ${question.question_number}`}
          />
          <span style={{ fontSize: '11.5px', color: '#475569', textAlign: 'center', fontWeight: 600 }}>
            Inspect Question figure on the left and pick matching option (A), (B), (C), or (D) below.
          </span>
        </div>
      )}

      <div className="sql-mcq-options-grid">
        {optionKeys.map((key) => {
          const text = options[key];
          const isThisSelected = selectedOption?.toUpperCase() === key.toUpperCase();
          const isThisCorrect = correctOpt === key.toUpperCase();

          let stateClass = '';
          if (hasChecked) {
            if (isThisCorrect) stateClass = 'sql-opt-correct';
            else if (isThisSelected && !isThisCorrect) stateClass = 'sql-opt-wrong';
            else stateClass = 'sql-opt-dimmed';
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectOption(key)}
              className={`sql-mcq-option-btn ${stateClass}`}
            >
              <span className="sql-opt-letter">{key}</span>
              <span className="sql-opt-text">{text}</span>
              {hasChecked && isThisCorrect && <CheckCircle2 size={18} className="sql-opt-status-icon text-emerald-400" />}
              {hasChecked && isThisSelected && !isThisCorrect && <XCircle size={18} className="sql-opt-status-icon text-rose-400" />}
            </button>
          );
        })}
      </div>

      {hasChecked && (
        <div className={`sql-explanation-box ${isCorrect ? 'correct' : 'wrong'}`}>
          <div className="sql-explanation-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
              {isCorrect ? (
                <>
                  <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                  <span style={{ color: '#059669' }}>
                    Correct Answer! ({correctOpt}) {question.correct_answer ? `— ${question.correct_answer}` : ''}
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle size={20} style={{ color: '#f43f5e' }} />
                  <span style={{ color: '#e11d48' }}>
                    Incorrect — Correct Option is ({correctOpt}){question.correct_answer ? `: ${question.correct_answer}` : ''}
                  </span>
                </>
              )}
            </div>

            <button type="button" onClick={handleReset} className="sql-mini-btn">
              <RotateCcw size={13} /> Try Again
            </button>
          </div>

          <div className="sql-exp-section">
            <div className="sql-exp-subtitle">
              <Lightbulb size={14} style={{ color: '#06b6d4' }} /> Solution &amp; Concept
            </div>
            <p className="sql-exp-paragraph">
              {question.explanation || `Option (${correctOpt}) ${question.correct_answer} is correct.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

