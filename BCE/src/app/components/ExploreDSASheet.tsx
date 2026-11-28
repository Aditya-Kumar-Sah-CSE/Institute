'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { 
  X, Code, FileText, Users, Star,
  PlayCircle, Loader2, Lock, ArrowRight,
  Trophy, CheckCircle, AlertCircle, Flame
} from 'lucide-react';
import { getExploreSheetDetails, getExploreSheetProblemsPage } from './LandingPreviewActions';
import ExplorePaginationBar from './ExplorePaginationBar';
import './ExploreSheet.css';

const PAGE_SIZE = 10;

type TabType = 'problems' | 'overview' | 'solvers' | 'feedback' | 'students';

interface ExploreDSASheetProps {
  sheetId: string | null;
  onClose: () => void;
}

export default function ExploreDSASheet({ sheetId, onClose }: ExploreDSASheetProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('problems');
  const [data, setData] = useState<any>(null);
  const [problems, setProblems] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
  const pageCacheRef = useRef<Record<number, any[]>>({});
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!sheetId) return;

    let isCancelled = false;
    setLoading(true);
    setPageLoading(false);
    setError(null);
    setActiveTab('problems');
    pageCacheRef.current = {};

    getExploreSheetDetails(sheetId, 1, PAGE_SIZE)
      .then(res => {
        if (isCancelled) return;
        if (res.error || !res.data) {
          setError(res.error || 'Failed to load sheet details');
        } else {
          setData(res.data);
          const firstProblems = res.data.problems || [];
          const pg = res.data.pagination || {
            page: 1,
            pageSize: PAGE_SIZE,
            total: res.data.difficultyStats?.Total ?? firstProblems.length,
            totalPages: Math.max(1, Math.ceil((res.data.difficultyStats?.Total ?? firstProblems.length) / PAGE_SIZE)),
          };
          setProblems(firstProblems);
          setPagination(pg);
          pageCacheRef.current[1] = firstProblems;
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
  }, [sheetId]);

  const handlePageChange = async (nextPage: number) => {
    if (!sheetId || pageLoading || nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.page) {
      return;
    }

    if (pageCacheRef.current[nextPage]) {
      setProblems(pageCacheRef.current[nextPage]);
      setPagination((prev) => ({ ...prev, page: nextPage }));
      bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setPageLoading(true);
    try {
      const res = await getExploreSheetProblemsPage(sheetId, nextPage, PAGE_SIZE);
      if (res.data) {
        const nextList = res.data.problems || [];
        pageCacheRef.current[nextPage] = nextList;
        setProblems(nextList);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        } else {
          setPagination((prev) => ({ ...prev, page: nextPage }));
        }
        bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      // Keep current page visible on transient network error
    }
    setPageLoading(false);
  };

  // Lock background scroll when open
  useEffect(() => {
    if (!sheetId) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [sheetId]);

  if (!mounted || !sheetId) return null;

  const sheet = data?.sheet;
  const difficultyStats = data?.difficultyStats || { Easy: 0, Medium: 0, Hard: 0, Total: 0 };
  const totalProblems = pagination.total || difficultyStats.Total || problems.length;
  const solvers = data?.solvers || [];
  const students = data?.students || { total: 0, sample: [] };
  const reviews = data?.reviews || { averageRating: 0, totalReviews: 0, items: [] };

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'problems', label: 'Problems', icon: <Code size={14} />, count: totalProblems },
    { id: 'overview', label: 'Overview', icon: <FileText size={14} /> },
    { id: 'solvers', label: 'Top Solvers', icon: <Trophy size={14} />, count: solvers.length },
    { id: 'feedback', label: 'Reviews', icon: <Star size={14} />, count: reviews.totalReviews },
    { id: 'students', label: 'Learners', icon: <Users size={14} />, count: students.total },
  ];

  const getDifficultyBadge = (diff: string) => {
    const d = (diff || 'Easy').toLowerCase();
    if (d === 'hard') {
      return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
    }
    if (d === 'medium') {
      return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
    }
    return { bg: 'rgba(52, 211, 153, 0.15)', text: '#34d399', border: 'rgba(52, 211, 153, 0.3)' };
  };

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
                background: 'rgba(6, 182, 212, 0.12)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                color: '#06b6d4',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                DSA {sheet?.sheet_type === 'SQL' ? '• SQL + MCQ Sheet' : sheet?.sheet_type === 'APTITUDE' ? '• Aptitude Mastery Sheet' : sheet?.sheet_type === 'TCS_PREP' ? '• TCS Prep + 13 Mocks' : sheet?.sheet_type === 'ROADMAP' ? '• Levels 1–5 Roadmap' : 'Practice Sheet'}
              </span>
              {sheet?.enrollment_access && (
                <span style={{
                  background: sheet.enrollment_access === 'restricted' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                  color: sheet.enrollment_access === 'restricted' ? '#fbbf24' : '#34d399',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {sheet.enrollment_access.toUpperCase()}
                </span>
              )}
            </div>
            <h2 style={{
              color: '#f8fafc',
              fontSize: '1.25rem',
              fontWeight: 800,
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {sheet?.title || 'Loading Sheet...'}
            </h2>
            {sheet?.creatorName && (
              <p style={{ color: '#06b6d4', fontSize: '0.8rem', fontWeight: 600, marginTop: '2px' }}>
                Curated by {sheet.creatorName}
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
        <div className="explore-sheet-body" ref={bodyRef}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', gap: '1rem' }}>
              <Loader2 className="animate-spin" size={36} color="#06b6d4" />
              <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem' }}>Fetching DSA problems & stats...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertCircle size={32} color="#f87171" style={{ margin: '0 auto 8px' }} />
              <p style={{ color: '#f87171', fontWeight: 600 }}>{error}</p>
            </div>
          ) : (
            <>
              {/* TAB: PROBLEMS */}
              {activeTab === 'problems' && (
                <div>
                  {/* Difficulty stats overview banner */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                    marginBottom: '16px',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>{difficultyStats.Total}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)' }}>Total</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399' }}>{difficultyStats.Easy}</div>
                      <div style={{ fontSize: '0.72rem', color: '#34d399' }}>Easy</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24' }}>{difficultyStats.Medium}</div>
                      <div style={{ fontSize: '0.72rem', color: '#fbbf24' }}>Medium</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f87171' }}>{difficultyStats.Hard}</div>
                      <div style={{ fontSize: '0.72rem', color: '#f87171' }}>Hard</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                      Curated Questions ({totalProblems})
                    </h3>
                    {pageLoading && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#06b6d4', fontWeight: 600 }}>
                        <Loader2 className="animate-spin" size={14} /> Loading page...
                      </span>
                    )}
                  </div>

                  {problems.length === 0 ? (
                    <div className="explore-card-item" style={{ textAlign: 'center', padding: '2rem' }}>
                      <Code size={30} color="#64748b" style={{ margin: '0 auto 8px' }} />
                      <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem' }}>Problems will be added soon.</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: pageLoading ? 0.55 : 1, transition: 'opacity 0.15s ease' }}>
                        {problems.map((prob: any, idx: number) => {
                          const badge = getDifficultyBadge(prob.difficulty);
                          const displayIndex = (pagination.page - 1) * pagination.pageSize + idx + 1;
                          return (
                            <div key={prob.id || idx} className="explore-card-item" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                minWidth: '30px',
                                height: '28px',
                                padding: '0 6px',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: 'var(--text-secondary, #94a3b8)',
                                flexShrink: 0
                              }}>
                                {displayIndex}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.3 }}>
                                    {prob.title || 'Untitled Problem'}
                                  </h4>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '6px',
                                    background: badge.bg,
                                    color: badge.text,
                                    border: `1px solid ${badge.border}`
                                  }}>
                                    {prob.difficulty || 'Easy'}
                                  </span>
                                  {prob.external_platform && (
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      padding: '1px 6px',
                                      borderRadius: '6px',
                                      background: 'rgba(255, 255, 255, 0.06)',
                                      color: 'var(--text-secondary, #94a3b8)'
                                    }}>
                                      {prob.external_platform}
                                    </span>
                                  )}
                                  {Array.isArray(prob.tags) && prob.tags.slice(0, 2).map((t: string, i: number) => (
                                    <span key={i} style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div style={{ flexShrink: 0 }}>
                                <span title="Login to solve">
                                  <Lock size={14} color="#64748b" />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <ExplorePaginationBar
                        page={pagination.page}
                        pageSize={pagination.pageSize}
                        total={pagination.total}
                        totalPages={pagination.totalPages}
                        loading={pageLoading}
                        itemLabel="problems"
                        onPageChange={handlePageChange}
                      />
                    </>
                  )}
                </div>
              )}

              {/* TAB: OVERVIEW */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="explore-card-item">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Description</h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                      {sheet?.description || 'Curated programming challenges designed to boost problem solving skills.'}
                    </p>
                  </div>

                  {sheet?.youtube_url && (
                    <div className="explore-card-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <PlayCircle size={18} color="#f87171" />
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Video Walkthrough Available</h3>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)' }}>
                        Detailed video solutions and pattern walkthroughs are included with this sheet.
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    <div className="explore-card-item" style={{ textAlign: 'center', padding: '12px' }}>
                      <Code size={20} color="#06b6d4" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{totalProblems}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>Problems</div>
                    </div>
                    <div className="explore-card-item" style={{ textAlign: 'center', padding: '12px' }}>
                      <Users size={20} color="#34d399" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{students.total}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>Practicing</div>
                    </div>
                    <div className="explore-card-item" style={{ textAlign: 'center', padding: '12px' }}>
                      <Star size={20} color="#f59e0b" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                        {reviews.averageRating > 0 ? reviews.averageRating : 'New'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>({reviews.totalReviews} reviews)</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: TOP SOLVERS */}
              {activeTab === 'solvers' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Trophy size={16} color="#fbbf24" /> Top Solvers Leaderboard
                    </h3>
                  </div>

                  {solvers.length === 0 ? (
                    <div className="explore-card-item" style={{ textAlign: 'center', padding: '2.5rem' }}>
                      <Flame size={32} color="#64748b" style={{ margin: '0 auto 8px' }} />
                      <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>Be the first solver!</h4>
                      <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem', marginTop: '4px' }}>
                        Solve problems from this sheet to earn your spot on the leaderboard.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {solvers.map((s: any, idx: number) => {
                        const isTop3 = idx < 3;
                        const rankColors = ['#fbbf24', '#cbd5e1', '#d97706'];
                        return (
                          <div key={idx} className="explore-card-item" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              background: isTop3 ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                              color: isTop3 ? rankColors[idx] : 'var(--text-secondary, #94a3b8)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '12px'
                            }}>
                              #{idx + 1}
                            </div>
                            {s.avatarUrl ? (
                              <img src={s.avatarUrl} alt={s.name} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: '#06b6d4',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '13px',
                                color: '#fff'
                              }}>
                                {(s.name || 'C')[0].toUpperCase()}
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.name}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399', fontWeight: 800, fontSize: '0.85rem' }}>
                              <CheckCircle size={14} />
                              <span>{s.solvedCount} Solved</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: REVIEWS / FEEDBACK */}
              {activeTab === 'feedback' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                        {reviews.totalReviews} total reviews
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                      Coder Feedback ({reviews.items.length})
                    </h3>
                    {reviews.items.length === 0 ? (
                      <div className="explore-card-item" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>No reviews yet.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {reviews.items.map((r: any) => (
                          <div key={r.id} className="explore-card-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{r.authorName}</span>
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

              {/* TAB: LEARNERS */}
              {activeTab === 'students' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                      Practicing Coders ({students.total})
                    </h3>
                  </div>

                  {students.sample.length === 0 ? (
                    <div className="explore-card-item" style={{ textAlign: 'center', padding: '2rem' }}>
                      <Users size={30} color="#64748b" style={{ margin: '0 auto 8px' }} />
                      <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem' }}>Be the first coder to practice this sheet!</p>
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
                              background: 'rgba(6, 182, 212, 0.25)',
                              border: '1px solid rgba(6, 182, 212, 0.4)',
                              color: '#06b6d4',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '13px'
                            }}>
                              {(stu.name || 'C')[0].toUpperCase()}
                            </div>
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {stu.name}
                            </div>
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
              <span>Login to Practice & Submit Code</span>
              <ArrowRight size={16} />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
