'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CreateMcqModal from '@/features/courses/components/CreateMcqModal';
import { getCourseMcqsAction, deleteCourseMcqAction, submitCourseMcqAttemptAction } from '@/features/courses/actions/mcqs';
import type { CourseMCQ, CourseMCQAttempt } from '@/types/database';
import { HelpCircle, Plus, Edit, Trash2, CheckCircle, XCircle, RotateCcw, Award, History } from 'lucide-react';

interface CourseMcqsSectionProps {
  courseId: string;
  currentUserId?: string;
  isStaff?: boolean;
  isEnrolledOrFaculty?: boolean;
}

export default function CourseMcqsSection({
  courseId,
  currentUserId,
  isStaff = false,
  isEnrolledOrFaculty = false
}: CourseMcqsSectionProps) {
  const [mcqs, setMcqs] = useState<CourseMCQ[]>([]);
  const [attempts, setAttempts] = useState<CourseMCQAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMcq, setEditingMcq] = useState<CourseMCQ | null>(null);

  // Student Attempt State: map mcqId -> array of selected option keys (e.g. ['A', 'C'])
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    score: number;
    total: number;
    detailedResults: Record<string, { selected: string; correctOption: string; isCorrect: boolean }>;
  } | null>(null);

  const [showHistory, setShowHistory] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { mcqs: fetchedMcqs, attempts: fetchedAttempts } = await getCourseMcqsAction(courseId);
      setMcqs(fetchedMcqs || []);
      setAttempts(fetchedAttempts || []);
    } catch (err) {
      console.error('Error loading course MCQs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  const handleToggleOption = (mcqId: string, optionKey: string) => {
    if (submissionResult) return; // Prevent changing after submission until re-attempt
    setUserAnswers(prev => {
      const current = prev[mcqId] || [];
      const updated = current.includes(optionKey)
        ? current.filter(k => k !== optionKey)
        : [...current, optionKey].sort();
      
      if (updated.length === 0) {
        const copy = { ...prev };
        delete copy[mcqId];
        return copy;
      }
      return { ...prev, [mcqId]: updated };
    });
  };

  const handleSubmitQuiz = async () => {
    if (mcqs.length === 0) return;
    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount < mcqs.length) {
      if (!confirm(`You have answered ${answeredCount} of ${mcqs.length} questions. Do you want to submit anyway?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Format array answers to comma-separated strings for submission
      const formattedAnswers: Record<string, string> = {};
      Object.entries(userAnswers).forEach(([mcqId, keys]) => {
        if (keys && keys.length > 0) {
          formattedAnswers[mcqId] = keys.sort().join(',');
        }
      });

      const res = await submitCourseMcqAttemptAction(courseId, formattedAnswers);
      if (res.error) {
        alert(res.error);
      } else if (res.success && res.detailedResults) {
        setSubmissionResult({
          score: res.score,
          total: res.total,
          detailedResults: res.detailedResults
        });
        // Reload history
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit quiz.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReattempt = () => {
    setUserAnswers({});
    setSubmissionResult(null);
  };

  const handleDeleteMcq = async (mcqId: string) => {
    if (!confirm('Are you sure you want to delete this MCQ?')) return;
    try {
      const res = await deleteCourseMcqAction(mcqId, courseId);
      if (res.error) alert(res.error);
      else loadData();
    } catch (err: any) {
      alert(err.message || 'Error deleting MCQ.');
    }
  };

  const latestAttempt = attempts.length > 0 ? attempts[0] : null;

  return (
    <Card 
      variant="glass" 
      padding="lg"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)'
      }}
    >
      {/* SECTION HEADER */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-lg)' 
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>❓</span>
            <h2 className="section-title" style={{ margin: 0, fontSize: 'var(--text-xl)' }}>
              Course MCQs
            </h2>
          </div>
          <p className="text-secondary" style={{ margin: '4px 0 0 0', fontSize: 'var(--text-sm)' }}>
            Create and manage MCQ assessments for this course.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {attempts.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              style={{ fontSize: '0.85rem' }}
            >
              <History size={15} /> {showHistory ? 'Hide History' : `History (${attempts.length})`}
            </Button>
          )}

          {isStaff && (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => {
                setEditingMcq(null);
                setIsModalOpen(true);
              }}
              style={{ padding: '8px 16px', fontWeight: 'bold' }}
            >
              <Plus size={16} /> Create MCQ
            </Button>
          )}
        </div>
      </div>

      {/* ATTEMPT HISTORY LIST (IF TOGGLED) */}
      {showHistory && attempts.length > 0 && (
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h4 style={{ margin: '0 0 var(--space-xs) 0', fontSize: 'var(--text-sm)', color: 'var(--neon-cyan)' }}>
            📜 Past Attempt History
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {attempts.map((att, idx) => (
              <div key={att.id || idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', padding: '6px 10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                <span>Attempt #{attempts.length - idx} • {new Date(att.submitted_at).toLocaleString()}</span>
                <span style={{ fontWeight: 'bold', color: 'var(--neon-gold)' }}>Score: {att.score} / {att.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading ? (
        <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading course MCQs...
        </div>
      ) : mcqs.length === 0 ? (
        <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px border-dashed var(--glass-border)' }}>
          <HelpCircle size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
          <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>No MCQs created for this course yet.</p>
          {isStaff && (
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => {
                setEditingMcq(null);
                setIsModalOpen(true);
              }}
              style={{ marginTop: '12px' }}
            >
              + Add First MCQ
            </Button>
          )}
        </div>
      ) : (
        <div>
          {/* SUBMISSION RESULT BANNER */}
          {submissionResult && (
            <div 
              style={{ 
                background: 'rgba(57, 255, 20, 0.1)', 
                border: '1px solid var(--neon-lime)', 
                padding: 'var(--space-md)', 
                borderRadius: 'var(--radius-md)', 
                marginBottom: 'var(--space-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--space-md)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Award size={32} style={{ color: 'var(--neon-lime)' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--neon-lime)' }}>
                    Quiz Completed!
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    Your Score: <strong>{submissionResult.score} / {submissionResult.total}</strong> ({Math.round((submissionResult.score / Math.max(submissionResult.total, 1)) * 100)}%)
                  </p>
                </div>
              </div>

              <Button variant="primary" size="sm" onClick={handleReattempt}>
                <RotateCcw size={15} /> Re-attempt Quiz
              </Button>
            </div>
          )}

          {/* QUESTIONS LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {mcqs.map((mcq, index) => {
              const res = submissionResult?.detailedResults?.[mcq.id];
              const selectedKeys = userAnswers[mcq.id] || [];
              const staffCorrectList = isStaff && mcq.correct_option 
                ? mcq.correct_option.split(',').map(s => s.trim().toUpperCase()) 
                : [];
              const resultCorrectList = res?.correctOption 
                ? res.correctOption.split(',').map(s => s.trim().toUpperCase()) 
                : [];
              const isMultiCorrect = isStaff 
                ? staffCorrectList.length > 1 
                : (res ? resultCorrectList.length > 1 : mcq.correct_option?.includes(','));

              return (
                <div 
                  key={mcq.id}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-md)',
                    position: 'relative'
                  }}
                >
                  {/* QUESTION HEADER */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--neon-cyan)', fontSize: 'var(--text-sm)' }}>
                        Q{index + 1}.
                      </span>
                      {mcq.question_text && (
                        <h4 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, lineHeight: 1.4 }}>
                          {mcq.question_text}
                        </h4>
                      )}
                      {isMultiCorrect ? (
                        <span style={{ fontSize: '11px', background: 'rgba(57, 255, 20, 0.15)', color: 'var(--neon-lime)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(57, 255, 20, 0.3)', fontWeight: 'bold' }}>
                          ☑️ Multi-Correct
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', background: 'rgba(0, 229, 255, 0.12)', color: 'var(--neon-cyan)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(0, 229, 255, 0.3)', fontWeight: 'bold' }}>
                          🔘 Single Choice
                        </span>
                      )}
                    </div>

                    {/* TRAINER ACTIONS */}
                    {isStaff && (
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button 
                          onClick={() => {
                            setEditingMcq(mcq);
                            setIsModalOpen(true);
                          }}
                          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'var(--neon-cyan)', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                          title="Edit MCQ"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteMcq(mcq.id)}
                          style={{ background: 'rgba(255, 69, 58, 0.1)', border: 'none', color: '#ff4d4f', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                          title="Delete MCQ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* QUESTION IMAGE / DIAGRAM */}
                  {mcq.question_image_url && (
                    <div style={{ marginBottom: 'var(--space-md)', textAlign: 'center' }}>
                      <img 
                        src={mcq.question_image_url} 
                        alt={`Question ${index + 1}`}
                        style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: 'var(--radius-sm)', objectFit: 'contain' }}
                      />
                    </div>
                  )}

                  {/* OPTIONS LIST */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
                    {[
                      { key: 'A', text: mcq.option_a },
                      { key: 'B', text: mcq.option_b },
                      { key: 'C', text: mcq.option_c },
                      { key: 'D', text: mcq.option_d },
                    ].map(opt => {
                      const isSelected = selectedKeys.includes(opt.key);
                      const isStaffCorrect = isStaff && staffCorrectList.includes(opt.key);
                      const isResultCorrectOption = res && resultCorrectList.includes(opt.key);
                      const isUserIncorrect = res && isSelected && !isResultCorrectOption;

                      let borderColor = 'var(--glass-border)';
                      let bgColor = 'rgba(255,255,255,0.02)';
                      let textColor = 'inherit';

                      if (isSelected) {
                        borderColor = 'var(--neon-cyan)';
                        bgColor = 'rgba(0, 229, 255, 0.1)';
                      }

                      if (res) {
                        if (isResultCorrectOption) {
                          borderColor = 'var(--neon-lime)';
                          bgColor = 'rgba(57, 255, 20, 0.15)';
                          textColor = 'var(--neon-lime)';
                        } else if (isUserIncorrect) {
                          borderColor = '#ff453a';
                          bgColor = 'rgba(255, 69, 58, 0.15)';
                          textColor = '#ff4d4f';
                        }
                      } else if (isStaff && isStaffCorrect) {
                        borderColor = 'var(--neon-gold)';
                        bgColor = 'rgba(255, 215, 0, 0.08)';
                      }

                      return (
                        <div
                          key={opt.key}
                          onClick={() => !submissionResult && handleToggleOption(mcq.id, opt.key)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${borderColor}`,
                            background: bgColor,
                            color: textColor,
                            cursor: submissionResult ? 'default' : 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div 
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: 'var(--radius-sm)',
                              border: `2px solid ${isSelected ? 'var(--neon-cyan)' : 'var(--glass-border)'}`,
                              background: isSelected ? 'var(--neon-cyan)' : 'transparent',
                              color: isSelected ? '#000' : 'inherit',
                              fontWeight: 'bold',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {opt.key}
                          </div>

                          <span style={{ fontSize: 'var(--text-sm)', flex: 1, wordBreak: 'break-word' }}>
                            {opt.text}
                          </span>

                          {/* Result Indicators */}
                          {res && isResultCorrectOption && <CheckCircle size={16} style={{ color: 'var(--neon-lime)' }} />}
                          {res && isUserIncorrect && <XCircle size={16} style={{ color: '#ff4d4f' }} />}
                          {!res && isStaff && isStaffCorrect && <span style={{ fontSize: '10px', color: 'var(--neon-gold)', fontWeight: 'bold' }}>Correct Answer</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SUBMIT / RE-ATTEMPT CONTROLS FOR STUDENTS */}
          <div style={{ marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div>
              {!submissionResult && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Answered {Object.keys(userAnswers).length} of {mcqs.length} questions
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              {!submissionResult ? (
                <Button 
                  variant="primary" 
                  onClick={handleSubmitQuiz} 
                  isLoading={isSubmitting}
                  disabled={isSubmitting || Object.keys(userAnswers).length === 0}
                  style={{ padding: '10px 24px', fontWeight: 'bold' }}
                >
                  Submit Quiz
                </Button>
              ) : (
                <Button variant="secondary" onClick={handleReattempt}>
                  <RotateCcw size={16} /> Re-attempt Quiz
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MCQ MODAL */}
      <CreateMcqModal 
        courseId={courseId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMcq(null);
        }}
        onSuccess={() => {
          loadData();
        }}
        editingMcq={editingMcq}
      />
    </Card>
  );
}
