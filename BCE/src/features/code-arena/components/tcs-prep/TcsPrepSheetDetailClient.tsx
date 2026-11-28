'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Code2,
  Flame,
  GraduationCap,
  Layers,
  Lock,
  Mail,
  Pencil,
  Play,
  Search,
  Share2,
  Star,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import UserAvatar from '@/components/shared/UserAvatar';
import CertificateRenderer from '../CertificateRenderer';
import SheetEditorModal from '../SheetEditorModal';
import SheetReviewsSection from '../SheetReviewsSection';
import TcsMcqCard from './TcsMcqCard';
import {
  TcsCodingLabView,
  TcsVerbalStudioView,
} from './TcsVerbalAndCodingView';
import TcsMockExamAndAnalysisView from './TcsMockExamAndAnalysisView';
import { AptitudeChaptersHandbookView } from '../aptitude-sheet/AptitudeMockAndChaptersView';
import type {
  TcsCategory,
  TcsChapter,
  TcsDrill,
  TcsMockAttempt,
  TcsMockPaperHeader,
  TcsPrepQuestion,
  TcsProgress,
} from '@/features/code-arena/data/tcsPrepTypes';
import '@/features/code-arena/components/CodeArena.css';
import '../sql-sheet/SqlSheet.css';
import '../aptitude-sheet/AptitudeSheet.css';
import './TcsPrepSheet.css';

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

interface TcsPrepSheetDetailClientProps {
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
  chapters: TcsChapter[];
  questions: TcsPrepQuestion[];
  drills: TcsDrill[];
  mockHeaders: TcsMockPaperHeader[];
  initialProgress: TcsProgress[];
  initialMockAttempts: TcsMockAttempt[];
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

type MainTab = 'arena' | 'chapters' | 'verbal' | 'coding' | 'mocks' | 'analysis';
const PAGE_SIZE = 20;

const CATEGORIES: TcsCategory[] = [
  'Quantitative Aptitude',
  'Logical Reasoning',
  'Verbal Ability',
];

export default function TcsPrepSheetDetailClient({
  sheet: initialSheet,
  chapters,
  questions: initialQuestions,
  drills,
  mockHeaders,
  initialProgress,
  initialMockAttempts,
  totalEnrolledCount = 0,
  enrolledUsersList = [],
  totalSolversCount = 0,
  leaderboardList = [],
  initialCertificate = null,
  reviewsData,
  currentUserId,
  isInstructor = false,
  isPublicPreview = false,
}: TcsPrepSheetDetailClientProps) {
  const router = useRouter();
  const [sheet, setSheet] = useState(initialSheet);
  const [questions, setQuestions] = useState(initialQuestions);
  const storageKey = `tcs_prep_last_q_${sheet.id}`;

  useEffect(() => {
    setSheet(initialSheet);
  }, [initialSheet]);

  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  const canEdit =
    !isPublicPreview &&
    Boolean(isInstructor || (currentUserId && sheet.created_by === currentUserId));

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState<'details' | 'questions'>('details');
  const [editTargetQNum, setEditTargetQNum] = useState<number | null>(null);

  useEffect(() => {
    if (!canEdit || typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('edit') === '1') {
      setEditModalTab('details');
      setEditModalOpen(true);
    }
  }, [canEdit]);

  const [progressMap, setProgressMap] = useState<Record<string, TcsProgress>>(() => {
    const map: Record<string, TcsProgress> = {};
    initialProgress.forEach((p) => {
      map[p.item_key] = p;
    });
    return map;
  });
  const [mockAttempts, setMockAttempts] = useState<TcsMockAttempt[]>(initialMockAttempts);

  const [activeTab, setActiveTab] = useState<MainTab>('arena');
  const [activeQNum, setActiveQNum] = useState<number | null>(null);
  const [lastPracticedQ, setLastPracticedQ] = useState<number | null>(null);
  const [isMockActive, setIsMockActive] = useState(false);
  const [isVerbalActive, setIsVerbalActive] = useState(false);
  const [showHeaderInFocus, setShowHeaderInFocus] = useState(false);

  const isSolvingFocus =
    (activeTab === 'arena' && activeQNum !== null) ||
    (activeTab === 'mocks' && isMockActive) ||
    (activeTab === 'verbal' && isVerbalActive) ||
    activeTab === 'coding';
  const hideTopHero = isSolvingFocus && !showHeaderInFocus;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | TcsCategory>('ALL');
  const [chapterFilter, setChapterFilter] = useState<number | 'ALL'>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SOLVED' | 'WRONG' | 'UNSOLVED' | 'BOOKMARKED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpInput, setJumpInput] = useState('');

  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showEnrolledModal, setShowEnrolledModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [certificate, setCertificate] = useState<any>(initialCertificate);
  const [claimingCert, setClaimingCert] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= questions.length) {
          setLastPracticedQ(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, [storageKey, questions.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, chapterFilter, difficultyFilter, statusFilter]);

  const chapterByNum = useMemo(() => {
    const map: Record<number, TcsChapter> = {};
    chapters.forEach((ch) => {
      map[ch.chapter_number] = ch;
    });
    return map;
  }, [chapters]);

  const visibleChapterOptions = useMemo(() => {
    if (categoryFilter === 'ALL') return chapters;
    return chapters.filter((ch) => ch.category === categoryFilter);
  }, [chapters, categoryFilter]);

  // Numeric progress map adapter so AptitudeChaptersHandbookView reuses cleanly with 0 duplication
  const mcqProgressByNum = useMemo(() => {
    const map: Record<number, any> = {};
    questions.forEach((q) => {
      const p = progressMap[`MCQ-${q.question_number}`];
      if (p) map[q.question_number] = p;
    });
    return map;
  }, [questions, progressMap]);

  const stats = useMemo(() => {
    let solvedMcqs = 0;
    let wrongMcqs = 0;
    let bookmarkedMcqs = 0;
    let solvedDrills = 0;
    let totalXpEarned = 0;

    const byCat: Record<TcsCategory, { total: number; solved: number }> = {
      'Quantitative Aptitude': { total: 0, solved: 0 },
      'Logical Reasoning': { total: 0, solved: 0 },
      'Verbal Ability': { total: 0, solved: 0 },
    };

    questions.forEach((q) => {
      if (byCat[q.category]) byCat[q.category].total++;
      const p = progressMap[`MCQ-${q.question_number}`];
      if (p?.is_solved) {
        solvedMcqs++;
        if (byCat[q.category]) byCat[q.category].solved++;
        totalXpEarned += p.xp_awarded || 0;
      } else if (p && Boolean(p.selected_option)) {
        wrongMcqs++;
      }
      if (p?.is_bookmarked) bookmarkedMcqs++;
    });

    drills.forEach((d) => {
      const p = progressMap[d.drill_code];
      if (p?.is_solved) {
        solvedDrills++;
        totalXpEarned += p.xp_awarded || 0;
      }
    });

    mockAttempts.forEach((m) => {
      totalXpEarned += m.xp_awarded || 0;
    });

    const totalItems = questions.length + drills.length;
    const solvedTotal = solvedMcqs + solvedDrills;
    const pct = totalItems > 0 ? Math.round((solvedTotal / totalItems) * 100) : 0;
    const attemptedMcqs = solvedMcqs + wrongMcqs;
    const accuracyPct = attemptedMcqs > 0 ? Math.round((solvedMcqs / attemptedMcqs) * 100) : 0;

    return {
      solvedMcqs,
      wrongMcqs,
      bookmarkedMcqs,
      solvedDrills,
      solvedTotal,
      totalItems,
      totalXpEarned,
      pct,
      accuracyPct,
      attemptedMcqs,
      byCat,
    };
  }, [questions, drills, progressMap, mockAttempts]);

  const filteredQuestions = useMemo(() => {
    const qText = searchQuery.trim().toLowerCase();
    return questions.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (chapterFilter !== 'ALL' && item.chapter_number !== chapterFilter) return false;
      if (difficultyFilter !== 'ALL' && item.difficulty !== difficultyFilter) return false;

      const prog = progressMap[`MCQ-${item.question_number}`];
      if (statusFilter === 'SOLVED' && !prog?.is_solved) return false;
      if (statusFilter === 'WRONG' && (prog?.is_solved || !prog?.selected_option)) return false;
      if (statusFilter === 'UNSOLVED' && prog?.is_solved) return false;
      if (statusFilter === 'BOOKMARKED' && !prog?.is_bookmarked) return false;

      if (qText) {
        const cleanNum = qText.replace(/^q/i, '');
        const numMatch = /^\d+$/.test(cleanNum) && String(item.question_number) === cleanNum;
        const textMatch =
          item.question.toLowerCase().includes(qText) ||
          item.chapter_title.toLowerCase().includes(qText) ||
          item.category.toLowerCase().includes(qText) ||
          (item.explanation && item.explanation.toLowerCase().includes(qText));
        if (!numMatch && !textMatch) return false;
      }
      return true;
    });
  }, [questions, progressMap, categoryFilter, chapterFilter, difficultyFilter, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedQuestions = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredQuestions.slice(start, start + PAGE_SIZE);
  }, [filteredQuestions, safePage]);

  const openQuestion = (qNum: number) => {
    setActiveQNum(qNum);
    setActiveTab('arena');
    setShowHeaderInFocus(false);
    setLastPracticedQ(qNum);
    try {
      localStorage.setItem(storageKey, String(qNum));
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveProgress = async (payload: {
    itemKey: string;
    itemType: 'MCQ' | 'PASSAGE_RECALL' | 'EMAIL_WRITING' | 'CODING';
    isSolved: boolean;
    selectedOption?: string;
    submittedText?: string;
    submittedCode?: string;
  }): Promise<{ xpAwarded?: number } | void> => {
    setProgressMap((prev) => {
      const existing = prev[payload.itemKey];
      return {
        ...prev,
        [payload.itemKey]: {
          item_key: payload.itemKey,
          item_type: payload.itemType,
          is_solved: existing?.is_solved ? true : payload.isSolved,
          is_bookmarked: Boolean(existing?.is_bookmarked),
          selected_option: payload.selectedOption ?? existing?.selected_option ?? null,
          submitted_text: payload.submittedText ?? existing?.submitted_text ?? null,
          submitted_code: payload.submittedCode ?? existing?.submitted_code ?? null,
          attempts: (existing?.attempts || 0) + 1,
          xp_awarded: existing?.xp_awarded || 0,
        },
      };
    });

    if (isPublicPreview || !currentUserId) return;

    try {
      const res = await fetch(`/api/coding/sheets/${sheet.id}/tcs-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setProgressMap((prev) => ({
          ...prev,
          [payload.itemKey]: json.data,
        }));
        if (json.xpAwarded && json.xpAwarded > 0) {
          router.refresh();
        }
        return { xpAwarded: json.xpAwarded || 0 };
      }
    } catch (err) {
      console.error('Failed to persist TCS prep progress:', err);
    }
  };

  const handleToggleBookmark = async (
    itemKey: string,
    itemType: 'MCQ' | 'PASSAGE_RECALL' | 'EMAIL_WRITING' | 'CODING',
    nextState: boolean
  ) => {
    setProgressMap((prev) => {
      const existing = prev[itemKey];
      return {
        ...prev,
        [itemKey]: {
          item_key: itemKey,
          item_type: itemType,
          is_solved: existing?.is_solved ?? false,
          is_bookmarked: nextState,
          selected_option: existing?.selected_option ?? null,
          submitted_text: existing?.submitted_text ?? null,
          submitted_code: existing?.submitted_code ?? null,
          attempts: existing?.attempts ?? 0,
          xp_awarded: existing?.xp_awarded ?? 0,
        },
      };
    });

    if (isPublicPreview || !currentUserId) return;

    try {
      await fetch(`/api/coding/sheets/${sheet.id}/tcs-progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemKey, itemType, isBookmarked: nextState }),
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
      const res = await fetch(`/api/coding/sheets/${sheet.id}/certificate`, { method: 'POST' });
      const json = await res.json();
      if (json.success && json.data) {
        setCertificate(json.data);
        setShowCertModal(true);
      } else {
        alert(json.error || `Complete all ${questions.length} MCQs to unlock your certificate.`);
      }
    } catch {
      alert('Failed to claim certificate.');
    } finally {
      setClaimingCert(false);
    }
  };

  const jumpToChapter = (chapterNum: number, levelFilter: 'ALL' | 'EASY' | 'MEDIUM' | 'HARD' = 'ALL') => {
    setCategoryFilter('ALL');
    setChapterFilter(chapterNum);
    setDifficultyFilter(levelFilter);
    setStatusFilter('ALL');
    setSearchQuery('');
    setActiveQNum(null);
    setActiveTab('arena');
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

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
    <div className={`container code-arena-container sql-sheet-shell ${hideTopHero ? 'is-focus-solving' : ''}`}>
      {/* Top Header & Hero (auto-hidden when user starts solving so workspace stays cleanly focused) */}
      {!hideTopHero && (
        <>
          <div className="sql-top-bar">
        <div className="sql-top-left">
          <Link href={isPublicPreview ? '/' : '/code-arena/sheets'} className="sql-back-link">
            <ArrowLeft size={16} />
            {isPublicPreview ? 'Back to Home' : 'Back to Practice Sheets'}
          </Link>

          <div className="sql-title-row">
            <h1 className="sql-sheet-h1">{sheet.title}</h1>
            <span className="sql-mastery-badge">
              <GraduationCap size={13} /> 47 CHAPTERS · 23 C++ · 13 FULL MOCKS
            </span>
          </div>

          {sheet.description && <p className="sql-sheet-desc">{sheet.description}</p>}
        </div>

        <div className="sql-top-actions">
          <button type="button" onClick={handleCopyShareLink} className="sql-btn sql-btn-secondary">
            {copiedShare ? <Check size={15} /> : <Share2 size={15} />}
            {copiedShare ? 'Link Copied' : 'Share Sheet'}
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditModalTab('details');
                setEditTargetQNum(activeQNum);
                setEditModalOpen(true);
              }}
              className="sql-btn sql-btn-secondary"
            >
              <Pencil size={15} /> Edit Sheet
            </button>
          )}

          {!isPublicPreview && questions.length > 0 && stats.solvedMcqs >= questions.length && (
            <button type="button" onClick={handleClaimCertificate} className="sql-btn sql-btn-emerald">
              <Award size={15} />
              {certificate ? 'View Certificate' : claimingCert ? 'Issuing...' : 'Claim Certificate'}
            </button>
          )}

          {isPublicPreview && (
            <Link href="/login" className="sql-btn sql-btn-primary" style={{ textDecoration: 'none' }}>
              <Lock size={14} /> Login to Save Mocks &amp; XP
            </Link>
          )}
        </div>
      </div>

      {/* Hero Mastery & Community Grid */}
      <div className="sql-hero-grid">
        <div className="sql-glass-panel">
          <div className="sql-progress-top">
            <span className="sql-progress-title">
              <Flame size={17} style={{ color: '#f59e0b' }} />
              TCS NQT Prep Mastery ({stats.solvedTotal} / {stats.totalItems})
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {stats.totalXpEarned > 0 && (
                <span className="sql-xp-burst" title="Total XP earned on TCS Prep & Mocks">
                  <Zap size={12} /> +{stats.totalXpEarned} XP
                </span>
              )}
              <span className="sql-progress-pct">{stats.pct}%</span>
            </div>
          </div>

          <div className="sql-progress-track">
            <div className="sql-progress-fill" style={{ width: `${stats.pct}%` }} />
          </div>

          <div className="sql-breakdown-pills">
            {CATEGORIES.map((cat) => {
              const catStats = stats.byCat[cat];
              const label =
                cat === 'Quantitative Aptitude'
                  ? 'Quant (22 Ch)'
                  : cat === 'Logical Reasoning'
                  ? 'Logical (16 Ch)'
                  : 'Verbal (9 Ch)';
              return (
                <div
                  key={cat}
                  className="sql-mini-stat clickable"
                  onClick={() => {
                    setActiveQNum(null);
                    setActiveTab('arena');
                    setCategoryFilter(cat);
                    setChapterFilter('ALL');
                  }}
                >
                  <span className="sql-mini-stat-label">{label}</span>
                  <span className="sql-mini-stat-val sql-color-mcq">
                    {catStats.solved} <span className="sql-stat-sub">/ {catStats.total}</span>
                  </span>
                </div>
              );
            })}

            <div
              className="sql-mini-stat clickable"
              onClick={() => {
                setActiveQNum(null);
                setActiveTab(stats.wrongMcqs > 0 ? 'arena' : 'coding');
                if (stats.wrongMcqs > 0) setStatusFilter('WRONG');
              }}
            >
              <span className="sql-mini-stat-label">Drills &amp; Review</span>
              <span className="sql-mini-stat-val">
                <span className="sql-color-correct">{stats.solvedDrills}</span>
                <span className="sql-stat-sub">/{drills.length} • </span>
                <span className="sql-color-wrong">{stats.wrongMcqs}</span>
                <span className="sql-stat-sub"> wrong</span>
              </span>
            </div>
          </div>

          {lastPracticedQ && activeQNum === null && (
            <div className="sql-resume-row">
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Resume Practice: <strong style={{ color: 'var(--text-primary)' }}>Question #{lastPracticedQ}</strong>
              </span>
              <button type="button" onClick={() => openQuestion(lastPracticedQ)} className="sql-btn sql-btn-emerald">
                <Play size={14} fill="currentColor" /> Continue Q{lastPracticedQ}
              </button>
            </div>
          )}
        </div>

        <div className="sql-glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
          <div className="sheet-stats-container">
            <div className="sheet-stat-box clickable" onClick={() => setShowLeaderboardModal(true)}>
              <Trophy size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalSolversCount}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Active Solvers</div>
              </div>
            </div>

            <div className="sheet-stat-box clickable" onClick={() => setShowEnrolledModal(true)}>
              <Users size={20} style={{ color: '#0284c7', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalEnrolledCount}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Enrolled</div>
              </div>
            </div>

            {!isPublicPreview && (
              <div
                className="sheet-stat-box clickable"
                onClick={() => setShowReviewsModal(true)}
                title="View or Write Sheet Reviews"
              >
                <Star size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {reviewsData?.stats?.averageRating ? `${reviewsData.stats.averageRating} / 5` : 'New'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {reviewsData?.stats?.totalReviews || 0} Reviews
                  </div>
                </div>
              </div>
            )}

            <div
              className="sheet-stat-box clickable"
              onClick={() => {
                setActiveQNum(null);
                setActiveTab('analysis');
              }}
            >
              <BarChart3 size={20} style={{ color: '#10b981', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {new Set(mockAttempts.map((a) => a.paper_number)).size} / {mockHeaders.length}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Mocks Analyzed</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span>Accuracy: {stats.accuracyPct}% • 13 Papers × 191m</span>
            <button
              type="button"
              onClick={() => {
                setActiveQNum(null);
                setActiveTab('mocks');
              }}
              className="sql-mini-btn"
              style={{ color: 'var(--accent-primary, #0284c7)', borderColor: 'rgba(14, 165, 233, 0.35)' }}
            >
              <Trophy size={12} /> Take Real TCS Mock
            </button>
          </div>
        </div>
      </div>
        </>
      )}

      {/* 6 Main Tabs */}
      <div className="sql-main-tabs" role="tablist">
        <button
          type="button"
          onClick={() => { setShowHeaderInFocus(false); setActiveTab('arena'); }}
          className={`sql-main-tab ${activeTab === 'arena' ? 'active' : ''}`}
        >
          <Layers size={15} /> Prep Arena ({questions.length})
        </button>

        <button
          type="button"
          onClick={() => { setShowHeaderInFocus(false); setActiveQNum(null); setActiveTab('chapters'); }}
          className={`sql-main-tab ${activeTab === 'chapters' ? 'active' : ''}`}
        >
          <BookOpen size={15} /> Syllabus ({chapters.length} Ch)
        </button>

        <button
          type="button"
          onClick={() => { setShowHeaderInFocus(false); setActiveQNum(null); setActiveTab('verbal'); }}
          className={`sql-main-tab ${activeTab === 'verbal' ? 'active' : ''}`}
        >
          <Mail size={15} /> Recall &amp; Email ({drills.filter((d) => d.drill_type !== 'CODING').length})
        </button>

        <button
          type="button"
          onClick={() => { setShowHeaderInFocus(false); setActiveQNum(null); setActiveTab('coding'); }}
          className={`sql-main-tab ${activeTab === 'coding' ? 'active' : ''}`}
        >
          <Code2 size={15} /> C++ Labs ({drills.filter((d) => d.drill_type === 'CODING').length})
        </button>

        <button
          type="button"
          onClick={() => { setShowHeaderInFocus(false); setActiveQNum(null); setActiveTab('mocks'); }}
          className={`sql-main-tab ${activeTab === 'mocks' ? 'active' : ''}`}
        >
          <Trophy size={15} /> 13 Mock Papers
        </button>

        <button
          type="button"
          onClick={() => { setShowHeaderInFocus(false); setActiveQNum(null); setActiveTab('analysis'); }}
          className={`sql-main-tab ${activeTab === 'analysis' ? 'active' : ''}`}
        >
          <BarChart3 size={15} /> Deep Analysis ({mockAttempts.length})
        </button>

        {isSolvingFocus && (
          <button
            type="button"
            onClick={() => setShowHeaderInFocus((v) => !v)}
            className="sql-main-tab sql-focus-info-btn"
            title={showHeaderInFocus ? 'Collapse top header into Focus Mode' : 'Show sheet header, progress & reviews'}
          >
            {showHeaderInFocus ? <ChevronUp size={14} /> : <BarChart3 size={14} />}
            <span>{showHeaderInFocus ? 'Focus View' : `${stats.pct}% · Sheet Info`}</span>
          </button>
        )}
      </div>

      {/* TAB 1: PREP PRACTICE ARENA */}
      {activeTab === 'arena' && (
        <>
          {activeQuestionObj ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="sql-workbench-nav">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setActiveQNum(null)} className="sql-btn sql-btn-secondary">
                    <ArrowLeft size={15} /> All Questions
                  </button>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
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
                  <button type="submit" className="sql-mini-btn">Go</button>
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

              <TcsMcqCard
                question={activeQuestionObj}
                chapter={chapterByNum[activeQuestionObj.chapter_number]}
                progress={progressMap[`MCQ-${activeQuestionObj.question_number}`]}
                isPublicPreview={isPublicPreview}
                canEdit={canEdit}
                onEditQuestion={() => {
                  setEditModalTab('questions');
                  setEditTargetQNum(activeQuestionObj.question_number);
                  setEditModalOpen(true);
                }}
                onSubmitAnswer={handleSaveProgress}
                onToggleBookmark={handleToggleBookmark}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <button
                  type="button"
                  disabled={activeIdxInNav <= 0}
                  onClick={() => openQuestion(navList[activeIdxInNav - 1].question_number)}
                  className="sql-btn sql-btn-secondary"
                >
                  <ChevronLeft size={15} /> Previous Question
                </button>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Filter Position: {activeIdxInNav + 1} / {navList.length}
                </span>
                <button
                  type="button"
                  disabled={activeIdxInNav === -1 || activeIdxInNav >= navList.length - 1}
                  onClick={() => openQuestion(navList[activeIdxInNav + 1].question_number)}
                  className="sql-btn sql-btn-primary"
                >
                  Next Question <ChevronRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="sql-filters-card">
                <div className="sql-filter-top-row">
                  <div className="sql-search-wrap">
                    <Search size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${questions.length} MCQs by keyword, chapter, or Q# (e.g. 850)...`}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  <select
                    value={chapterFilter === 'ALL' ? 'ALL' : String(chapterFilter)}
                    onChange={(e) => setChapterFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                    className="sql-select"
                  >
                    <option value="ALL">
                      All {visibleChapterOptions.length} Chapters ({filteredQuestions.length} filtered)
                    </option>
                    {visibleChapterOptions.map((ch) => (
                      <option key={ch.chapter_number} value={ch.chapter_number}>
                        Ch {ch.chapter_number}: {ch.title} (Q{ch.start_q}–Q{ch.end_q} · {ch.question_count})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sql-pill-rows">
                  <div className="sql-pill-group">
                    {(['ALL', ...CATEGORIES] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCategoryFilter(cat);
                          if (cat !== 'ALL' && chapterFilter !== 'ALL' && chapterByNum[chapterFilter]?.category !== cat) {
                            setChapterFilter('ALL');
                          }
                        }}
                        className={`sql-filter-pill ${categoryFilter === cat ? 'active' : ''}`}
                      >
                        {cat === 'ALL' ? `All (${questions.length})` : cat.replace('Quantitative Aptitude', 'Quant').replace('Logical Reasoning', 'Logical').replace('Verbal Ability', 'Verbal')}
                      </button>
                    ))}
                  </div>

                  <div className="sql-pill-group">
                    {(['ALL', 'SOLVED', 'WRONG', 'UNSOLVED', 'BOOKMARKED'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`sql-filter-pill ${statusFilter === st ? 'active' : ''}`}
                      >
                        {st === 'ALL'
                          ? 'Any Status'
                          : st === 'SOLVED'
                          ? `Correct (${stats.solvedMcqs})`
                          : st === 'WRONG'
                          ? `Wrong (${stats.wrongMcqs})`
                          : st === 'UNSOLVED'
                          ? 'Pending'
                          : `Saved (${stats.bookmarkedMcqs})`}
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
                        {d === 'ALL' ? 'All Levels' : d === 'EASY' ? 'Basic' : d === 'MEDIUM' ? 'Medium' : 'Advance'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', padding: '0 4px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredQuestions.length}</strong> question(s)
                </span>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Page {safePage} of {totalPages}
                </span>
              </div>

              {paginatedQuestions.length === 0 ? (
                <div className="sql-glass-panel" style={{ textAlign: 'center', padding: '44px 20px' }}>
                  <BookOpen size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                  <h3 style={{ margin: '0 0 6px' }}>No questions match these filters</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('ALL');
                      setChapterFilter('ALL');
                      setDifficultyFilter('ALL');
                      setStatusFilter('ALL');
                    }}
                    className="sql-btn sql-btn-secondary"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="practice-rows-list">
                  {paginatedQuestions.map((q) => {
                    const prog = progressMap[`MCQ-${q.question_number}`];
                    const solved = Boolean(prog?.is_solved);
                    const bookmarked = Boolean(prog?.is_bookmarked);
                    const diffClass =
                      q.difficulty === 'HARD'
                        ? 'difficulty-HARD'
                        : q.difficulty === 'MEDIUM'
                        ? 'difficulty-MEDIUM'
                        : 'difficulty-EASY';
                    const shortCat =
                      q.category === 'Quantitative Aptitude' ? 'Quant' : q.category === 'Logical Reasoning' ? 'Logical' : 'Verbal';

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
                              <span className="sql-color-query" style={{ marginRight: '8px', fontWeight: 800 }}>
                                Q{q.question_number}.
                              </span>
                              {q.question}
                            </div>
                            <div className="row-tags-group">
                              <span className="sql-type-pill sql-type-mcq">{shortCat}</span>
                              <span className="tag-pill">Ch {q.chapter_number}: {q.chapter_title}</span>
                              {q.image_url && <span className="tag-pill">Visual Diagram</span>}
                            </div>
                          </div>
                        </div>

                        <div className="row-item-right">
                          <span className={`difficulty-badge-styled ${diffClass}`}>{q.level_label}</span>

                          {!isPublicPreview && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleBookmark(`MCQ-${q.question_number}`, 'MCQ', !bookmarked);
                              }}
                              className={`sql-icon-toggle ${bookmarked ? 'active' : ''}`}
                              style={{ width: '32px', height: '32px' }}
                            >
                              <Bookmark size={14} fill={bookmarked ? 'currentColor' : 'none'} />
                            </button>
                          )}

                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditModalTab('questions');
                                setEditTargetQNum(q.question_number);
                                setEditModalOpen(true);
                              }}
                              className="sql-icon-toggle"
                              style={{ width: '32px', height: '32px' }}
                              title="Edit Question"
                            >
                              <Pencil size={13} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openQuestion(q.question_number);
                            }}
                            className="sql-btn sql-btn-secondary"
                            style={{ padding: '6px 12px', minHeight: '34px', fontSize: '12px' }}
                          >
                            {solved ? 'Review' : 'Solve'} <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalPages > 1 && (
                <div className="sql-pagination-bar">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 200, behavior: 'smooth' }); }}
                    className="sql-btn sql-btn-secondary"
                  >
                    <ChevronLeft size={15} /> Previous
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>
                    Page {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 200, behavior: 'smooth' }); }}
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

      {/* TAB 2: 47 SYLLABUS CHAPTERS */}
      {activeTab === 'chapters' && (
        <AptitudeChaptersHandbookView
          chapters={chapters as any}
          questions={questions as any}
          progressMap={mcqProgressByNum}
          onPracticeChapter={(chNum, lvl = 'ALL') => jumpToChapter(chNum, lvl)}
        />
      )}

      {/* TAB 3: PASSAGE RECALL & EMAIL WRITING */}
      {activeTab === 'verbal' && (
        <TcsVerbalStudioView
          drills={drills}
          progressMap={progressMap}
          isPublicPreview={isPublicPreview}
          onSaveDrill={(p) => handleSaveProgress(p)}
          onSolvingActiveChange={setIsVerbalActive}
        />
      )}

      {/* TAB 4: 23 C++17 CODING LABS */}
      {activeTab === 'coding' && (
        <TcsCodingLabView
          drills={drills}
          progressMap={progressMap}
          isPublicPreview={isPublicPreview}
          onSaveCoding={(p) => handleSaveProgress(p)}
        />
      )}

      {/* TAB 5 & TAB 6: 13 MOCK PAPERS & DEEP REAL MOCK ANALYSIS */}
      {(activeTab === 'mocks' || activeTab === 'analysis') && (
        <TcsMockExamAndAnalysisView
          sheetId={sheet.id}
          mockHeaders={mockHeaders}
          attempts={mockAttempts}
          viewSection={activeTab === 'analysis' ? 'analysis' : 'mocks'}
          isPublicPreview={isPublicPreview}
          onAttemptSaved={(att) => {
            setMockAttempts((prev) => [att, ...prev]);
            if (!isPublicPreview) router.refresh();
          }}
          onPracticeChapter={(chNum) => jumpToChapter(chNum, 'ALL')}
          onSwitchToAnalysis={() => setActiveTab('analysis')}
          onMockActiveChange={setIsMockActive}
        />
      )}

      {/* Reviews Popup Modal */}
      {!isPublicPreview && reviewsData && (
        <Modal
          isOpen={showReviewsModal}
          onClose={() => setShowReviewsModal(false)}
          title="Sheet Ratings & Feedback"
          size="lg"
        >
          <SheetReviewsSection
            sheetId={sheet.id}
            currentUserId={currentUserId}
            isStaff={isInstructor}
            reviews={reviewsData.reviews}
            userReview={reviewsData.userReview}
            stats={reviewsData.stats}
            inModal={true}
          />
        </Modal>
      )}

      {/* Modals */}
      <Modal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        title="TCS NQT Complete Prep Leaderboard"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
          {leaderboardList.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', textAlign: 'center', padding: '20px 0' }}>
              Be the first to solve TCS Prep &amp; Mock questions on this sheet!
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
                  background: row.isCurrentUser ? 'rgba(6, 182, 212, 0.12)' : 'var(--bg-secondary)',
                  border: row.isCurrentUser ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid var(--border-default)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 800, color: idx < 3 ? '#f59e0b' : 'var(--text-secondary)', width: '24px' }}>
                    #{idx + 1}
                  </span>
                  <UserAvatar url={row.avatar_url} name={row.name} size={32} />
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{row.name}</span>
                </div>
                <span className="sql-color-query" style={{ fontSize: '13px', fontWeight: 800 }}>
                  {row.solvedCount} / {stats.totalItems}
                </span>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showEnrolledModal}
        onClose={() => setShowEnrolledModal(false)}
        title={`Enrolled Learners (${totalEnrolledCount})`}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
          {enrolledUsersList.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', textAlign: 'center', padding: '20px 0' }}>
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
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <UserAvatar url={u.avatar_url} name={u.name} size={32} />
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
              </div>
            ))
          )}
        </div>
      </Modal>

      {certificate && (
        <Modal
          isOpen={showCertModal}
          onClose={() => setShowCertModal(false)}
          title="TCS NQT Complete Mastery Certificate"
          size="lg"
        >
          <CertificateRenderer cert={certificate} canEditSettings={false} />
        </Modal>
      )}

      {canEdit && (
        <SheetEditorModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          sheet={sheet}
          sheetType="TCS_PREP"
          questions={questions}
          initialTab={editModalTab}
          initialQuestionKey={editTargetQNum}
          onSheetMetaSaved={(upd) => {
            setSheet((prev) => ({ ...prev, ...upd }));
            router.refresh();
          }}
          onQuestionSaved={(updQ) => {
            setQuestions((prev) =>
              prev.map((item) => (item.question_number === updQ.question_number ? { ...item, ...updQ } : item))
            );
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

