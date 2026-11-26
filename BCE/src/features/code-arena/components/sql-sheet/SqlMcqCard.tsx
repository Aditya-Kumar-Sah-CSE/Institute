'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  BookOpen,
  Lightbulb,
  RotateCcw,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import type { SqlSheetQuestion, SqlQuestionProgress } from '@/features/code-arena/data/sqlSheetReference';
import FocusTimer from '@/features/code-arena/components/FocusTimer';

interface SqlMcqCardProps {
  question: SqlSheetQuestion;
  progress?: SqlQuestionProgress;
  isPublicPreview?: boolean;
  onSubmitAnswer: (payload: {
    questionNumber: number;
    questionType: 'MCQ';
    isSolved: boolean;
    selectedOption: string;
  }) => Promise<{ xpAwarded?: number } | void>;
  onToggleBookmark: (questionNumber: number, questionType: 'MCQ', nextState: boolean) => Promise<void>;
}

export default function SqlMcqCard({
  question,
  progress,
  isPublicPreview = false,
  onSubmitAnswer,
  onToggleBookmark,
}: SqlMcqCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(progress?.selected_option || null);
  const [hasChecked, setHasChecked] = useState<boolean>(Boolean(progress?.selected_option || progress?.is_solved));
  const [showConcepts, setShowConcepts] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [recentXp, setRecentXp] = useState<number>(0);
  const [retryNonce, setRetryNonce] = useState<number>(0);

  useEffect(() => {
    setRecentXp(0);
    setShowConcepts(false);
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

  const handleSelectOption = async (optKey: string) => {
    if (saving) return;
    setSelectedOption(optKey);
    setHasChecked(true);

    if (isPublicPreview) return;

    const answeredCorrectly = optKey.toUpperCase() === correctOpt;
    setSaving(true);
    try {
      const res = await onSubmitAnswer({
        questionNumber: question.question_number,
        questionType: 'MCQ',
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
      {/* Header Meta Row */}
      <div className="sql-card-header-row">
        <div className="sql-card-badges">
          <span className="sql-qnum-badge">Q{question.question_number}</span>
          <span className="sql-type-pill sql-type-mcq">MCQ</span>
          <span className={`difficulty-badge-styled ${diffClass}`}>{question.difficulty}</span>
          <span className="sql-section-pill">{question.section}</span>
        </div>

        <div className="sql-card-actions-right">
          <FocusTimer resetKey={`${question.question_number}-${retryNonce}`} />
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
              onClick={() => onToggleBookmark(question.question_number, 'MCQ', !isBookmarked)}
              className={`sql-icon-toggle ${isBookmarked ? 'active' : ''}`}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Question'}
            >
              <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </div>

      {/* Question Prompt */}
      <h2 className="sql-question-heading">{question.question}</h2>

      {/* Interactive A/B/C/D Options */}
      <div className="sql-mcq-options-grid">
        {optionKeys.map((key) => {
          const text = options[key];
          const isThisSelected = selectedOption?.toUpperCase() === key.toUpperCase();
          const isThisCorrect = correctOpt === key.toUpperCase();

          let stateClass = '';
          if (hasChecked) {
            if (isThisCorrect) {
              stateClass = 'sql-opt-correct';
            } else if (isThisSelected && !isThisCorrect) {
              stateClass = 'sql-opt-wrong';
            } else {
              stateClass = 'sql-opt-dimmed';
            }
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
              {hasChecked && isThisCorrect && (
                <CheckCircle2 size={18} className="sql-opt-status-icon text-emerald-400" />
              )}
              {hasChecked && isThisSelected && !isThisCorrect && (
                <XCircle size={18} className="sql-opt-status-icon text-rose-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Answer Verification & Detailed Explanation */}
      {hasChecked && (
        <div className={`sql-explanation-box ${isCorrect ? 'correct' : 'wrong'}`}>
          <div className="sql-explanation-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {isCorrect ? (
                <>
                  <CheckCircle2 size={18} className="sql-status-icon-correct" />
                  <strong className="sql-status-text-correct">Correct Answer!</strong>
                </>
              ) : (
                <>
                  <AlertCircle size={18} className="sql-status-icon-wrong" />
                  <strong className="sql-status-text-wrong">
                    Not quite — Correct Option is {correctOpt}) {question.correct_answer || options[correctOpt]}
                  </strong>
                </>
              )}
            </div>

            <button type="button" onClick={handleReset} className="sql-mini-btn">
              <RotateCcw size={13} /> Retry
            </button>
          </div>

          {/* Why it is correct */}
          {question.explanation_points && question.explanation_points.length > 0 && (
            <div className="sql-exp-section">
              <div className="sql-exp-subtitle">
                <Lightbulb size={14} style={{ color: '#f59e0b' }} /> Explanation
              </div>
              <ul className="sql-exp-list">
                {question.explanation_points.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Distractor / Incorrect Options Breakdown */}
          {question.incorrect_options && Object.keys(question.incorrect_options).length > 0 && (
            <div className="sql-exp-section">
              <div className="sql-exp-subtitle muted">
                Other Options Compared
              </div>
              <div className="sql-distractors-grid">
                {Object.entries(question.incorrect_options).map(([optKey, val]) => (
                  <div key={optKey} className="sql-distractor-item">
                    <span className="sql-distractor-key">{optKey})</span>
                    <span className="sql-distractor-val">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsible Basic Concepts */}
      {question.basic_concepts && question.basic_concepts.length > 0 && (
        <div className="sql-concepts-accordion">
          <button
            type="button"
            onClick={() => setShowConcepts((prev) => !prev)}
            className="sql-concepts-toggle"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={15} style={{ color: 'var(--neon-cyan, #06b6d4)' }} />
              Core Concepts Revision ({question.basic_concepts.length} key points)
            </span>
            {showConcepts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showConcepts && (
            <ul className="sql-concepts-list">
              {question.basic_concepts.map((concept, idx) => (
                <li key={idx}>{concept}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

