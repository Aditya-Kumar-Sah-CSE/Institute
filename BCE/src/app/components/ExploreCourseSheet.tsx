'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { 
  X, BookOpen, FileText, MessageSquare, HelpCircle, 
  CheckCircle2, Users, Star, Award, Layers, Calendar, 
  Vote, ThumbsUp, Loader2, Lock, ArrowRight, PlayCircle,
  Clock, Tag, Sparkles, ChevronRight, AlertCircle
} from 'lucide-react';
import { getExploreCourseDetails } from './LandingPreviewActions';
import './ExploreSheet.css';

type TabType = 'curriculum' | 'details' | 'interactions' | 'doubts' | 'mcq' | 'feedback' | 'students';

interface ExploreCourseSheetProps {
  courseId: string | null;
  onClose: () => void;
}

export default function ExploreCourseSheet({ courseId, onClose }: ExploreCourseSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('curriculum');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!courseId) return;

    let isCancelled = false;
    setLoading(true);
    setError(null);
    setActiveTab('curriculum');

    getExploreCourseDetails(courseId)
      .then(res => {
        if (isCancelled) return;
        if (res.error || !res.data) {
          setError(res.error || 'Failed to load course details');
        } else {
          setData(res.data);
        }
      })
      .catch(err => {
        if (!isCancelled) setError(err?.message || 'Failed to load');
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [courseId]);

  // Lock background scroll when open
  useEffect(() => {
    if (!courseId) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [courseId]);

  if (!mounted || !courseId) return null;

  const course = data?.course;
  const curriculum = data?.curriculum || [];
  const assignments = data?.assignments || [];
  const notices = data?.notices || [];
  const polls = data?.polls || [];
  const doubts = data?.doubts || { total: 0, items: [] };
  const students = data?.students || { total: 0, sample: [] };
  const reviews = data?.reviews || { averageRating: 0, totalReviews: 0, ratingDistribution: {}, items: [] };

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'curriculum', label: 'Curriculum', icon: <BookOpen size={14} />, count: curriculum.length },
    { id: 'details', label: 'Overview', icon: <FileText size={14} /> },
    { id: 'interactions', label: 'Notices & Polls', icon: <Vote size={14} />, count: notices.length + polls.length },
    { id: 'doubts', label: 'Doubts', icon: <HelpCircle size={14} />, count: doubts.total },
    { id: 'mcq', label: 'MCQs & Quizzes', icon: <Award size={14} />, count: assignments.length },
    { id: 'feedback', label: 'Reviews', icon: <Star size={14} />, count: reviews.totalReviews },
    { id: 'students', label: 'Students', icon: <Users size={14} />, count: students.total },
  ];

  const content = (
    <div 
      className="explore-sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="explore-sheet-panel" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="explore-sheet-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                color: '#00f0ff',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                Course Preview
              </span>
              {course?.difficulty && (
                <span style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-secondary, #94a3b8)',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {course.difficulty}
                </span>
              )}
            </div>
            <h2 style={{
              color: 'var(--text-primary, #fff)',
              fontSize: '1.25rem',
              fontWeight: 800,
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {course?.title || 'Loading Course...'}
            </h2>
            {course?.profiles?.name && (
              <p style={{ color: '#818cf8', fontSize: '0.8rem', fontWeight: 600, marginTop: '2px' }}>
                By {course.profiles.name}
              </p>
            )}
          </div>
          <button 
            type="button" 
            className="explore-sheet-close-btn"
            onClick={onClose}
            aria-label="Close explore modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="explore-sheet-tabs-nav">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`explore-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span style={{
                    background: isActive ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                    color: isActive ? '#00f0ff' : 'var(--text-muted, #64748b)',
                    fontSize: '10.5px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontWeight: 700
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="explore-sheet-body">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', gap: '1rem' }}>
              <Loader2 className="animate-spin" size={36} color="#00f0ff" />
              <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem' }}>Fetching course modules & interactions...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertCircle size={32} color="#f87171" style={{ margin: '0 auto 8px' }} />
              <p style={{ color: '#f87171', fontWeight: 600 }}>{error}</p>
            </div>
          ) : (
            <>
              {/* TAB: CURRICULUM */}
              {activeTab === 'curriculum' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                      Course Curriculum ({curriculum.length} Lessons)
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#00f0ff', fontWeight: 600 }}>
                      ⚡ {course?.total_xp || (curriculum.reduce((s: number, c: any) => s + (c.xpReward || 0), 0))} XP Total
                    </span>
                  </div>

                  {curriculum.length === 0 ? (
                    <div className="explore-card-item" style={{ textAlign: 'center', padding: '2rem' }}>
                      <BookOpen size={28} color="#64748b" style={{ margin: '0 auto 8px' }} />
                      <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem' }}>Curriculum outline will be published soon.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {curriculum.map((lesson: any, idx: number) => (
                        <div key={lesson.id} className="explore-card-item" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: 'rgba(0, 240, 255, 0.1)',
                            border: '1px solid rgba(0, 240, 255, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#00f0ff',
                            fontSize: '12px',
                            fontWeight: 800,
                            flexShrink: 0
                          }}>
                            {idx + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary, #fff)', lineHeight: 1.3 }}>
                                {lesson.title}
                              </h4>
                              {lesson.xpReward > 0 && (
                                <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, background: 'rgba(251, 191, 36, 0.1)', padding: '2px 8px', borderRadius: '10px', flexShrink: 0 }}>
                                  +{lesson.xpReward} XP
                                </span>
                              )}
                            </div>
                            {lesson.notes && (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', marginTop: '4px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {lesson.notes}
                              </p>
                            )}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                              {lesson.hasVideo && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#06b6d4' }}>
                                  <PlayCircle size={12} /> Video Lecture
                                </span>
                              )}
                              {lesson.hasPdf && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#818cf8' }}>
                                  <FileText size={12} /> Study Notes
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: DETAILS */}
              {activeTab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Summary card */}
                  <div className="explore-card-item">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>About this Course</h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                      {course?.description || 'No detailed description provided.'}
                    </p>

                    {course?.tags && course.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
                        {course.tags.map((tag: string, i: number) => (
                          <span key={i} style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '3px 10px',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary, #94a3b8)'
                          }}>
                            <Tag size={11} /> {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Highlights Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    <div className="explore-card-item" style={{ textAlign: 'center', padding: '12px' }}>
                      <Layers size={20} color="#00f0ff" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{course?.lesson_count || curriculum.length}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>Modules</div>
                    </div>
                    <div className="explore-card-item" style={{ textAlign: 'center', padding: '12px' }}>
                      <Award size={20} color="#fbbf24" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{course?.total_xp || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>XP Points</div>
                    </div>
                    <div className="explore-card-item" style={{ textAlign: 'center', padding: '12px' }}>
                      <Users size={20} color="#34d399" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{students.total}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>Students</div>
                    </div>
                    <div className="explore-card-item" style={{ textAlign: 'center', padding: '12px' }}>
                      <Star size={20} color="#f59e0b" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                        {reviews.averageRating > 0 ? reviews.averageRating : 'New'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>({reviews.totalReviews} reviews)</div>
                    </div>
                  </div>

                  {/* Instructor Bio */}
                  <div className="explore-card-item">
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>Instructors</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {course?.profiles?.avatar_url ? (
                        <img 
                          src={course.profiles.avatar_url} 
                          alt={course.profiles.name || 'Instructor'} 
                          style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(0, 240, 255, 0.4)' }}
                        />
                      ) : (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '18px'
                        }}>
                          {(course?.profiles?.name || 'I')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{course?.profiles?.name || 'Lead Instructor'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#00f0ff', fontWeight: 500 }}>Lead Course Instructor</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: INTERACTIONS (Notices & Polls) */}
              {activeTab === 'interactions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Course Notices */}
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={16} color="#00f0ff" /> Course Notices & Updates ({notices.length})
                    </h3>
                    {notices.length === 0 ? (
                      <div className="explore-card-item" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>No notices published yet.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {notices.map((n: any) => (
                          <div key={n.id} className="explore-card-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#00f0ff' }}>{n.title}</h4>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                                {new Date(n.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                              {n.content}
                            </p>
                            <span style={{ fontSize: '0.75rem', color: '#818cf8', marginTop: '6px', display: 'inline-block' }}>
                              Posted by {n.authorName}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Course Polls */}
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Vote size={16} color="#fbbf24" /> Active & Past Polls ({polls.length})
                    </h3>
                    {polls.length === 0 ? (
                      <div className="explore-card-item" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>No polls conducted yet.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {polls.map((p: any) => (
                          <div key={p.id} className="explore-card-item">
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{p.question}</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {p.options.map((opt: any) => (
                                <div key={opt.id} style={{
                                  background: 'rgba(255, 255, 255, 0.04)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.82rem',
                                  color: 'var(--text-secondary, #cbd5e1)'
                                }}>
                                  • {opt.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: DOUBTS */}
              {activeTab === 'doubts' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                      Community Doubts ({doubts.total})
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                      Student Questions & Solutions
                    </span>
                  </div>

                  {doubts.items.length === 0 ? (
                    <div className="explore-card-item" style={{ textAlign: 'center', padding: '2.5rem' }}>
                      <HelpCircle size={32} color="#64748b" style={{ margin: '0 auto 8px' }} />
                      <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>No doubts asked yet</h4>
                      <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem', marginTop: '4px' }}>
                        Enrolled students can ask questions directly to instructors here.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {doubts.items.map((d: any) => (
                        <div key={d.id} className="explore-card-item">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary, #fff)', lineHeight: 1.3 }}>
                              {d.title}
                            </h4>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: d.status === 'resolved' || d.status === 'answered' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                              color: d.status === 'resolved' || d.status === 'answered' ? '#34d399' : '#fbbf24',
                              flexShrink: 0
                            }}>
                              {d.status?.toUpperCase() || 'OPEN'}
                            </span>
                          </div>
                          {d.description && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)', marginTop: '4px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {d.description}
                            </p>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                            <span>Asked by {d.authorName}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00f0ff' }}>
                              <ThumbsUp size={12} /> {d.likesCount}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: MCQs & Quizzes */}
              {activeTab === 'mcq' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                      Assignments & MCQs ({assignments.length})
                    </h3>
                  </div>

                  {assignments.length === 0 ? (
                    <div className="explore-card-item" style={{ textAlign: 'center', padding: '2.5rem' }}>
                      <Award size={32} color="#64748b" style={{ margin: '0 auto 8px' }} />
                      <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>No assignments published yet</h4>
                      <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem', marginTop: '4px' }}>
                        Hands-on quizzes, coding tasks, and homework will be available once enrolled.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {assignments.map((a: any, idx: number) => (
                        <div key={a.id} className="explore-card-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: '#00f0ff',
                                background: 'rgba(0, 240, 255, 0.1)',
                                padding: '1px 6px',
                                borderRadius: '8px'
                              }}>
                                {a.type || 'QUIZ'}
                              </span>
                              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {a.title}
                              </h4>
                            </div>
                            {a.description && (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {a.description}
                              </p>
                            )}
                          </div>
                          {a.xpReward > 0 && (
                            <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 800, background: 'rgba(251, 191, 36, 0.1)', padding: '4px 10px', borderRadius: '12px', flexShrink: 0 }}>
                              +{a.xpReward} XP
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: REVIEWS / FEEDBACK */}
              {activeTab === 'feedback' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Rating summary */}
                  <div className="explore-card-item" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '18px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fbbf24', lineHeight: 1 }}>
                        {reviews.averageRating > 0 ? reviews.averageRating : '—'}
                      </div>
                      <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '6px' }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star 
                            key={s} 
                            size={14} 
                            fill={s <= Math.round(reviews.averageRating) ? '#fbbf24' : 'transparent'} 
                            color="#fbbf24" 
                          />
                        ))}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
                        {reviews.totalReviews} total ratings
                      </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviews.ratingDistribution?.[star] || 0;
                        const pct = reviews.totalReviews > 0 ? (count / reviews.totalReviews) * 100 : 0;
                        return (
                          <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                            <span style={{ width: '18px', textAlign: 'right' }}>{star}★</span>
                            <div style={{ flex: 1, height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#fbbf24', borderRadius: '3px' }} />
                            </div>
                            <span style={{ width: '24px', fontSize: '0.7rem' }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reviews List */}
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                      Student Testimonials ({reviews.items.length})
                    </h3>
                    {reviews.items.length === 0 ? (
                      <div className="explore-card-item" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>No student reviews written yet.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {reviews.items.map((r: any) => (
                          <div key={r.id} className="explore-card-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  background: '#06b6d4',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: '#fff'
                                }}>
                                  {r.authorName[0]?.toUpperCase() || 'S'}
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{r.authorName}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '2px' }}>
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} size={11} fill={s <= r.rating ? '#fbbf24' : 'transparent'} color="#fbbf24" />
                                ))}
                              </div>
                            </div>
                            <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.4 }}>
                              {r.reviewText}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: STUDENTS */}
              {activeTab === 'students' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                      Enrolled Learners ({students.total})
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#00f0ff', fontWeight: 600 }}>Active batch</span>
                  </div>

                  {students.sample.length === 0 ? (
                    <div className="explore-card-item" style={{ textAlign: 'center', padding: '2rem' }}>
                      <Users size={30} color="#64748b" style={{ margin: '0 auto 8px' }} />
                      <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>Be the first student to enroll in this course!</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                      {students.sample.map((stu: any) => (
                        <div key={stu.id} className="explore-card-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px' }}>
                          {stu.avatarUrl ? (
                            <img src={stu.avatarUrl} alt={stu.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'rgba(99, 102, 241, 0.25)',
                              border: '1px solid rgba(99, 102, 241, 0.4)',
                              color: '#a5b4fc',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '13px'
                            }}>
                              {(stu.name || 'S')[0].toUpperCase()}
                            </div>
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {stu.name}
                            </div>
                            {stu.instituteId && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {stu.instituteId}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="explore-sheet-footer">
          <Link href="/login" style={{ width: '100%', textDecoration: 'none' }}>
            <button type="button" className="explore-action-cta">
              <Lock size={16} />
              <span>Login to Enroll & Access Full Content</span>
              <ArrowRight size={16} />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

