'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  EyeOff,
  FileText,
  Flame,
  Lock,
  Play,
  Shield,
  Sparkles,
  Target,
  Terminal,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  evaluateTcsMockSubmission,
  getTcsReadinessTier,
  scoreTextMatchRatio,
  type TcsMockAttempt,
  type TcsMockItem,
  type TcsMockPaperFull,
  type TcsMockPaperHeader,
  type TcsMockResponseEntry,
} from '@/features/code-arena/data/tcsPrepTypes';

interface Props {
  sheetId: string;
  mockHeaders: TcsMockPaperHeader[];
  attempts: TcsMockAttempt[];
  viewSection: 'mocks' | 'analysis';
  isPublicPreview?: boolean;
  onAttemptSaved: (attempt: TcsMockAttempt) => void;
  onPracticeChapter: (chapterNum: number) => void;
  onSwitchToAnalysis: () => void;
  onMockActiveChange?: (active: boolean) => void;
}

const DEFAULT_CPP = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    
    return 0;
}
`;

function formatMMSS(secs: number) {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export default function TcsMockExamAndAnalysisView({
  sheetId,
  mockHeaders,
  attempts,
  viewSection,
  isPublicPreview = false,
  onAttemptSaved,
  onPracticeChapter,
  onSwitchToAnalysis,
  onMockActiveChange,
}: Props) {
  // Paper cache so loading Paper N -> Deep Analysis works immediately without re-fetching
  const [paperCache, setPaperCache] = useState<Record<number, TcsMockPaperFull>>({});
  const [loadingPaperNum, setLoadingPaperNum] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string>('');

  // Active Mock Simulator State
  const [activePaper, setActivePaper] = useState<TcsMockPaperFull | null>(null);
  const [examMode, setExamMode] = useState<'EXAM' | 'PRACTICE'>('EXAM');
  const [sectionIdx, setSectionIdx] = useState<number>(0);
  const [lockedSectionIdx, setLockedSectionIdx] = useState<number>(0);
  const [currentQNum, setCurrentQNum] = useState<number>(1);
  const [responses, setResponses] = useState<Record<number, TcsMockResponseEntry>>({});
  const [sectionLeftSec, setSectionLeftSec] = useState<number>(1500);
  const [sectionTimesSec, setSectionTimesSec] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Embedded Passage Recall timer inside Section 4 (Verbal Q75..Q78)
  const [prState, setPrState] = useState<Record<number, { phase: 'idle' | 'reading' | 'writing'; sec: number }>>({});

  // Embedded Coding Runner state for Q80 / Q81
  const [codingRunning, setCodingRunning] = useState<boolean>(false);
  const [codingRunMsg, setCodingRunMsg] = useState<Record<number, { ok: boolean; text: string }>>({});

  // Deep Analysis View State
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(attempts[0]?.id || null);
  const [auditFilter, setAuditFilter] = useState<'ALL' | 'WRONG' | 'UNATTEMPTED' | 'SLOW' | 'CORRECT' | 'SPECIAL'>('ALL');
  const [ephemeralAttempt, setEphemeralAttempt] = useState<TcsMockAttempt | null>(null);

  const allAttempts = useMemo(() => {
    if (!ephemeralAttempt) return attempts;
    if (attempts.some((a) => a.id === ephemeralAttempt.id)) return attempts;
    return [ephemeralAttempt, ...attempts];
  }, [attempts, ephemeralAttempt]);

  const activeAttempt = useMemo(
    () => allAttempts.find((a) => a.id === selectedAttemptId) || allAttempts[0] || null,
    [allAttempts, selectedAttemptId]
  );

  // Fetch paper full JSON on demand
  const loadFullPaper = async (paperNum: number): Promise<TcsMockPaperFull | null> => {
    if (paperCache[paperNum]) return paperCache[paperNum];
    setLoadingPaperNum(paperNum);
    setLoadError('');
    try {
      const res = await fetch(`/api/coding/sheets/${sheetId}/tcs-mocks?paper=${paperNum}`);
      const json = await res.json();
      if (!json.success || !json.paper) {
        setLoadError(json.error?.message || `Failed to load Mock Paper ${paperNum}`);
        return null;
      }
      setPaperCache((prev) => ({ ...prev, [paperNum]: json.paper }));
      return json.paper as TcsMockPaperFull;
    } catch (err: any) {
      setLoadError(err?.message || 'Network error loading mock paper');
      return null;
    } finally {
      setLoadingPaperNum(null);
    }
  };

  // Auto-load inspected paper in Analysis tab so Q-by-Q review has full stems/solutions
  useEffect(() => {
    if (viewSection === 'analysis' && activeAttempt && !paperCache[activeAttempt.paper_number]) {
      loadFullPaper(activeAttempt.paper_number);
    }
  }, [viewSection, activeAttempt?.paper_number]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onMockActiveChange?.(Boolean(activePaper));
    return () => onMockActiveChange?.(false);
  }, [activePaper, onMockActiveChange]);

  const startMock = async (paperNum: number, mode: 'EXAM' | 'PRACTICE') => {
    const paper = await loadFullPaper(paperNum);
    if (!paper) return;
    setActivePaper(paper);
    setExamMode(mode);
    setSectionIdx(0);
    setLockedSectionIdx(0);
    setCurrentQNum(paper.sections[0]?.q_range[0] || 1);
    setResponses({});
    setSectionTimesSec({});
    setSectionLeftSec((paper.sections[0]?.minutes || 25) * 60);
    setPrState({});
    setCodingRunMsg({});
  };

  const handleSubmitMock = async () => {
    if (!activePaper || submitting) return;
    setSubmitting(true);
    try {
      if (isPublicPreview) {
        const evalRes = evaluateTcsMockSubmission(activePaper, responses, sectionTimesSec);
        const localAttempt: TcsMockAttempt = {
          id: `preview-${Date.now()}`,
          paper_number: activePaper.paper_number,
          mode: examMode,
          total_score: evalRes.totalScore,
          max_score: evalRes.maxScore,
          mcq_correct: evalRes.mcqCorrect,
          mcq_wrong: evalRes.mcqWrong,
          mcq_unattempted: evalRes.mcqUnattempted,
          writing_score: evalRes.writingScore,
          coding_solved: evalRes.codingSolved,
          accuracy_pct: evalRes.accuracyPct,
          total_time_sec: evalRes.totalTimeSec,
          section_stats: evalRes.sectionStats,
          topic_stats: evalRes.topicStats,
          responses,
          xp_awarded: 0,
          completed_at: new Date().toISOString(),
        };
        setEphemeralAttempt(localAttempt);
        setSelectedAttemptId(localAttempt.id);
        setActivePaper(null);
        onSwitchToAnalysis();
        return;
      }

      const res = await fetch(`/api/coding/sheets/${sheetId}/tcs-mocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperNumber: activePaper.paper_number,
          mode: examMode,
          responses,
          sectionTimesSec,
        }),
      });
      const json = await res.json();
      if (json.success && json.attempt) {
        onAttemptSaved(json.attempt);
        setSelectedAttemptId(json.attempt.id);
        setActivePaper(null);
        onSwitchToAnalysis();
      } else {
        setLoadError(json.error?.message || 'Failed to submit mock');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Master 1s Exam Clock: updates section countdown, section elapsed, and active item timeSpentSec
  useEffect(() => {
    if (!activePaper) return;
    const sec = activePaper.sections[sectionIdx];
    if (!sec) return;

    const id = window.setInterval(() => {
      setSectionTimesSec((prev) => ({
        ...prev,
        [sec.key]: (prev[sec.key] || 0) + 1,
      }));

      setResponses((prev) => {
        const cur = prev[currentQNum] || {};
        return {
          ...prev,
          [currentQNum]: { ...cur, timeSpentSec: (cur.timeSpentSec || 0) + 1 },
        };
      });

      // Passage recall per-item countdown if reading or writing
      setPrState((prev) => {
        const curPr = prev[currentQNum];
        if (!curPr || (curPr.phase !== 'reading' && curPr.phase !== 'writing')) return prev;
        if (curPr.sec <= 1) {
          if (curPr.phase === 'reading') {
            return { ...prev, [currentQNum]: { phase: 'writing', sec: 90 } };
          }
          return { ...prev, [currentQNum]: { phase: 'writing', sec: 0 } };
        }
        return { ...prev, [currentQNum]: { ...curPr, sec: curPr.sec - 1 } };
      });

      setSectionLeftSec((prev) => {
        if (prev <= 1) {
          if (examMode === 'EXAM') {
            if (sectionIdx + 1 < activePaper.sections.length) {
              const nextSec = activePaper.sections[sectionIdx + 1];
              setSectionIdx(sectionIdx + 1);
              setLockedSectionIdx(sectionIdx + 1);
              setCurrentQNum(nextSec.q_range[0]);
              return nextSec.minutes * 60;
            }
            handleSubmitMock();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [activePaper, sectionIdx, currentQNum, examMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const advanceToSection = (nextIdx: number) => {
    if (!activePaper || !activePaper.sections[nextIdx]) return;
    const targetSec = activePaper.sections[nextIdx];
    if (examMode === 'EXAM' && nextIdx < lockedSectionIdx) return;
    setSectionIdx(nextIdx);
    if (examMode === 'EXAM' && nextIdx > lockedSectionIdx) {
      setLockedSectionIdx(nextIdx);
    }
    setCurrentQNum(targetSec.q_range[0]);
    setSectionLeftSec(targetSec.minutes * 60);
  };

  // Cross-mock aggregate analytics across all attempted papers
  const crossMockSummary = useMemo(() => {
    if (allAttempts.length === 0) return null;
    const bestAttempt = [...allAttempts].sort((a, b) => b.total_score - a.total_score)[0];
    const avgScore = Number(
      (allAttempts.reduce((s, a) => s + Number(a.total_score || 0), 0) / allAttempts.length).toFixed(1)
    );
    const avgAcc = Number(
      (allAttempts.reduce((s, a) => s + Number(a.accuracy_pct || 0), 0) / allAttempts.length).toFixed(1)
    );
    const uniquePapers = new Set(allAttempts.map((a) => a.paper_number)).size;

    const topicAgg = new Map<
      string,
      { topic: string; chapterNumber: number; correct: number; wrong: number; unattempted: number; total: number }
    >();
    allAttempts.forEach((a) => {
      (a.topic_stats || []).forEach((t) => {
        if (!topicAgg.has(t.topic)) {
          topicAgg.set(t.topic, {
            topic: t.topic,
            chapterNumber: t.chapterNumber,
            correct: 0,
            wrong: 0,
            unattempted: 0,
            total: 0,
          });
        }
        const ref = topicAgg.get(t.topic)!;
        ref.correct += t.correct;
        ref.wrong += t.wrong;
        ref.unattempted += t.unattempted;
        ref.total += t.total;
      });
    });

    const weakTopics = Array.from(topicAgg.values())
      .map((t) => ({
        ...t,
        accuracyPct: t.correct + t.wrong > 0 ? Math.round((t.correct / (t.correct + t.wrong)) * 100) : 0,
      }))
      .filter((t) => t.correct + t.wrong > 0)
      .sort((a, b) => a.accuracyPct - b.accuracyPct || b.wrong - a.wrong)
      .slice(0, 6);

    return { bestAttempt, avgScore, avgAcc, uniquePapers, weakTopics };
  }, [allAttempts]);

  // =========================================================================
  // ACTIVE EXAM / PRACTICE SIMULATOR VIEW
  // =========================================================================
  if (activePaper) {
    const activeSec = activePaper.sections[sectionIdx];
    const secItems = activePaper.items.filter(
      (it) => it.question_number >= activeSec.q_range[0] && it.question_number <= activeSec.q_range[1]
    );
    const activeItem: TcsMockItem =
      activePaper.items.find((it) => it.question_number === currentQNum) || secItems[0];
    const curResp = responses[activeItem.question_number] || {};
    const secPosIdx = secItems.findIndex((x) => x.question_number === activeItem.question_number);

    const runMockCodingSample = async () => {
      if (codingRunning || activeItem.item_type !== 'CODING') return;
      setCodingRunning(true);
      const code = curResp.codeResponse || DEFAULT_CPP;
      const lang = curResp.language || 'cpp17';
      try {
        const res = await fetch('/api/coding/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            language: lang,
            stdin: activeItem.sample_input || '',
            raw: true,
          }),
        });
        const json = await res.json();
        const got = String(json.stdout || '').trim().replace(/\s+/g, ' ');
        const exp = String(activeItem.sample_output || '').trim().replace(/\s+/g, ' ');
        const passed = json.status === 'SUCCESS' && got === exp;
        setResponses((prev) => ({
          ...prev,
          [activeItem.question_number]: {
            ...prev[activeItem.question_number],
            codeResponse: code,
            language: lang,
            codingPassed: passed,
          },
        }));
        setCodingRunMsg((prev) => ({
          ...prev,
          [activeItem.question_number]: {
            ok: passed,
            text: passed
              ? `Sample Output Matched (${json.executionTimeMs || 1}ms)!`
              : `${json.status}: ${json.compileStderr || json.stderr || `Expected "${exp}", got "${got}"`}`,
          },
        }));
      } catch (err: any) {
        setCodingRunMsg((prev) => ({
          ...prev,
          [activeItem.question_number]: { ok: false, text: err?.message || 'Execution error' },
        }));
      } finally {
        setCodingRunning(false);
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Exam Top HUD */}
        <div className="tcs-mock-exam-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                if (confirm('Exit this mock session without submitting?')) setActivePaper(null);
              }}
              className="sql-btn sql-btn-secondary"
            >
              <ArrowLeft size={14} /> Exit Mock
            </button>
            <strong style={{ fontSize: '15px' }}>{activePaper.title}</strong>
            <span className="sql-mastery-badge" style={{ fontSize: '11px' }}>
              {examMode === 'EXAM' ? <Lock size={11} /> : <Flame size={11} />}
              {examMode === 'EXAM' ? 'STRICT TCS EXAM' : 'GUIDED PRACTICE'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              className="sql-xp-burst"
              style={{ color: sectionLeftSec < 90 ? '#ef4444' : '#0284c7', fontSize: '13.5px' }}
            >
              <Clock size={14} /> Sec Timer: {formatMMSS(sectionLeftSec)}
            </span>

            {sectionIdx + 1 < activePaper.sections.length && (
              <button
                type="button"
                onClick={() => advanceToSection(sectionIdx + 1)}
                className="sql-btn sql-btn-primary"
              >
                {examMode === 'EXAM' ? 'Lock & Next Section' : 'Next Section'} <ArrowRight size={14} />
              </button>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitMock}
              className="sql-btn sql-btn-emerald"
            >
              <CheckCircle2 size={15} /> {submitting ? 'Scoring Mock...' : 'Submit Full Mock'}
            </button>
          </div>
        </div>

        {/* 6-Section Bar */}
        <div className="tcs-section-pills">
          {activePaper.sections.map((sec, idx) => {
            const locked = examMode === 'EXAM' && idx < lockedSectionIdx;
            const active = idx === sectionIdx;
            return (
              <button
                key={sec.key}
                type="button"
                disabled={locked}
                onClick={() => advanceToSection(idx)}
                className={`tcs-section-pill-btn ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
              >
                {locked && <Lock size={11} />}
                <span>
                  {idx + 1}. {sec.name} ({sec.questions}Q · {sec.minutes}m)
                </span>
              </button>
            );
          })}
        </div>

        {/* Current Question Card */}
        <div className="sql-workbench-card">
          <div className="sql-card-header-row">
            <div className="sql-card-badges">
              <span className="sql-qnum-badge">Q{activeItem.question_number}</span>
              <span className="sql-type-pill sql-type-mcq">{activeItem.section}</span>
              <span className="sql-section-pill">{activeItem.topic}</span>
              {activeItem.section === 'Verbal Ability' && activeItem.item_type === 'MCQ' && (
                <span className="sql-section-pill" style={{ color: '#f59e0b' }}>
                  Target: 25s
                </span>
              )}
            </div>
            <div className="sql-card-actions-right">
              <span className="sql-section-pill">
                Time on Q: {formatMMSS(curResp.timeSpentSec || 0)}
              </span>
            </div>
          </div>

          {activeItem.item_type === 'MCQ' && (
            <>
              <div className="sql-question-heading" style={{ whiteSpace: 'pre-line' }}>
                {activeItem.question}
              </div>

              <div className="sql-mcq-options-grid">
                {Object.entries(activeItem.options || {})
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([optKey, text]) => {
                    const picked = curResp.selectedOption === optKey;
                    const rightOpt = (activeItem.correct_option || '').toUpperCase();
                    let cls = '';
                    if (examMode === 'PRACTICE' && curResp.selectedOption) {
                      if (optKey === rightOpt) cls = 'sql-opt-correct';
                      else if (picked) cls = 'sql-opt-wrong';
                      else cls = 'sql-opt-dimmed';
                    } else if (picked) {
                      cls = 'sql-opt-correct';
                    }
                    return (
                      <button
                        key={optKey}
                        type="button"
                        onClick={() =>
                          setResponses((prev) => ({
                            ...prev,
                            [activeItem.question_number]: {
                              ...prev[activeItem.question_number],
                              selectedOption: optKey,
                            },
                          }))
                        }
                        className={`sql-mcq-option-btn ${cls}`}
                      >
                        <span className="sql-opt-letter">{optKey}</span>
                        <span className="sql-opt-text">{text}</span>
                      </button>
                    );
                  })}
              </div>

              {examMode === 'PRACTICE' && curResp.selectedOption && activeItem.explanation && (
                <div className={`sql-explanation-box ${curResp.selectedOption === activeItem.correct_option ? 'correct' : 'wrong'}`}>
                  <p className="sql-exp-paragraph">
                    <strong>Answer ({activeItem.correct_option}):</strong> {activeItem.explanation}
                  </p>
                </div>
              )}
            </>
          )}

          {activeItem.item_type === 'PASSAGE_RECALL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(!prState[activeItem.question_number] || prState[activeItem.question_number].phase === 'idle') && (
                <div className="tcs-passage-hidden-card">
                  <h4 style={{ margin: '0 0 8px' }}>Passage Recall ({activeItem.title}) — 30s Read / 90s Write</h4>
                  <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Passage stays visible for 30 seconds, then hides automatically so you recall key facts in 90 seconds.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setPrState((prev) => ({
                        ...prev,
                        [activeItem.question_number]: { phase: 'reading', sec: 30 },
                      }))
                    }
                    className="sql-btn sql-btn-primary"
                  >
                    <Play size={14} fill="currentColor" /> Show Passage (30s)
                  </button>
                </div>
              )}

              {prState[activeItem.question_number]?.phase === 'reading' && (
                <div className="apt-example-callout" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ color: '#059669' }}>
                      Read &amp; Memorize ({prState[activeItem.question_number].sec}s left)
                    </strong>
                    <button
                      type="button"
                      onClick={() =>
                        setPrState((prev) => ({
                          ...prev,
                          [activeItem.question_number]: { phase: 'writing', sec: 90 },
                        }))
                      }
                      className="sql-mini-btn"
                    >
                      <EyeOff size={12} /> Hide &amp; Type Recall
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.65 }}>{activeItem.question}</p>
                </div>
              )}

              {prState[activeItem.question_number]?.phase === 'writing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="sql-xp-burst" style={{ width: 'fit-content' }}>
                    <Clock size={12} /> Passage Hidden — Write Recall ({prState[activeItem.question_number].sec}s)
                  </div>
                  <textarea
                    rows={5}
                    value={curResp.textResponse || ''}
                    onChange={(e) =>
                      setResponses((prev) => ({
                        ...prev,
                        [activeItem.question_number]: {
                          ...prev[activeItem.question_number],
                          textResponse: e.target.value,
                        },
                      }))
                    }
                    placeholder="Type all key facts from the passage..."
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-default, #cbd5e1)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {activeItem.item_type === 'EMAIL_WRITING' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="apt-example-callout">
                <strong>Email Task ({activeItem.title} — 9 min target):</strong>
                <p style={{ margin: '6px 0 0', fontSize: '13.5px' }}>{activeItem.question}</p>
              </div>
              <textarea
                rows={7}
                value={curResp.textResponse || ''}
                onChange={(e) =>
                  setResponses((prev) => ({
                    ...prev,
                    [activeItem.question_number]: {
                      ...prev[activeItem.question_number],
                      textResponse: e.target.value,
                    },
                  }))
                }
                placeholder="Subject: ...&#10;&#10;Dear Sir/Madam,&#10;&#10;...&#10;&#10;Regards,&#10;Aman"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-default, #cbd5e1)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          )}

          {activeItem.item_type === 'CODING' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>{activeItem.title}</h3>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.55 }}>{activeItem.question}</p>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                <div><strong>Input:</strong> {activeItem.input_spec}</div>
                <div><strong>Output:</strong> {activeItem.output_spec}</div>
                <div><strong>Constraints:</strong> {activeItem.constraints}</div>
              </div>
              <div className="tcs-io-grid">
                <div className="tcs-io-box">
                  <strong>Sample Input</strong>
                  {'\n'}
                  {activeItem.sample_input}
                </div>
                <div className="tcs-io-box">
                  <strong>Sample Output</strong>
                  {'\n'}
                  {activeItem.sample_output}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <select
                  value={curResp.language || 'cpp17'}
                  onChange={(e) =>
                    setResponses((prev) => ({
                      ...prev,
                      [activeItem.question_number]: {
                        ...prev[activeItem.question_number],
                        language: e.target.value,
                      },
                    }))
                  }
                  className="sql-select"
                  style={{ minWidth: '140px' }}
                >
                  <option value="cpp17">C++17</option>
                  <option value="python">Python 3</option>
                  <option value="java">Java</option>
                  <option value="javascript">JavaScript</option>
                </select>
                <button
                  type="button"
                  disabled={codingRunning}
                  onClick={runMockCodingSample}
                  className="sql-btn sql-btn-emerald"
                >
                  <Play size={14} fill="currentColor" /> {codingRunning ? 'Executing...' : 'Run Sample Test'}
                </button>
              </div>

              <textarea
                className="tcs-code-textarea"
                spellCheck={false}
                value={curResp.codeResponse ?? DEFAULT_CPP}
                onChange={(e) =>
                  setResponses((prev) => ({
                    ...prev,
                    [activeItem.question_number]: {
                      ...prev[activeItem.question_number],
                      codeResponse: e.target.value,
                    },
                  }))
                }
              />

              {codingRunMsg[activeItem.question_number] && (
                <div className={`sql-explanation-box ${codingRunMsg[activeItem.question_number].ok ? 'correct' : 'wrong'}`}>
                  <strong style={{ fontSize: '13px' }}>{codingRunMsg[activeItem.question_number].text}</strong>
                </div>
              )}
            </div>
          )}

          {/* Section Question Prev/Next + Question Palette */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '8px' }}>
            <button
              type="button"
              disabled={secPosIdx <= 0}
              onClick={() => setCurrentQNum(secItems[secPosIdx - 1].question_number)}
              className="sql-btn sql-btn-secondary"
            >
              <ChevronLeft size={14} /> Prev in Section
            </button>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Section Item {secPosIdx + 1} / {secItems.length}
            </span>
            <button
              type="button"
              disabled={secPosIdx === -1 || secPosIdx >= secItems.length - 1}
              onClick={() => setCurrentQNum(secItems[secPosIdx + 1].question_number)}
              className="sql-btn sql-btn-primary"
            >
              Next in Section <ChevronRight size={14} />
            </button>
          </div>

          <div className="tcs-q-palette">
            {secItems.map((it) => {
              const r = responses[it.question_number];
              const isAns = Boolean(r?.selectedOption || (r?.textResponse || '').trim() || r?.codingPassed);
              const isCur = it.question_number === activeItem.question_number;
              return (
                <button
                  key={it.question_number}
                  type="button"
                  onClick={() => setCurrentQNum(it.question_number)}
                  className={`tcs-palette-dot ${isAns ? 'answered' : ''} ${isCur ? 'current' : ''}`}
                >
                  {it.question_number}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DEEP MOCK ANALYSIS VIEW (PER PAPER + CROSS-MOCK INSIGHTS)
  // =========================================================================
  if (viewSection === 'analysis') {
    const inspectedPaper = activeAttempt ? paperCache[activeAttempt.paper_number] : null;
    const tier = activeAttempt
      ? getTcsReadinessTier(Number(activeAttempt.total_score), activeAttempt.coding_solved)
      : null;

    const auditItems = inspectedPaper && activeAttempt
      ? inspectedPaper.items.filter((item) => {
          const resp = activeAttempt.responses?.[item.question_number];
          if (auditFilter === 'SPECIAL') return item.item_type !== 'MCQ';
          if (auditFilter === 'SLOW') return (resp?.timeSpentSec || 0) > 75;
          if (item.item_type !== 'MCQ') return auditFilter === 'ALL';
          const isRight = Boolean(resp?.selectedOption && resp.selectedOption.toUpperCase() === (item.correct_option || '').toUpperCase());
          if (auditFilter === 'CORRECT') return isRight;
          if (auditFilter === 'WRONG') return Boolean(resp?.selectedOption) && !isRight;
          if (auditFilter === 'UNATTEMPTED') return !resp?.selectedOption;
          return true;
        })
      : [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {crossMockSummary && (
          <div className="sql-glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={18} style={{ color: '#06b6d4' }} />
                  Cross-Mock Analytics Across All Attempted Papers
                </h3>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Aggregated accuracy, score progression &amp; weakest topics across {crossMockSummary.uniquePapers} / 13 Mock Papers ({allAttempts.length} attempts)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span className="sql-xp-burst">Best: {crossMockSummary.bestAttempt.total_score} / 81</span>
                <span className="sql-solved-pill">Avg: {crossMockSummary.avgScore} ({crossMockSummary.avgAcc}% acc)</span>
              </div>
            </div>

            {crossMockSummary.weakTopics.length > 0 && (
              <div>
                <div className="sql-exp-subtitle" style={{ marginBottom: '8px' }}>
                  <AlertTriangle size={13} style={{ color: '#f59e0b' }} /> Top Weak Topics Across Mocks (Click to Practice in Workbook)
                </div>
                <div className="tcs-topic-grid">
                  {crossMockSummary.weakTopics.map((wt) => (
                    <div key={wt.topic} className="tcs-topic-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '13px' }}>
                        <span>{wt.topic}</span>
                        <span style={{ color: wt.accuracyPct < 50 ? '#f43f5e' : '#f59e0b' }}>{wt.accuracyPct}% acc</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span>{wt.correct} right · {wt.wrong} wrong</span>
                        <button
                          type="button"
                          onClick={() => onPracticeChapter(wt.chapterNumber)}
                          className="sql-mini-btn"
                        >
                          Practice Ch {wt.chapterNumber} →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!activeAttempt ? (
          <div className="sql-glass-panel" style={{ textAlign: 'center', padding: '44px 20px' }}>
            <Target size={38} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 8px' }}>No Mock Attempt Analyzed Yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', maxWidth: '520px', margin: '0 auto 16px' }}>
              Take any of the 13 Full-Length TCS NQT Pattern Mock Papers (81 items · 191 min) under strict Exam Mode or Guided Practice Mode to unlock deep section-wise, pacing, and topic-by-topic diagnostics.
            </p>
            <button
              type="button"
              onClick={() => startMock(mockHeaders[0]?.paper_number || 1, 'EXAM')}
              className="sql-btn sql-btn-primary"
            >
              <Play size={14} fill="currentColor" /> Launch Mock Paper 1
            </button>
          </div>
        ) : (
          <>
            {/* Attempt Selector & Per-Paper Hero */}
            <div className="sql-glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                      Mock Paper {activeAttempt.paper_number} — Deep Analysis Report
                    </h3>
                    {tier && (
                      <span
                        className="sql-mastery-badge"
                        style={{ color: tier.color, borderColor: `${tier.color}55` }}
                      >
                        <Shield size={12} /> {tier.label}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {tier?.hint} (Unofficial practice benchmark based on 81-item sheet scoring)
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={activeAttempt.id}
                    onChange={(e) => setSelectedAttemptId(e.target.value)}
                    className="sql-select"
                  >
                    {allAttempts.map((a, idx) => (
                      <option key={a.id} value={a.id}>
                        #{idx + 1} · Paper {a.paper_number} ({a.total_score}/{a.max_score} · {a.mode})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => startMock(activeAttempt.paper_number, 'EXAM')}
                    className="sql-btn sql-btn-secondary"
                  >
                    Retake Paper {activeAttempt.paper_number}
                  </button>
                </div>
              </div>

              <div className="sql-breakdown-pills">
                <div className="sql-mini-stat">
                  <span className="sql-mini-stat-label">Total Score</span>
                  <span className="sql-mini-stat-val sql-color-mcq">
                    {activeAttempt.total_score} <span className="sql-stat-sub">/ {activeAttempt.max_score}</span>
                  </span>
                </div>
                <div className="sql-mini-stat">
                  <span className="sql-mini-stat-label">MCQ Accuracy</span>
                  <span className="sql-mini-stat-val sql-color-correct">
                    {activeAttempt.accuracy_pct}% <span className="sql-stat-sub">({activeAttempt.mcq_correct}✓ {activeAttempt.mcq_wrong}✗)</span>
                  </span>
                </div>
                <div className="sql-mini-stat">
                  <span className="sql-mini-stat-label">Verbal &amp; Coding</span>
                  <span className="sql-mini-stat-val">
                    {activeAttempt.writing_score}/5 <span className="sql-stat-sub">writing • {activeAttempt.coding_solved}/2 code</span>
                  </span>
                </div>
                <div className="sql-mini-stat">
                  <span className="sql-mini-stat-label">Total Time Used</span>
                  <span className="sql-mini-stat-val">
                    {formatMMSS(activeAttempt.total_time_sec)} <span className="sql-stat-sub">/ 3:11:00</span>
                  </span>
                </div>
              </div>

              {/* 6-Section Matrix */}
              <div style={{ overflowX: 'auto' }}>
                <table className="tcs-analysis-matrix">
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Score</th>
                      <th>Right / Wrong / Skip</th>
                      <th>Accuracy</th>
                      <th>Time Used / Limit</th>
                      <th>Avg s/Q</th>
                      <th>Pacing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeAttempt.section_stats || []).map((st) => (
                      <tr key={st.key}>
                        <td style={{ fontWeight: 700 }}>{st.name}</td>
                        <td>{st.score} / {st.maxScore}</td>
                        <td>{st.correct} / {st.wrong} / {st.unattempted}</td>
                        <td>{st.accuracyPct}%</td>
                        <td>{formatMMSS(st.spentSeconds)} / {formatMMSS(st.budgetSeconds)}</td>
                        <td>{st.avgSecPerItem}s</td>
                        <td>
                          <span
                            className="sql-section-pill"
                            style={{
                              color: st.pacingStatus === 'Overtime' ? '#e11d48' : st.pacingStatus === 'Fast' ? '#059669' : '#0284c7',
                            }}
                          >
                            {st.pacingStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Topic Breakdown for this Mock */}
              {(activeAttempt.topic_stats || []).length > 0 && (
                <div>
                  <div className="sql-exp-subtitle" style={{ marginBottom: '8px' }}>
                    Topic-by-Topic Diagnostics (Weakest First — Click Chapter to Practice)
                  </div>
                  <div className="tcs-topic-grid">
                    {activeAttempt.topic_stats.map((ts) => (
                      <div key={ts.topic} className="tcs-topic-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '12.5px' }}>
                          <span>{ts.topic}</span>
                          <span style={{ color: ts.accuracyPct >= 70 ? '#10b981' : ts.accuracyPct >= 40 ? '#f59e0b' : '#f43f5e' }}>
                            {ts.correct}/{ts.total} ({ts.accuracyPct}%)
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          <span>Avg {ts.avgTimeSec}s/Q · {ts.wrong} wrong · {ts.unattempted} skip</span>
                          <button
                            type="button"
                            onClick={() => onPracticeChapter(ts.chapterNumber)}
                            className="sql-mini-btn"
                          >
                            Ch {ts.chapterNumber} →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Question-by-Question Review */}
            <div className="sql-glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  Full Question-by-Question Audit &amp; Solutions ({auditItems.length} items)
                </h4>
                <div className="sql-pill-group">
                  {(['ALL', 'WRONG', 'UNATTEMPTED', 'SLOW', 'CORRECT', 'SPECIAL'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAuditFilter(f)}
                      className={`sql-filter-pill ${auditFilter === f ? 'active' : ''}`}
                    >
                      {f === 'SLOW' ? 'Slow (>75s)' : f === 'SPECIAL' ? 'Recall/Email/Code' : f}
                    </button>
                  ))}
                </div>
              </div>

              {loadingPaperNum === activeAttempt.paper_number ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading full paper solutions...</p>
              ) : (
                auditItems.map((item) => {
                  const resp = activeAttempt.responses?.[item.question_number] || {};
                  const timeSpent = resp.timeSpentSec || 0;

                  if (item.item_type === 'MCQ') {
                    const isRight = Boolean(
                      resp.selectedOption &&
                        resp.selectedOption.toUpperCase() === (item.correct_option || '').toUpperCase()
                    );
                    return (
                      <div key={item.question_number} className={`sql-explanation-box ${resp.selectedOption ? (isRight ? 'correct' : 'wrong') : ''}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '13.5px' }}>
                            Q{item.question_number} · {item.section} ({item.topic})
                          </span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span className="sql-section-pill">Time: {timeSpent}s</span>
                            <span className="sql-section-pill">
                              Your Ans: {resp.selectedOption || 'Skipped'} · Key: {item.correct_option}
                            </span>
                            <button
                              type="button"
                              onClick={() => onPracticeChapter(item.chapter_number)}
                              className="sql-mini-btn"
                            >
                              Revise Ch {item.chapter_number}
                            </button>
                          </div>
                        </div>
                        <p style={{ margin: '6px 0', fontSize: '13.5px', whiteSpace: 'pre-line' }}>{item.question}</p>
                        <p className="sql-exp-paragraph">
                          <strong>Solution ({item.correct_option}):</strong> {item.explanation || item.correct_answer}
                        </p>
                      </div>
                    );
                  }

                  if (item.item_type === 'PASSAGE_RECALL') {
                    const ratio = Math.round(scoreTextMatchRatio(resp.textResponse || '', item.keywords || []) * 100);
                    return (
                      <div key={item.question_number} className="sql-explanation-box">
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                          <strong>Q{item.question_number} · {item.title}</strong>
                          <span className="sql-section-pill">Key-Fact Match: {ratio}% · Time: {timeSpent}s</span>
                        </div>
                        <p style={{ margin: '6px 0', fontSize: '13px' }}>
                          <strong>Your Recall:</strong> {resp.textResponse || '(Skipped)'}
                        </p>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <strong>Original Passage:</strong> {item.question}
                        </p>
                      </div>
                    );
                  }

                  if (item.item_type === 'EMAIL_WRITING') {
                    return (
                      <div key={item.question_number} className="sql-explanation-box">
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                          <strong>Q{item.question_number} · Email: {item.title}</strong>
                          <span className="sql-section-pill">Time: {timeSpent}s</span>
                        </div>
                        <pre style={{ margin: '6px 0', whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13px' }}>
                          Your Email:{'\n'}{resp.textResponse || '(Skipped)'}
                        </pre>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '12.5px', color: '#059669' }}>
                          Model Email:{'\n'}{item.sample_solution}
                        </pre>
                      </div>
                    );
                  }

                  return (
                    <div key={item.question_number} className={`sql-explanation-box ${resp.codingPassed ? 'correct' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                        <strong>Q{item.question_number} · {item.section}: {item.title}</strong>
                        <span className="sql-section-pill">
                          {resp.codingPassed ? 'Passed Sample' : resp.codeResponse ? 'Attempted' : 'Not Solved'} · {formatMMSS(timeSpent)}
                        </span>
                      </div>
                      <p style={{ margin: '6px 0', fontSize: '13px' }}>{item.editorial_notes}</p>
                      {item.solution_code && (
                        <pre className="tcs-code-textarea" style={{ minHeight: 'auto', margin: 0 }}>
                          {item.solution_code}
                        </pre>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // =========================================================================
  // 13 MOCK PAPERS HUB VIEW
  // =========================================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="sql-glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} style={{ color: '#f59e0b' }} />
            13 Full-Length TCS NQT Pattern Mock Tests (191 Mins · 81 Items Each)
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Section-locked real simulation: Numerical (20Q/25m) → Reasoning (20Q/25m) → Adv Q&amp;R (14Q/25m) → Verbal (20 MCQs + 4 30s/90s Passage Recalls + 1 Email / 26m) → Coding Easy (35m) → Coding Medium (55m).
          </p>
        </div>

        {allAttempts.length > 0 && (
          <button type="button" onClick={onSwitchToAnalysis} className="sql-btn sql-btn-emerald">
            <BarChart3 size={15} /> View Deep Analysis ({allAttempts.length} Attempts)
          </button>
        )}
      </div>

      {loadError && (
        <div className="sql-explanation-box wrong">
          <XCircle size={16} /> <span>{loadError}</span>
        </div>
      )}

      <div className="tcs-mocks-grid">
        {mockHeaders.map((paper) => {
          const paperAttempts = allAttempts.filter((a) => a.paper_number === paper.paper_number);
          const bestAttempt = paperAttempts.length > 0
            ? [...paperAttempts].sort((a, b) => b.total_score - a.total_score)[0]
            : null;
          const isLoadingThis = loadingPaperNum === paper.paper_number;

          return (
            <div key={paper.paper_number} className="sql-glass-panel tcs-mock-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div>
                  <span className="sql-qnum-badge">MOCK PAPER {paper.paper_number}</span>
                  <h4 style={{ margin: '8px 0 2px', fontSize: '16px', fontWeight: 800 }}>{paper.title}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {paper.total_items} Items · {paper.total_minutes} Mins (6 Sections)
                  </span>
                </div>

                {bestAttempt && (
                  <span className="sql-solved-pill" style={{ flexShrink: 0 }}>
                    Best: {bestAttempt.total_score}/{bestAttempt.max_score}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {paper.sections.map((s) => (
                  <span key={s.key} className="sql-section-pill" style={{ fontSize: '11px' }}>
                    {s.name.replace('Advanced Quantitative and Reasoning', 'Adv Q&R').replace('Advanced Coding ', 'Code ')}: {s.questions}Q/{s.minutes}m
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '4px' }}>
                <button
                  type="button"
                  disabled={isLoadingThis}
                  onClick={() => startMock(paper.paper_number, 'EXAM')}
                  className="sql-btn sql-btn-primary"
                  style={{ flex: 1 }}
                >
                  <Lock size={13} /> {isLoadingThis ? 'Loading...' : 'Start Exam Mode'}
                </button>
                <button
                  type="button"
                  disabled={isLoadingThis}
                  onClick={() => startMock(paper.paper_number, 'PRACTICE')}
                  className="sql-btn sql-btn-secondary"
                >
                  <FileText size={13} /> Practice
                </button>
                {bestAttempt && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAttemptId(bestAttempt.id);
                      onSwitchToAnalysis();
                    }}
                    className="sql-btn sql-btn-emerald"
                  >
                    <Sparkles size={13} /> Analysis
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

