'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Edit3,
  FileText,
  ListChecks,
  Loader2,
  Save,
  Search,
  AlertCircle,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';

export type EditableSheetType = 'TCS_PREP' | 'APTITUDE' | 'SQL' | 'ROADMAP' | 'DSA';

interface SheetEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: {
    id: string;
    title: string;
    description?: string | null;
    enrollment_access?: string | null;
    enrollment_passcode?: string | null;
    youtube_url?: string | null;
  };
  sheetType: EditableSheetType;
  questions?: any[];
  initialTab?: 'details' | 'questions';
  initialQuestionKey?: number | string | null;
  onSheetMetaSaved?: (updated: {
    title: string;
    description: string;
    enrollment_access?: string;
    youtube_url?: string | null;
  }) => void;
  onQuestionSaved?: (updatedItem: any) => void;
}

function getItemKey(item: any, sheetType: EditableSheetType): string {
  if (!item) return '';
  if (sheetType === 'ROADMAP') return String(item.problem_code || '');
  if (sheetType === 'DSA') return String(item.id || '');
  return String(item.question_number ?? '');
}

function getItemLabel(item: any, sheetType: EditableSheetType): string {
  if (!item) return '';
  if (sheetType === 'ROADMAP') return `${item.problem_code} · ${item.title}`;
  if (sheetType === 'DSA') return `#${(item.order_index ?? 0) + 1} · ${item.title}`;
  return `Q${item.question_number}. ${String(item.question || '').slice(0, 90)}`;
}

export default function SheetEditorModal({
  isOpen,
  onClose,
  sheet,
  sheetType,
  questions = [],
  initialTab = 'details',
  initialQuestionKey = null,
  onSheetMetaSaved,
  onQuestionSaved,
}: SheetEditorModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'questions'>(initialTab);

  // Sheet details fields
  const [title, setTitle] = useState(sheet.title || '');
  const [description, setDescription] = useState(sheet.description || '');
  const [enrollmentAccess, setEnrollmentAccess] = useState(sheet.enrollment_access || 'public');
  const [passcode, setPasscode] = useState(sheet.enrollment_passcode || '');
  const [youtubeUrl, setYoutubeUrl] = useState(sheet.youtube_url || '');
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaFeedback, setMetaFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Question editor fields
  const [qSearch, setQSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string>(
    initialQuestionKey !== null && initialQuestionKey !== undefined
      ? String(initialQuestionKey)
      : questions[0]
      ? getItemKey(questions[0], sheetType)
      : ''
  );

  const [qTitle, setQTitle] = useState('');
  const [qPrompt, setQPrompt] = useState('');
  const [qSection, setQSection] = useState('');
  const [qDifficulty, setQDifficulty] = useState('EASY');
  const [qOptA, setQOptA] = useState('');
  const [qOptB, setQOptB] = useState('');
  const [qOptC, setQOptC] = useState('');
  const [qOptD, setQOptD] = useState('');
  const [qCorrectOpt, setQCorrectOpt] = useState('A');
  const [qCorrectAnswer, setQCorrectAnswer] = useState('');
  const [qSolutionSql, setQSolutionSql] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qTheoryHint, setQTheoryHint] = useState('');
  const [qImageUrl, setQImageUrl] = useState('');
  const [savingQ, setSavingQ] = useState(false);
  const [qFeedback, setQFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setTitle(sheet.title || '');
    setDescription(sheet.description || '');
    setEnrollmentAccess(sheet.enrollment_access || 'public');
    setPasscode(sheet.enrollment_passcode || '');
    setYoutubeUrl(sheet.youtube_url || '');
    setMetaFeedback(null);
    setQFeedback(null);
    if (initialQuestionKey !== null && initialQuestionKey !== undefined) {
      setSelectedKey(String(initialQuestionKey));
    } else if (!selectedKey && questions[0]) {
      setSelectedKey(getItemKey(questions[0], sheetType));
    }
  }, [isOpen, initialTab, initialQuestionKey, sheet.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedItem = useMemo(() => {
    return questions.find((q) => getItemKey(q, sheetType) === selectedKey) || questions[0] || null;
  }, [questions, selectedKey, sheetType]);

  useEffect(() => {
    if (!selectedItem) return;
    setQFeedback(null);
    if (sheetType === 'ROADMAP') {
      setQTitle(selectedItem.title || '');
      setQPrompt(selectedItem.problem_statement || '');
      setQSection(selectedItem.topic || '');
      setQDifficulty(selectedItem.difficulty || 'EASY');
      setQExplanation(selectedItem.explanation || '');
      setQTheoryHint(selectedItem.description || '');
      setQOptA(selectedItem.theory || '');
    } else if (sheetType === 'DSA') {
      setQTitle(selectedItem.title || '');
      setQDifficulty(selectedItem.difficulty || 'Medium');
      setQExplanation(selectedItem.text_solution || '');
      setYoutubeUrl(selectedItem.youtube_url || sheet.youtube_url || '');
      setQOptA(selectedItem.youtube_url || '');
    } else {
      setQPrompt(selectedItem.question || '');
      setQSection(
        sheetType === 'SQL' ? selectedItem.section || '' : selectedItem.chapter_title || ''
      );
      setQDifficulty(selectedItem.difficulty || 'EASY');
      const opts = selectedItem.options || {};
      setQOptA(opts.A || '');
      setQOptB(opts.B || '');
      setQOptC(opts.C || '');
      setQOptD(opts.D || '');
      setQCorrectOpt((selectedItem.correct_option || 'A').toUpperCase());
      setQCorrectAnswer(selectedItem.correct_answer || '');
      setQSolutionSql(selectedItem.solution_sql || '');
      if (sheetType === 'SQL') {
        const pts = Array.isArray(selectedItem.explanation_points)
          ? selectedItem.explanation_points.join('\n')
          : '';
        setQExplanation(pts);
      } else {
        setQExplanation(selectedItem.explanation || '');
      }
      setQImageUrl(selectedItem.image_url || '');
    }
  }, [selectedItem, sheetType, sheet.youtube_url]);

  const filteredQuestions = useMemo(() => {
    const q = qSearch.trim().toLowerCase();
    if (!q) return questions.slice(0, 40);
    const cleanNum = q.replace(/^q/i, '');
    return questions
      .filter((item) => {
        const key = getItemKey(item, sheetType).toLowerCase();
        if (key === cleanNum || key === q) return true;
        const text = `${item.title || ''} ${item.question || ''} ${item.chapter_title || ''} ${item.section || ''} ${item.topic || ''} ${item.problem_statement || ''}`.toLowerCase();
        return text.includes(q);
      })
      .slice(0, 40);
  }, [questions, qSearch, sheetType]);

  const handleSaveSheetMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || savingMeta) return;
    setSavingMeta(true);
    setMetaFeedback(null);
    try {
      const res = await fetch(`/api/coding/sheets/${sheet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          enrollment_access: enrollmentAccess,
          enrollment_passcode: enrollmentAccess === 'restricted' ? passcode.trim() : undefined,
          youtube_url: youtubeUrl.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMetaFeedback({ ok: false, msg: json.error?.message || 'Failed to update sheet details.' });
      } else {
        setMetaFeedback({ ok: true, msg: 'Sheet details updated successfully.' });
        onSheetMetaSaved?.({
          title: title.trim(),
          description: description.trim(),
          enrollment_access: enrollmentAccess,
          youtube_url: youtubeUrl.trim() || null,
        });
      }
    } catch {
      setMetaFeedback({ ok: false, msg: 'Network error while saving sheet details.' });
    } finally {
      setSavingMeta(false);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || savingQ) return;
    setSavingQ(true);
    setQFeedback(null);
    try {
      let editTarget = '';
      let questionData: Record<string, any> = {};
      let localPatch: Record<string, any> = {};

      if (sheetType === 'TCS_PREP') {
        editTarget = 'tcs_question';
        const options = { A: qOptA, B: qOptB, C: qOptC, D: qOptD };
        const diff = qDifficulty as 'EASY' | 'MEDIUM' | 'HARD';
        const levelLabel = diff === 'HARD' ? 'Advance' : diff === 'MEDIUM' ? 'Medium' : 'Basic';
        questionData = {
          question_number: selectedItem.question_number,
          question: qPrompt,
          options,
          correct_option: qCorrectOpt,
          correct_answer: options[qCorrectOpt as keyof typeof options] || '',
          difficulty: diff,
          level_label: levelLabel,
          chapter_title: qSection,
          explanation: qExplanation,
          image_url: qImageUrl.trim() || null,
        };
        localPatch = { ...selectedItem, ...questionData };
      } else if (sheetType === 'APTITUDE') {
        editTarget = 'aptitude_question';
        const options = { A: qOptA, B: qOptB, C: qOptC, D: qOptD };
        const diff = qDifficulty as 'EASY' | 'MEDIUM' | 'HARD';
        const levelLabel = diff === 'HARD' ? 'Advance' : diff === 'MEDIUM' ? 'Medium' : 'Basic';
        questionData = {
          question_number: selectedItem.question_number,
          question: qPrompt,
          options,
          correct_option: qCorrectOpt,
          correct_answer: options[qCorrectOpt as keyof typeof options] || '',
          difficulty: diff,
          level_label: levelLabel,
          chapter_title: qSection,
          explanation: qExplanation,
        };
        localPatch = { ...selectedItem, ...questionData };
      } else if (sheetType === 'SQL') {
        editTarget = 'sql_question';
        const points = qExplanation
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean);
        const isMcq = selectedItem.type === 'MCQ';
        const options = isMcq ? { A: qOptA, B: qOptB, C: qOptC, D: qOptD } : selectedItem.options;
        questionData = {
          question_number: selectedItem.question_number,
          question: qPrompt,
          section: qSection,
          difficulty: qDifficulty,
          options,
          correct_option: isMcq ? qCorrectOpt : selectedItem.correct_option,
          correct_answer: isMcq
            ? options?.[qCorrectOpt] || qCorrectAnswer
            : qCorrectAnswer,
          solution_sql: isMcq ? selectedItem.solution_sql : qSolutionSql,
          explanation_points: points,
        };
        localPatch = { ...selectedItem, ...questionData };
      } else if (sheetType === 'ROADMAP') {
        editTarget = 'roadmap_problem';
        questionData = {
          problem_code: selectedItem.problem_code,
          title: qTitle,
          difficulty: qDifficulty,
          topic: qSection,
          problem_statement: qPrompt,
          description: qTheoryHint,
          theory: qOptA,
          explanation: qExplanation,
        };
        localPatch = { ...selectedItem, ...questionData };
      } else if (sheetType === 'DSA') {
        editTarget = 'dsa_problem';
        questionData = {
          id: selectedItem.id,
          title: qTitle,
          difficulty: qDifficulty,
          text_solution: qExplanation,
          youtube_url: qOptA.trim() || null,
        };
        localPatch = { ...selectedItem, ...questionData };
      }

      const res = await fetch(`/api/coding/sheets/${sheet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editTarget, questionData }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setQFeedback({ ok: false, msg: json.error?.message || 'Failed to save question.' });
      } else {
        setQFeedback({ ok: true, msg: 'Question updated and saved to database.' });
        onQuestionSaved?.(localPatch);
      }
    } catch {
      setQFeedback({ ok: false, msg: 'Network error while saving question.' });
    } finally {
      setSavingQ(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1px solid var(--border-default, rgba(148, 163, 184, 0.25))',
    background: 'var(--bg-secondary, rgba(15, 23, 42, 0.65))',
    color: 'var(--text-primary, #f8fafc)',
    fontSize: '13.5px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    color: 'var(--text-secondary, #94a3b8)',
    marginBottom: '5px',
  };

  const isMcqItem =
    sheetType === 'TCS_PREP' ||
    sheetType === 'APTITUDE' ||
    (sheetType === 'SQL' && selectedItem?.type === 'MCQ');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Sheet & Questions" size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '78vh', overflowY: 'auto', paddingRight: '2px' }}>
        {/* Switcher Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={activeTab === 'details' ? 'sql-btn sql-btn-primary' : 'sql-btn sql-btn-secondary'}
            style={{ padding: '7px 14px', fontSize: '12.5px' }}
          >
            <FileText size={14} /> Name &amp; Details
          </button>

          {questions.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className={activeTab === 'questions' ? 'sql-btn sql-btn-primary' : 'sql-btn sql-btn-secondary'}
              style={{ padding: '7px 14px', fontSize: '12.5px' }}
            >
              <ListChecks size={14} /> Edit Questions ({questions.length})
            </button>
          )}
        </div>

        {/* TAB 1: SHEET NAME & DETAILS */}
        {activeTab === 'details' && (
          <form onSubmit={handleSaveSheetMeta} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Sheet Name / Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Sheet Description / Details</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Enrollment Access</label>
                <select
                  value={enrollmentAccess}
                  onChange={(e) => setEnrollmentAccess(e.target.value)}
                  style={inputStyle}
                >
                  <option value="public">Public (Anyone Enrolled)</option>
                  <option value="restricted">Restricted (Passcode)</option>
                  <option value="private">Private (Creator / Staff)</option>
                </select>
              </div>

              {enrollmentAccess === 'restricted' && (
                <div>
                  <label style={labelStyle}>Passcode</label>
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter access passcode..."
                    style={inputStyle}
                  />
                </div>
              )}

              <div>
                <label style={labelStyle}>Overview YouTube URL (Optional)</label>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  style={inputStyle}
                />
              </div>
            </div>

            {metaFeedback && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  background: metaFeedback.ok ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                  color: metaFeedback.ok ? '#34d399' : '#f87171',
                  border: `1px solid ${metaFeedback.ok ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                }}
              >
                {metaFeedback.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                {metaFeedback.msg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
              <button type="button" onClick={onClose} className="sql-btn sql-btn-secondary">
                Close
              </button>
              <button type="submit" disabled={savingMeta} className="sql-btn sql-btn-emerald">
                {savingMeta ? <Loader2 size={14} className="spin-icon" /> : <Save size={14} />}
                {savingMeta ? 'Saving...' : 'Save Name & Details'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: SEARCH & EDIT QUESTIONS */}
        {activeTab === 'questions' && questions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Search & Quick Picker */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  value={qSearch}
                  onChange={(e) => setQSearch(e.target.value)}
                  placeholder="Search Q#, code (e.g. 15 or L1-004), or text..."
                  style={{ ...inputStyle, paddingLeft: '32px' }}
                />
              </div>

              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                style={{ ...inputStyle, flex: '1 1 240px' }}
              >
                {filteredQuestions.map((item) => {
                  const k = getItemKey(item, sheetType);
                  return (
                    <option key={k} value={k}>
                      {getItemLabel(item, sheetType)}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedItem && (
              <form onSubmit={handleSaveQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-default, rgba(148,163,184,0.18))', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Edit3 size={14} /> Editing: {sheetType === 'ROADMAP' ? selectedItem.problem_code : sheetType === 'DSA' ? selectedItem.title : `Question #${selectedItem.question_number}`}
                  </span>
                </div>

                {(sheetType === 'ROADMAP' || sheetType === 'DSA') && (
                  <div>
                    <label style={labelStyle}>Problem Title</label>
                    <input
                      type="text"
                      required
                      value={qTitle}
                      onChange={(e) => setQTitle(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                  {sheetType !== 'DSA' && (
                    <div>
                      <label style={labelStyle}>
                        {sheetType === 'SQL' ? 'Section' : sheetType === 'ROADMAP' ? 'Topic' : 'Chapter Title'}
                      </label>
                      <input
                        type="text"
                        value={qSection}
                        onChange={(e) => setQSection(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  )}

                  <div>
                    <label style={labelStyle}>Difficulty</label>
                    <select
                      value={qDifficulty}
                      onChange={(e) => setQDifficulty(e.target.value)}
                      style={inputStyle}
                    >
                      {sheetType === 'DSA' ? (
                        <>
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </>
                      ) : (
                        <>
                          <option value="EASY">Easy / Basic</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HARD">Hard / Advance</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {sheetType !== 'DSA' && (
                  <div>
                    <label style={labelStyle}>
                      {sheetType === 'ROADMAP' ? 'Problem Statement' : 'Question Text'}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={qPrompt}
                      onChange={(e) => setQPrompt(e.target.value)}
                      style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </div>
                )}

                {isMcqItem && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '8px' }}>
                      <div>
                        <label style={labelStyle}>Option A</label>
                        <input type="text" value={qOptA} onChange={(e) => setQOptA(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Option B</label>
                        <input type="text" value={qOptB} onChange={(e) => setQOptB(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Option C</label>
                        <input type="text" value={qOptC} onChange={(e) => setQOptC(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Option D</label>
                        <input type="text" value={qOptD} onChange={(e) => setQOptD(e.target.value)} style={inputStyle} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                      <div>
                        <label style={labelStyle}>Correct Option</label>
                        <select value={qCorrectOpt} onChange={(e) => setQCorrectOpt(e.target.value)} style={inputStyle}>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </div>
                      {sheetType === 'TCS_PREP' && (
                        <div>
                          <label style={labelStyle}>Diagram Image URL (Optional)</label>
                          <input
                            type="text"
                            value={qImageUrl}
                            onChange={(e) => setQImageUrl(e.target.value)}
                            placeholder="/images/tcs-nonverbal/q1.png"
                            style={inputStyle}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {sheetType === 'SQL' && selectedItem?.type === 'QUERY' && (
                  <>
                    <div>
                      <label style={labelStyle}>Expected / Solution SQL</label>
                      <textarea
                        rows={4}
                        value={qSolutionSql}
                        onChange={(e) => setQSolutionSql(e.target.value)}
                        style={{ ...inputStyle, fontFamily: 'monospace' }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Short Correct Answer Note</label>
                      <input type="text" value={qCorrectAnswer} onChange={(e) => setQCorrectAnswer(e.target.value)} style={inputStyle} />
                    </div>
                  </>
                )}

                {sheetType === 'ROADMAP' && (
                  <>
                    <div>
                      <label style={labelStyle}>Hinglish Description</label>
                      <textarea rows={2} value={qTheoryHint} onChange={(e) => setQTheoryHint(e.target.value)} style={{ ...inputStyle, fontFamily: 'inherit' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Theory / Pattern Hint</label>
                      <textarea rows={2} value={qOptA} onChange={(e) => setQOptA(e.target.value)} style={{ ...inputStyle, fontFamily: 'inherit' }} />
                    </div>
                  </>
                )}

                {sheetType === 'DSA' && (
                  <div>
                    <label style={labelStyle}>YouTube Video Solution URL</label>
                    <input type="text" value={qOptA} onChange={(e) => setQOptA(e.target.value)} style={inputStyle} placeholder="https://youtube.com/..." />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>
                    {sheetType === 'DSA' ? 'Text Solution (Markdown)' : sheetType === 'SQL' ? 'Explanation Points (1 per line)' : 'Explanation'}
                  </label>
                  <textarea
                    rows={3}
                    value={qExplanation}
                    onChange={(e) => setQExplanation(e.target.value)}
                    style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                {qFeedback && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      background: qFeedback.ok ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                      color: qFeedback.ok ? '#34d399' : '#f87171',
                      border: `1px solid ${qFeedback.ok ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                    }}
                  >
                    {qFeedback.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    {qFeedback.msg}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
                  <button type="button" onClick={onClose} className="sql-btn sql-btn-secondary">
                    Close
                  </button>
                  <button type="submit" disabled={savingQ} className="sql-btn sql-btn-emerald">
                    {savingQ ? <Loader2 size={14} className="spin-icon" /> : <Save size={14} />}
                    {savingQ ? 'Saving...' : 'Save Question'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

