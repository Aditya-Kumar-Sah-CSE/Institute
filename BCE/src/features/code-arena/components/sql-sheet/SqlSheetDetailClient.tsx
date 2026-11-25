'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Database,
  FileText,
  Flame,
  Layers,
  Lock,
  Play,
  Search,
  Share2,
  Sparkles,
  Star,
  Terminal,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import UserAvatar from '@/components/shared/UserAvatar';
import CertificateRenderer from '../CertificateRenderer';
import SheetReviewsSection from '../SheetReviewsSection';
import SqlMcqCard from './SqlMcqCard';
import SqlQueryWorkspace from './SqlQueryWorkspace';
import { CheatSheetView, PracticeTablesView, QuizSessionView } from './SqlReferenceViews';
import type {
  SqlSheetQuestion,
  SqlQuestionProgress,
} from '@/features/code-arena/data/sqlSheetReference';
import '@/features/code-arena/components/CodeArena.css';
import './SqlSheet.css';

interface LeaderboardRow {
  userId: string;
  name: string;
  avatar_url: string | null;
  solvedCount: number;
  isCurrentUser?: boolean;
}

interface EnrolledUserRow {
  user_id: string;
  enrolled_at: string;
  name: string;
  avatar_url: string | null;
}

interface SqlSheetDetailClientProps {
  sheet: {
    id: string;
    slug?: string;
    title: string;
    description: string | null;
    created_by: string;
    created_at: string;
    enrollment_access?: string;
    sheet_type?: string;
    metadata?: any;
  };
  questions: SqlSheetQuestion[];
  initialProgress: SqlQuestionProgress[];
  totalEnrolledCount?: number;
  enrolledUsersList?: EnrolledUserRow[];
  totalSolversCount?: number;
  leaderboardList?: LeaderboardRow[];
  initialCertificate?: any;
  reviewsData?: {
    reviews: any[];
    userReview: any | null;
    stats: {
      averageRating: number;
      totalReviews: number;
      breakdown: { 5: number; 4: number; 3: number; 2: number; 1: number };
    };
  };
  currentUserId?: string;
  isInstructor?: boolean;
  isPublicPreview?: boolean;
}

type MainTab = 'arena' | 'quiz' | 'tables' | 'cheatsheet';
const PAGE_SIZE = 15;

export default function SqlSheetDetailClient({
  sheet,
  questions,
  initialProgress,
  totalEnrolledCount = 0,
  enrolledUsersList = [],
  totalSolversCount = 0,
  leaderboardList = [],
  initialCertificate = null,
  reviewsData,
  currentUserId,
  isInstructor = false,
  isPublicPreview = false,
}: SqlSheetDetailClientProps) {
  const [activeTab, setActiveTab] = useState<MainTab>('arena');

  // Progress state map keyed by question_number
  const [progressMap, setProgressMap] = useState<Record<number, SqlQuestionProgress>>(() => {
    const map: Record<number, SqlQuestionProgress> = {};
    (initialProgress || []).forEach((p) => {
      map[p.question_number] = p;
    });
    return map;
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MCQ' | 'QUERY'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SOLVED' | 'UNSOLVED' | 'BOOKMARKED'>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Workbench focus state (null = list view; number = focused question_number)
  const [activeQNum, setActiveQNum] = useState<number | null>(null);
  const [jumpInput, setJumpInput] = useState<string>('');
  const [lastPracticedQ, setLastPracticedQ] = useState<number | null>(null);

  // Share, Modals, Certificate
  const [copiedShare, setCopiedShare] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showEnrolledModal, setShowEnrolledModal] = useState(false);
  const [certificate, setCertificate] = useState<any>(initialCertificate);
  const [claimingCert, setClaimingCert] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);

  const storageKey = `smartlearn_last_sql_q_${sheet.id}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const num = parseInt(saved, 10);
        if (!Number.isNaN(num) && num >= 1 && num <= questions.length) {
          setLastPracticedQ(num);
        }
      }
    } catch {
      // ignore localStorage access failure
    }
  }, [storageKey, questions.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, statusFilter, difficultyFilter, sectionFilter]);

  // Distinct ordered sections
  const { mcqSections, querySections } = useMemo(() => {
    const mcqSet = new Set<string>();
    const querySet = new Set<string>();
    questions.forEach((q) => {
      if (q.type === 'MCQ') mcqSet.add(q.section);
      else querySet.add(q.section);
    });
    return {
      mcqSections: Array.from(mcqSet),
      querySections: Array.from(querySet),
    };
  }, [questions]);

  // Aggregate counts
  const stats = useMemo(() => {
    let mcqTotal = 0;
    let queryTotal = 0;
    let solvedTotal = 0;
    let solvedMcq = 0;
    let solvedQuery = 0;
    let bookmarkedCount = 0;

    questions.forEach((q) => {
      if (q.type === 'MCQ') mcqTotal++;
      else queryTotal++;
      const p = progressMap[q.question_number];
      if (p?.is_solved) {
        solvedTotal++;
        if (q.type === 'MCQ') solvedMcq++;
        else solvedQuery++;
      }
      if (p?.is_bookmarked) bookmarkedCount++;
    });

    const pct = questions.length > 0 ? Math.round((solvedTotal / questions.length) * 100) : 0;
    return { mcqTotal, queryTotal, solvedTotal, solvedMcq, solvedQuery, bookmarkedCount, pct };
  }, [questions, progressMap]);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    const qText = searchQuery.trim().toLowerCase();
    return questions.filter((item) => {
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
      if (difficultyFilter !== 'ALL' && item.difficulty !== difficultyFilter) return false;
      if (sectionFilter !== 'ALL' && item.section !== sectionFilter) return false;

      const prog = progressMap[item.question_number];
      if (statusFilter === 'SOLVED' && !prog?.is_solved) return false;
      if (statusFilter === 'UNSOLVED' && prog?.is_solved) return false;
      if (statusFilter === 'BOOKMARKED' && !prog?.is_bookmarked) return false;

      if (qText) {
        const cleanNumQuery = qText.replace(/^q/i, '');
        const numMatch = /^\d+$/.test(cleanNumQuery) && String(item.question_number) === cleanNumQuery;
        const textMatch =
          item.question.toLowerCase().includes(qText) ||
          item.section.toLowerCase().includes(qText) ||
          (item.solution_sql && item.solution_sql.toLowerCase().includes(qText));
        if (!numMatch && !textMatch) return false;
      }
      return true;
    });
  }, [questions, progressMap, typeFilter, difficultyFilter, sectionFilter, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedQuestions = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredQuestions.slice(start, start + PAGE_SIZE);
  }, [filteredQuestions, safePage]);

  const openQuestion = (qNum: number) => {
    setActiveQNum(qNum);
    setActiveTab('arena');
    setLastPracticedQ(qNum);
    try {
      localStorage.setItem(storageKey, String(qNum));
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Persist Answer / SQL Solve
  const handleSaveProgress = async (payload: {
    questionNumber: number;
    questionType: 'MCQ' | 'QUERY';
    isSolved: boolean;
    selectedOption?: string;
    submittedSql?: string;
  }) => {
    // Optimistic update locally
    setProgressMap((prev) => {
      const existing = prev[payload.questionNumber];
      return {
        ...prev,
        [payload.questionNumber]: {
          question_number: payload.questionNumber,
          question_type: payload.questionType,
          is_solved: existing?.is_solved ? true : payload.isSolved,
          is_bookmarked: Boolean(existing?.is_bookmarked),
          selected_option: payload.selectedOption ?? existing?.selected_option ?? null,
          submitted_sql: payload.submittedSql ?? existing?.submitted_sql ?? null,
          attempts: (existing?.attempts || 0) + 1,
          xp_awarded: existing?.xp_awarded || 0,
        },
      };
    });

    if (isPublicPreview || !currentUserId) return;

    try {
      const res = await fetch(`/api/coding/sheets/${sheet.id}/sql-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setProgressMap((prev) => ({
          ...prev,
          [payload.questionNumber]: json.data,
        }));
        return { xpAwarded: json.xpAwarded || 0 };
      }
    } catch (err) {
      console.error('Failed to persist SQL progress:', err);
    }
  };

  const handleToggleBookmark = async (
    questionNumber: number,
    questionType: 'MCQ' | 'QUERY',
    nextState: boolean
  ) => {
    setProgressMap((prev) => {
      const existing = prev[questionNumber];
      return {
        ...prev,
        [questionNumber]: {
          question_number: questionNumber,
          question_type: questionType,
          is_solved: existing?.is_solved ?? false,
          is_bookmarked: nextState,
          selected_option: existing?.selected_option ?? null,
          submitted_sql: existing?.submitted_sql ?? null,
          attempts: existing?.attempts ?? 0,
        },
      };
    });

    if (isPublicPreview || !currentUserId) return;

    try {
      await fetch(`/api/coding/sheets/${sheet.id}/sql-progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionNumber, questionType, isBookmarked: nextState }),
      });
    } catch (err) {
      console.error('Bookmark error:', err);
    }
  };

  const handleCopyShareLink = () => {
    const sharePath = `/share/sheet/${sheet.slug || sheet.id}`;
    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${sharePath}` : sharePath;
    navigator.clipboard.writeText(fullUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleClaimCertificate = async () => {
    if (certificate) {
      setShowCertModal(true);
      return;
    }
    if (claimingCert) return;
    setClaimingCert(true);
    try {
      const res = await fetch(`/api/coding/sheets/${sheet.id}/certificate`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCertificate(json.data);
        setShowCertModal(true);
      } else {
        alert(json.error || 'Complete all 530 questions to unlock the SQL Mastery certificate.');
      }
    } catch {
      alert('Failed to claim certificate.');
    } finally {
      setClaimingCert(false);
    }
  };

  // Workbench Prev/Next calculations
  const activeQuestionObj = useMemo(
    () => (activeQNum !== null ? questions.find((q) => q.question_number === activeQNum) || null : null),
    [activeQNum, questions]
  );

  const navList = filteredQuestions.length > 0 ? filteredQuestions : questions;
  const activeIdxInNav = activeQuestionObj
    ? navList.findIndex((q) => q.question_number === activeQuestionObj.question_number)
    : -1;

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpInput.trim(), 10);
    if (!Number.isNaN(target) && target >= 1 && target <= questions.length) {
      openQuestion(target);
      setJumpInput('');
    }
  };

  return (
    <div className="container code-arena-container sql-sheet-shell">
      {/* Top Header */}
      <div className="sql-top-bar">
        <div className="sql-top-left">
          <Link href={isPublicPreview ? '/' : '/code-arena/sheets'} className="sql-back-link">
            <ArrowLeft size={16} />
            {isPublicPreview ? 'Back to Home' : 'Back to DSA Sheets'}
          </Link>

          <div className="sql-title-row">
            <h1 className="sql-sheet-h1">{sheet.title}</h1>
            <span className="sql-mastery-badge">
              <Database size={13} /> SQL + MCQ MASTERY
            </span>
          </div>

          {sheet.description && (
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', lineHeight: 1.5, maxWidth: '820px' }}>
              {sheet.description}
            </p>
          )}
        </div>

        <div className="sql-top-actions">
          <button type="button" onClick={handleCopyShareLink} className="sql-btn sql-btn-secondary">
            {copiedShare ? <Check size={15} /> : <Share2 size={15} />}
            {copiedShare ? 'Link Copied' : 'Share Sheet'}
          </button>

          {!isPublicPreview && stats.solvedTotal >= questions.length && (
            <button type="button" onClick={handleClaimCertificate} className="sql-btn sql-btn-emerald">
              <Award size={15} />
              {certificate ? 'View Certificate' : claimingCert ? 'Issuing...' : 'Claim Certificate'}
            </button>
          )}

          {isPublicPreview && (
            <Link href="/login" className="sql-btn sql-btn-primary" style={{ textDecoration: 'none' }}>
              <Lock size={14} /> Login to Save Progress
            </Link>
          )}
        </div>
      </div>

      {/* Hero Progress + Community Stats */}
      <div className="sql-hero-grid">
        <div className="sql-glass-panel">
          <div className="sql-progress-top">
            <span className="sql-progress-title">
              <Flame size={17} style={{ color: '#f59e0b' }} />
              SQL Mastery Progress ({stats.solvedTotal} / {questions.length})
            </span>
            <span className="sql-progress-pct">{stats.pct}%</span>
          </div>

          <div className="sql-progress-track">
            <div className="sql-progress-fill" style={{ width: `${stats.pct}%` }} />
          </div>

          <div className="sql-breakdown-pills">
            <div className="sql-mini-stat">
              <span className="sql-mini-stat-label">MCQs Completed</span>
              <span className="sql-mini-stat-val" style={{ color: '#c084fc' }}>
                {stats.solvedMcq} <span style={{ fontSize: '12px', color: '#64748b' }}>/ {stats.mcqTotal}</span>
              </span>
            </div>
            <div className="sql-mini-stat">
              <span className="sql-mini-stat-label">SQL Queries</span>
              <span className="sql-mini-stat-val" style={{ color: '#22d3ee' }}>
                {stats.solvedQuery} <span style={{ fontSize: '12px', color: '#64748b' }}>/ {stats.queryTotal}</span>
              </span>
            </div>
            <div className="sql-mini-stat">
              <span className="sql-mini-stat-label">Bookmarked</span>
              <span className="sql-mini-stat-val" style={{ color: '#fbbf24' }}>
                {stats.bookmarkedCount}
              </span>
            </div>
          </div>

          {lastPracticedQ && activeQNum === null && (
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                Resume where you left off: <strong style={{ color: '#f8fafc' }}>Question #{lastPracticedQ}</strong>
              </span>
              <button type="button" onClick={() => openQuestion(lastPracticedQ)} className="sql-btn sql-btn-emerald">
                <Play size={14} fill="currentColor" /> Continue Q{lastPracticedQ}
              </button>
            </div>
          )}
        </div>

        {/* Community Stats Grid */}
        <div className="sql-glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
          <div className="sheet-stats-container">
            <div
              className="sheet-stat-box clickable"
              onClick={() => setShowLeaderboardModal(true)}
              title="View Top SQL Solvers"
            >
              <Trophy size={20} style={{ color: '#fbbf24', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>{totalSolversCount}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Active Solvers</div>
              </div>
            </div>

            <div
              className="sheet-stat-box clickable"
              onClick={() => setShowEnrolledModal(true)}
              title="View Enrolled Learners"
            >
              <Users size={20} style={{ color: '#22d3ee', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>{totalEnrolledCount}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Enrolled</div>
              </div>
            </div>

            <div className="sheet-stat-box">
              <Star size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                  {reviewsData?.stats?.averageRating ? `${reviewsData.stats.averageRating} / 5` : 'New'}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {reviewsData?.stats?.totalReviews || 0} Reviews
                </div>
              </div>
            </div>

            <div
              className="sheet-stat-box clickable"
              onClick={() => {
                setActiveQNum(null);
                setActiveTab('cheatsheet');
              }}
            >
              <Sparkles size={20} style={{ color: '#a855f7', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>12 Topics</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Cheat Sheet</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span>11 MCQ Modules • 8 Live SQL Query Labs</span>
            <button
              type="button"
              onClick={() => openQuestion(383)}
              className="sql-mini-btn"
              style={{ color: '#22d3ee', borderColor: 'rgba(6, 182, 212, 0.35)' }}
            >
              <Terminal size={12} /> Try Live SQL Sandbox
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Tabs */}
      <div className="sql-main-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'arena'}
          onClick={() => setActiveTab('arena')}
          className={`sql-main-tab ${activeTab === 'arena' ? 'active' : ''}`}
        >
          <Layers size={16} /> Practice Arena ({questions.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'quiz'}
          onClick={() => {
            setActiveQNum(null);
            setActiveTab('quiz');
          }}
          className={`sql-main-tab ${activeTab === 'quiz' ? 'active' : ''}`}
        >
          <Trophy size={16} /> Interactive MCQ Quiz
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'tables'}
          onClick={() => {
            setActiveQNum(null);
            setActiveTab('tables');
          }}
          className={`sql-main-tab ${activeTab === 'tables' ? 'active' : ''}`}
        >
          <Database size={16} /> Practice Tables &amp; Dialects
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'cheatsheet'}
          onClick={() => {
            setActiveQNum(null);
            setActiveTab('cheatsheet');
          }}
          className={`sql-main-tab ${activeTab === 'cheatsheet' ? 'active' : ''}`}
        >
          <FileText size={16} /> Quick Revision Cheat Sheet
        </button>
      </div>

      {/* TAB 1: PRACTICE ARENA (Focused Workbench OR Paginated List) */}
      {activeTab === 'arena' && (
        <>
          {activeQuestionObj ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Workbench Navigation Header */}
              <div className="sql-workbench-nav">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setActiveQNum(null)}
                    className="sql-btn sql-btn-secondary"
                  >
                    <ArrowLeft size={15} /> All Questions
                  </button>
                  <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>
                    Q{activeQuestionObj.question_number} of {questions.length}
                  </span>
                </div>

                <form onSubmit={handleJumpSubmit} className="sql-jump-form">
                  <input
                    type="number"
                    min={1}
                    max={questions.length}
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    placeholder={`1-${questions.length}`}
                    className="sql-jump-input"
                  />
                  <button type="submit" className="sql-mini-btn">
                    Go
                  </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={activeIdxInNav <= 0}
                    onClick={() => openQuestion(navList[activeIdxInNav - 1].question_number)}
                    className="sql-btn sql-btn-secondary"
                  >
                    <ChevronLeft size={15} /> Prev
                  </button>
                  <button
                    type="button"
                    disabled={activeIdxInNav === -1 || activeIdxInNav >= navList.length - 1}
                    onClick={() => openQuestion(navList[activeIdxInNav + 1].question_number)}
                    className="sql-btn sql-btn-primary"
                  >
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              </div>

              {activeQuestionObj.type === 'MCQ' ? (
                <SqlMcqCard
                  question={activeQuestionObj}
                  progress={progressMap[activeQuestionObj.question_number]}
                  isPublicPreview={isPublicPreview}
                  onSubmitAnswer={(p) => handleSaveProgress(p)}
                  onToggleBookmark={handleToggleBookmark}
                />
              ) : (
                <SqlQueryWorkspace
                  question={activeQuestionObj}
                  progress={progressMap[activeQuestionObj.question_number]}
                  isPublicPreview={isPublicPreview}
                  onSaveProgress={(p) => handleSaveProgress(p)}
                  onToggleBookmark={handleToggleBookmark}
                />
              )}
            </div>
          ) : (
            <>
              {/* Filter Controls */}
              <div className="sql-filters-card">
                <div className="sql-filter-top-row">
                  <div className="sql-search-wrap">
                    <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search 530 questions by keyword, SQL clause, table, or Q# (e.g. 383)..."
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className="sql-select"
                    aria-label="Filter by Section"
                  >
                    <option value="ALL">All 19 Sections (530 Questions)</option>
                    <optgroup label="MCQ Modules (Parts 1–11 • 382 MCQs)">
                      {mcqSections.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="SQL Query Practice (1–8 • 148 Queries)">
                      {querySections.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="sql-pill-rows">
                  <div className="sql-pill-group">
                    {(['ALL', 'MCQ', 'QUERY'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTypeFilter(t)}
                        className={`sql-filter-pill ${typeFilter === t ? 'active' : ''}`}
                      >
                        {t === 'ALL'
                          ? `All (${questions.length})`
                          : t === 'MCQ'
                          ? `MCQs (${stats.mcqTotal})`
                          : `SQL Queries (${stats.queryTotal})`}
                      </button>
                    ))}
                  </div>

                  <div className="sql-pill-group">
                    {(['ALL', 'SOLVED', 'UNSOLVED', 'BOOKMARKED'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`sql-filter-pill ${statusFilter === st ? 'active' : ''}`}
                      >
                        {st === 'ALL'
                          ? 'Any Status'
                          : st === 'SOLVED'
                          ? 'Solved'
                          : st === 'UNSOLVED'
                          ? 'Pending'
                          : `Bookmarked (${stats.bookmarkedCount})`}
                      </button>
                    ))}
                  </div>

                  <div className="sql-pill-group">
                    {(['ALL', 'EASY', 'MEDIUM', 'HARD'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficultyFilter(d)}
                        className={`sql-filter-pill ${difficultyFilter === d ? 'active' : ''}`}
                      >
                        {d === 'ALL' ? 'All Levels' : d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Count & Results Info */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', padding: '0 4px' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>
                  Showing <strong style={{ color: '#f8fafc' }}>{filteredQuestions.length}</strong> question(s)
                </span>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                  Page {safePage} of {totalPages}
                </span>
              </div>

              {/* Questions Rows */}
              {paginatedQuestions.length === 0 ? (
                <div className="sql-glass-panel" style={{ textAlign: 'center', padding: '44px 20px' }}>
                  <BookOpen size={36} style={{ color: '#64748b', margin: '0 auto 12px' }} />
                  <h3 style={{ color: '#f8fafc', margin: '0 0 6px' }}>No questions match these filters</h3>
                  <p style={{ color: '#94a3b8', fontSize: '13.5px', marginBottom: '14px' }}>
                    Try resetting your search or module filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('ALL');
                      setStatusFilter('ALL');
                      setDifficultyFilter('ALL');
                      setSectionFilter('ALL');
                    }}
                    className="sql-btn sql-btn-secondary"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="practice-rows-list">
                  {paginatedQuestions.map((q) => {
                    const prog = progressMap[q.question_number];
                    const solved = Boolean(prog?.is_solved);
                    const bookmarked = Boolean(prog?.is_bookmarked);
                    const diffClass =
                      q.difficulty === 'HARD'
                        ? 'difficulty-HARD'
                        : q.difficulty === 'MEDIUM'
                        ? 'difficulty-MEDIUM'
                        : 'difficulty-EASY';

                    return (
                      <div
                        key={q.question_number}
                        className="practice-row-item"
                        onClick={() => openQuestion(q.question_number)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="row-item-left">
                          {solved ? (
                            <CheckCircle2 size={20} style={{ color: '#34d399', flexShrink: 0 }} />
                          ) : (
                            <Circle size={20} style={{ color: '#475569', flexShrink: 0 }} />
                          )}

                          <div className="row-problem-meta">
                            <div className="row-problem-title">
                              <span style={{ color: '#22d3ee', marginRight: '8px', fontWeight: 800 }}>
                                Q{q.question_number}.
                              </span>
                              {q.question}
                            </div>
                            <div className="row-tags-group">
                              <span className={`sql-type-pill ${q.type === 'MCQ' ? 'sql-type-mcq' : 'sql-type-query'}`}>
                                {q.type === 'MCQ' ? 'MCQ' : 'SQL QUERY'}
                              </span>
                              <span className="tag-pill">{q.section}</span>
                            </div>
                          </div>
                        </div>

                        <div className="row-item-right">
                          <span className={`difficulty-badge-styled ${diffClass}`}>{q.difficulty}</span>

                          {!isPublicPreview && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleBookmark(q.question_number, q.type, !bookmarked);
                              }}
                              className={`sql-icon-toggle ${bookmarked ? 'active' : ''}`}
                              style={{ width: '32px', height: '32px' }}
                              title={bookmarked ? 'Remove Bookmark' : 'Save Bookmark'}
                            >
                              <Bookmark size={14} fill={bookmarked ? 'currentColor' : 'none'} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openQuestion(q.question_number);
                            }}
                            className={`sql-btn ${q.type === 'QUERY' ? 'sql-btn-primary' : 'sql-btn-secondary'}`}
                            style={{ padding: '6px 12px', minHeight: '34px', fontSize: '12px' }}
                          >
                            {q.type === 'QUERY' ? (solved ? 'Review SQL' : 'Write SQL') : solved ? 'Review MCQ' : 'Solve MCQ'}
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="sql-pagination-bar">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 200, behavior: 'smooth' });
                    }}
                    className="sql-btn sql-btn-secondary"
                  >
                    <ChevronLeft size={15} /> Previous
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 700 }}>
                      Page {safePage} / {totalPages}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 200, behavior: 'smooth' });
                    }}
                    className="sql-btn sql-btn-secondary"
                  >
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* TAB 2: INTERACTIVE QUIZ MODE */}
      {activeTab === 'quiz' && (
        <QuizSessionView
          questions={questions}
          progressMap={progressMap}
          isPublicPreview={isPublicPreview}
          onSubmitMcq={(p) => handleSaveProgress(p)}
        />
      )}

      {/* TAB 3: PRACTICE TABLES & DIALECTS */}
      {activeTab === 'tables' && <PracticeTablesView />}

      {/* TAB 4: QUICK REVISION CHEAT SHEET */}
      {activeTab === 'cheatsheet' && <CheatSheetView />}

      {/* Reviews Section */}
      {!isPublicPreview && reviewsData && (
        <div style={{ marginTop: '12px' }}>
          <SheetReviewsSection
            sheetId={sheet.id}
            currentUserId={currentUserId}
            isStaff={isInstructor}
            reviews={reviewsData.reviews}
            userReview={reviewsData.userReview}
            stats={reviewsData.stats}
          />
        </div>
      )}

      {/* Leaderboard Modal */}
      <Modal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        title="SQL Mastery Leaderboard"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
          {leaderboardList.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13.5px', textAlign: 'center', padding: '20px 0' }}>
              Be the first to solve SQL questions on this sheet!
            </p>
          ) : (
            leaderboardList.map((row, idx) => (
              <div
                key={row.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: row.isCurrentUser ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: row.isCurrentUser ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 800, color: idx < 3 ? '#fbbf24' : '#94a3b8', width: '24px' }}>
                    #{idx + 1}
                  </span>
                  <UserAvatar url={row.avatar_url} name={row.name} size={32} />
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#f8fafc' }}>{row.name}</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#22d3ee' }}>
                  {row.solvedCount} / {questions.length}
                </span>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Enrolled Users Modal */}
      <Modal
        isOpen={showEnrolledModal}
        onClose={() => setShowEnrolledModal(false)}
        title={`Enrolled Learners (${totalEnrolledCount})`}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
          {enrolledUsersList.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13.5px', textAlign: 'center', padding: '20px 0' }}>
              Public sheet — anyone in Code Arena can practice directly!
            </p>
          ) : (
            enrolledUsersList.map((u) => (
              <div
                key={u.user_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <UserAvatar url={u.avatar_url} name={u.name} size={32} />
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc' }}>{u.name}</span>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Certificate Modal */}
      {certificate && (
        <Modal
          isOpen={showCertModal}
          onClose={() => setShowCertModal(false)}
          title="SQL Mastery Certificate"
          size="lg"
        >
          <CertificateRenderer cert={certificate} canEditSettings={false} />
        </Modal>
      )}
    </div>
  );
}
