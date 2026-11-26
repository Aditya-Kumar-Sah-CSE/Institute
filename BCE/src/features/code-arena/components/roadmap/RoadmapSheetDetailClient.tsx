'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronUp,
  Circle,
  Code2,
  Flame,
  Layers,
  Lock,
  Search,
  Share2,
  Sparkles,
  Star,
  Trophy,
  Unlock,
  Users,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import UserAvatar from '@/components/shared/UserAvatar';
import CertificateRenderer from '../CertificateRenderer';
import SheetReviewsSection from '../SheetReviewsSection';
import RoadmapProblemWorkbench from './RoadmapProblemWorkbench';
import {
  RoadmapRevisionView,
  RoadmapTheoryModulesView,
} from './RoadmapTheoryAndRevision';
import type {
  RoadmapLevel,
  RoadmapProblem,
  RoadmapProblemProgress,
} from '@/features/code-arena/data/roadmapSheetTypes';
import '@/features/code-arena/components/CodeArena.css';
import './RoadmapSheet.css';

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

interface RoadmapSheetDetailClientProps {
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
  levels: RoadmapLevel[];
  problems: RoadmapProblem[];
  initialProgress: RoadmapProblemProgress[];
  totalEnrolledCount?: number;
  enrolledUsersList?: EnrolledUserRow[];
  totalSolversCount?: number;
  leaderboardList?: LeaderboardRow[];
  initialCertificate?: any;
  reviewsData?: {
    reviews: any[];
    userReview: any | null;
    stats: {
      totalReviews: number;
      averageRating: number;
      breakdown: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
      };
    };
  };
  currentUserId?: string;
  isInstructor?: boolean;
  isPublicPreview?: boolean;
}

export default function RoadmapSheetDetailClient({
  sheet,
  levels,
  problems,
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
}: RoadmapSheetDetailClientProps) {
  const router = useRouter();

  const [progressMap, setProgressMap] = useState<Record<string, RoadmapProblemProgress>>(() => {
    const m: Record<string, RoadmapProblemProgress> = {};
    for (const p of initialProgress || []) {
      m[p.problem_code] = p;
    }
    return m;
  });

  const unlockedLevels = useMemo(() => levels.filter((l) => l.is_unlocked), [levels]);
  const [selectedLevelNum, setSelectedLevelNum] = useState<number>(
    unlockedLevels[0]?.level_number || 1
  );
  const [lockedPreviewLevel, setLockedPreviewLevel] = useState<RoadmapLevel | null>(null);

  const [activeTab, setActiveTab] = useState<'problems' | 'theory' | 'revision'>('problems');
  const [focusMode, setFocusMode] = useState(false);
  const [solvingFocus, setSolvingFocus] = useState(false);
  const [showHeaderInFocus, setShowHeaderInFocus] = useState(false);

  const isSolvingFocus = solvingFocus || focusMode;
  const hideTopHero = isSolvingFocus && !showHeaderInFocus;

  // Filters inside Problems Workspace
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SOLVED' | 'UNSOLVED' | 'REVISED' | 'BOOKMARKED' | 'SELF_TEST'>('ALL');

  const [selectedProblemCode, setSelectedProblemCode] = useState<string>(
    problems[0]?.problem_code || 'L1-001'
  );
  const [xpBanner, setXpBanner] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Modals & Certificate
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showEnrolledModal, setShowEnrolledModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [certificate, setCertificate] = useState<any>(initialCertificate);
  const [showCertModal, setShowCertModal] = useState(false);
  const [claimingCert, setClaimingCert] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);

  const activeLevelObj = useMemo(
    () => levels.find((l) => l.level_number === selectedLevelNum) || levels[0],
    [levels, selectedLevelNum]
  );

  const problemsByCode = useMemo(() => {
    const m: Record<string, RoadmapProblem> = {};
    for (const p of problems) m[p.problem_code] = p;
    return m;
  }, [problems]);

  const selfTestBlock = useMemo(() => {
    const rev = activeLevelObj?.revision_data;
    if (!rev) return null;
    return (
      rev[`self_test_before_level_${selectedLevelNum + 1}`] ||
      rev.self_test_before_level_2 ||
      rev.self_test_before_level_3 ||
      null
    );
  }, [activeLevelObj, selectedLevelNum]);

  const selfTestIdSet = useMemo(() => {
    const ids = selfTestBlock?.problem_ids || [];
    return new Set(ids);
  }, [selfTestBlock]);

  const levelProblems = useMemo(
    () => problems.filter((p) => p.level_number === selectedLevelNum),
    [problems, selectedLevelNum]
  );

  const availableTopics = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of levelProblems) {
      counts[p.topic] = (counts[p.topic] || 0) + 1;
    }
    return Object.entries(counts);
  }, [levelProblems]);

  const availableCompanies = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of levelProblems) {
      for (const c of p.company_tags || []) {
        counts[c] = (counts[c] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [levelProblems]);

  const filteredProblems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return levelProblems.filter((p) => {
      if (topicFilter !== 'ALL' && p.topic !== topicFilter) return false;
      if (companyFilter !== 'ALL' && !(p.company_tags || []).includes(companyFilter)) return false;
      if (difficultyFilter !== 'ALL' && p.difficulty !== difficultyFilter) return false;

      const prog = progressMap[p.problem_code];
      if (statusFilter === 'SOLVED' && !prog?.is_solved) return false;
      if (statusFilter === 'UNSOLVED' && prog?.is_solved) return false;
      if (statusFilter === 'REVISED' && !prog?.is_revised) return false;
      if (statusFilter === 'BOOKMARKED' && !prog?.is_bookmarked) return false;
      if (statusFilter === 'SELF_TEST' && !selfTestIdSet.has(p.problem_code)) return false;

      if (!q) return true;
      return (
        p.problem_code.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.topic.toLowerCase().includes(q) ||
        p.problem_statement.toLowerCase().includes(q) ||
        (p.company_tags || []).some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [
    levelProblems,
    topicFilter,
    companyFilter,
    difficultyFilter,
    statusFilter,
    searchQuery,
    progressMap,
    selfTestIdSet,
  ]);

  const currentProblem = useMemo(() => {
    return (
      filteredProblems.find((p) => p.problem_code === selectedProblemCode) ||
      problemsByCode[selectedProblemCode] ||
      filteredProblems[0] ||
      levelProblems[0]
    );
  }, [filteredProblems, problemsByCode, selectedProblemCode, levelProblems]);

  const activeIdxInFiltered = useMemo(() => {
    if (!currentProblem) return 0;
    const idx = filteredProblems.findIndex((p) => p.problem_code === currentProblem.problem_code);
    return idx >= 0 ? idx : 0;
  }, [filteredProblems, currentProblem]);

  // Global & Level KPIs
  const stats = useMemo(() => {
    const totalUnlocked = problems.length;
    let solved = 0;
    let revised = 0;
    let bookmarked = 0;
    let totalXp = 0;
    let easyTotal = 0;
    let easySolved = 0;
    let medTotal = 0;
    let medSolved = 0;
    let lastSolvedCode: string | null = null;
    let lastSolvedTime = 0;

    for (const p of problems) {
      if (p.difficulty === 'EASY') easyTotal++;
      else if (p.difficulty === 'MEDIUM') medTotal++;

      const prog = progressMap[p.problem_code];
      if (prog?.is_solved) {
        solved++;
        totalXp += prog.xp_awarded || 0;
        if (p.difficulty === 'EASY') easySolved++;
        else if (p.difficulty === 'MEDIUM') medSolved++;
        const t = prog.solved_at ? new Date(prog.solved_at).getTime() : 0;
        if (t >= lastSolvedTime) {
          lastSolvedTime = t;
          lastSolvedCode = p.problem_code;
        }
      }
      if (prog?.is_revised) revised++;
      if (prog?.is_bookmarked) bookmarked++;
    }

    const pct = totalUnlocked > 0 ? Math.round((solved / totalUnlocked) * 100) : 0;
    return {
      totalUnlocked,
      plannedTotal: sheet.metadata?.planned_total_count || 520,
      solved,
      revised,
      bookmarked,
      totalXp,
      easyTotal,
      easySolved,
      medTotal,
      medSolved,
      pct,
      lastSolvedCode,
    };
  }, [problems, progressMap, sheet.metadata]);

  const handleSaveProgress = async (payload: {
    problemCode: string;
    levelNumber: number;
    isSolved?: boolean;
    isRevised?: boolean;
    isBookmarked?: boolean;
    submittedCode?: string;
    incrementAttempts?: boolean;
  }) => {
    // Optimistic update
    setProgressMap((prev) => {
      const existing = prev[payload.problemCode];
      return {
        ...prev,
        [payload.problemCode]: {
          problem_code: payload.problemCode,
          level_number: payload.levelNumber,
          is_solved:
            typeof payload.isSolved === 'boolean'
              ? existing?.is_solved
                ? true
                : payload.isSolved
              : Boolean(existing?.is_solved),
          is_revised:
            typeof payload.isRevised === 'boolean'
              ? payload.isRevised
              : Boolean(existing?.is_revised),
          is_bookmarked:
            typeof payload.isBookmarked === 'boolean'
              ? payload.isBookmarked
              : Boolean(existing?.is_bookmarked),
          submitted_code:
            payload.submittedCode !== undefined
              ? payload.submittedCode
              : existing?.submitted_code,
          language: 'cpp17',
          attempts: (existing?.attempts || 0) + (payload.incrementAttempts ? 1 : 0),
          xp_awarded: existing?.xp_awarded || 0,
          solved_at: payload.isSolved ? existing?.solved_at || new Date().toISOString() : existing?.solved_at,
        },
      };
    });

    if (isPublicPreview || !currentUserId) return;

    try {
      const res = await fetch(`/api/coding/sheets/${sheet.id}/roadmap-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setProgressMap((prev) => ({
          ...prev,
          [payload.problemCode]: json.data,
        }));
        if (json.xpAwarded && json.xpAwarded > 0) {
          setXpBanner(`+${json.xpAwarded} XP earned for mastering ${payload.problemCode}!`);
          setTimeout(() => setXpBanner(null), 3500);
          router.refresh();
        }
      }
    } catch (err) {
      console.error('Failed to persist roadmap progress:', err);
    }
  };

  const handleJumpToProblem = (query: string) => {
    const clean = query.trim().toUpperCase();
    // Exact code match like L1-045
    if (problemsByCode[clean]) {
      const target = problemsByCode[clean];
      setSelectedLevelNum(target.level_number);
      setTopicFilter('ALL');
      setCompanyFilter('ALL');
      setDifficultyFilter('ALL');
      setStatusFilter('ALL');
      setSearchQuery('');
      setSelectedProblemCode(clean);
      setActiveTab('problems');
      setSolvingFocus(true);
      setShowHeaderInFocus(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Numeric shortcut like "45" -> L1-045
    const num = Number(clean);
    if (Number.isFinite(num) && num >= 1) {
      const padded = `L${selectedLevelNum}-${String(Math.floor(num)).padStart(3, '0')}`;
      if (problemsByCode[padded]) {
        setTopicFilter('ALL');
        setCompanyFilter('ALL');
        setDifficultyFilter('ALL');
        setStatusFilter('ALL');
        setSearchQuery('');
        setSelectedProblemCode(padded);
        setActiveTab('problems');
        setSolvingFocus(true);
        setShowHeaderInFocus(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleCopyShareLink = () => {
    const sharePath = `/share/sheet/${sheet.slug || sheet.id}`;
    const fullUrl =
      typeof window !== 'undefined' ? `${window.location.origin}${sharePath}` : sharePath;
    navigator.clipboard.writeText(fullUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleClaimCertificate = async () => {
    if (certificate) {
      setShowCertModal(true);
      return;
    }
    setClaimingCert(true);
    setCertError(null);
    try {
      const res = await fetch(`/api/coding/sheets/${sheet.id}/certificate`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setCertificate(json.data);
        setShowCertModal(true);
      } else {
        setCertError(json.error || 'Complete all active roadmap problems to unlock certificate.');
        setTimeout(() => setCertError(null), 4000);
      }
    } catch (err: any) {
      setCertError(err?.message || 'Certificate claim failed');
    } finally {
      setClaimingCert(false);
    }
  };

  // Clear temporary locked level banner when switching back to unlocked level
  useEffect(() => {
    if (activeLevelObj?.is_unlocked) setLockedPreviewLevel(null);
  }, [activeLevelObj]);

  return (
    <div className={`rm-sheet-shell ${hideTopHero ? 'is-focus-solving' : ''}`}>
      {/* Top Header & Hero (auto-hidden when user starts solving so coding workspace stays cleanly focused) */}
      {!hideTopHero && (
        <div className="rm-top-bar">
        <div className="rm-top-left">
          <Link href={isPublicPreview ? '/' : '/code-arena/sheets'} className="rm-back-link">
            <ArrowLeft size={16} />
            {isPublicPreview ? 'Back to Home' : 'Back to DSA Practice Sheets'}
          </Link>

          <div className="rm-title-row">
            <h1 className="rm-sheet-h1">{sheet.title}</h1>
            <span className="rm-badge-primary">
              <Layers size={12} /> {stats.totalUnlocked} / {stats.plannedTotal} Problems Active
            </span>
            <span className="rm-badge-lang">
              <Code2 size={12} /> C++17 + Hinglish
            </span>
          </div>

          {sheet.description && <p className="rm-sheet-desc">{sheet.description}</p>}
        </div>

        <div className="rm-top-actions">
          {!isPublicPreview && (
            <>
              <button
                type="button"
                onClick={() => setShowLeaderboardModal(true)}
                className="rm-btn-outline"
              >
                <Trophy size={15} color="#f59e0b" /> Solvers ({totalSolversCount})
              </button>

              <button
                type="button"
                onClick={() => setShowEnrolledModal(true)}
                className="rm-btn-outline"
              >
                <Users size={15} color="#0284c7" /> Enrolled ({totalEnrolledCount})
              </button>

              {reviewsData && (
                <button
                  type="button"
                  onClick={() => setShowReviewsModal(true)}
                  className="rm-btn-outline"
                  title="View or Write Sheet Reviews"
                >
                  <Star size={15} color="#f59e0b" />
                  {reviewsData.stats?.averageRating ? `${reviewsData.stats.averageRating} / 5` : 'New'} ({reviewsData.stats?.totalReviews || 0})
                </button>
              )}

              <button
                type="button"
                onClick={handleClaimCertificate}
                disabled={claimingCert}
                className={stats.pct === 100 || certificate ? 'rm-btn-success' : 'rm-btn-outline'}
              >
                <Award size={15} />
                {certificate ? 'View Certificate' : claimingCert ? 'Issuing...' : 'Certificate'}
              </button>
            </>
          )}

          <button type="button" onClick={handleCopyShareLink} className="rm-btn-outline">
            {copiedShare ? <Check size={15} color="#10b981" /> : <Share2 size={15} />}
            {copiedShare ? 'Link Copied' : 'Share'}
          </button>

          {isPublicPreview && (
            <Link href="/login" className="rm-btn-primary" style={{ textDecoration: 'none' }}>
              Sign In To Run Code & Earn XP
            </Link>
          )}
        </div>
      </div>
      )}

      {/* Live XP / Certificate Feedback Banners */}
      {xpBanner && (
        <div
          className="rm-info-callout hinglish"
          style={{
            borderColor: 'rgba(16, 185, 129, 0.45)',
            background: 'rgba(16, 185, 129, 0.12)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Sparkles size={16} color="#059669" />
          <strong style={{ fontSize: '13.5px', color: '#059669' }}>{xpBanner}</strong>
        </div>
      )}

      {certError && (
        <div className="rm-info-callout edge">
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#d97706' }}>{certError}</span>
        </div>
      )}

      {/* Hero KPI + 5-Level Roadmap Selector */}
      {!hideTopHero && (
      <div className="rm-hero-grid">
        {/* Progress Panel */}
        <div className="rm-panel">
          <div className="rm-progress-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={18} color="#f59e0b" />
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                Mastery Progress ({stats.solved} / {stats.totalUnlocked} Unlocked)
              </span>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#0284c7' }}>
              {stats.pct}%
            </span>
          </div>

          <div className="rm-progress-track">
            <div className="rm-progress-fill" style={{ width: `${stats.pct}%` }} />
          </div>

          <div className="rm-kpi-grid">
            <div className="rm-kpi-tile">
              <span className="rm-kpi-label">Sheet XP</span>
              <span className="rm-kpi-value" style={{ color: '#059669' }}>
                +{stats.totalXp} XP
              </span>
            </div>
            <div className="rm-kpi-tile">
              <span className="rm-kpi-label">Easy / Medium</span>
              <span className="rm-kpi-value">
                {stats.easySolved}/{stats.easyTotal} • {stats.medSolved}/{stats.medTotal}
              </span>
            </div>
            <div className="rm-kpi-tile">
              <span className="rm-kpi-label">Revised</span>
              <span className="rm-kpi-value" style={{ color: '#7c3aed' }}>
                {stats.revised} / {stats.totalUnlocked}
              </span>
            </div>
            <div className="rm-kpi-tile">
              <span className="rm-kpi-label">Bookmarked</span>
              <span className="rm-kpi-value" style={{ color: '#d97706' }}>
                {stats.bookmarked}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
            {stats.lastSolvedCode && (
              <button
                type="button"
                className="rm-btn-outline"
                style={{ fontSize: '12px', padding: '5px 10px' }}
                onClick={() => handleJumpToProblem(stats.lastSolvedCode!)}
              >
                Last Solved: {stats.lastSolvedCode}
              </button>
            )}
            <button
              type="button"
              className="rm-btn-outline"
              style={{ fontSize: '12px', padding: '5px 10px' }}
              onClick={() => {
                setStatusFilter('SELF_TEST');
                setActiveTab('problems');
              }}
            >
              <Flame size={13} color="#f59e0b" /> Practice Self-Test ({selfTestIdSet.size || 0} Must-Know)
            </button>
          </div>
        </div>

        {/* 5-Level Roadmap Selector */}
        <div className="rm-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
              5-Level Roadmap Blueprint (~{stats.plannedTotal} Total Problems)
            </span>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
              TCS Digital, Infosys, Wipro, Cognizant, Capgemini & Product Edge
            </span>
          </div>

          <div className="rm-levels-grid">
            {levels.map((lvl) => {
              const lvlSolved = problems.filter(
                (p) => p.level_number === lvl.level_number && progressMap[p.problem_code]?.is_solved
              ).length;
              const isSelected = lvl.level_number === selectedLevelNum && !lockedPreviewLevel;

              return (
                <button
                  key={lvl.level_number}
                  type="button"
                  onClick={() => {
                    if (lvl.is_unlocked) {
                      setSelectedLevelNum(lvl.level_number);
                      setLockedPreviewLevel(null);
                    } else {
                      setLockedPreviewLevel(lvl);
                    }
                  }}
                  className={`rm-level-pill ${isSelected ? 'active' : ''} ${!lvl.is_unlocked ? 'locked' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: lvl.is_unlocked ? '#0284c7' : 'var(--text-muted, #64748b)' }}>
                      LEVEL {lvl.level_number}
                    </span>
                    {lvl.is_unlocked ? (
                      <Unlock size={12} color="#10b981" />
                    ) : (
                      <Lock size={12} color="#94a3b8" />
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>{lvl.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary, #475569)', fontWeight: 600 }}>
                    {lvl.is_unlocked
                      ? `${lvlSolved}/${lvl.target_problem_count} solved`
                      : `~${lvl.target_problem_count} coming soon`}
                  </div>
                </button>
              );
            })}
          </div>

          {lockedPreviewLevel && (
            <div className="rm-info-callout hinglish" style={{ marginTop: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '12.5px', color: '#0284c7' }}>
                  Level {lockedPreviewLevel.level_number}: {lockedPreviewLevel.title} (~{lockedPreviewLevel.target_problem_count} Problems) — Coming Next
                </strong>
                <button
                  type="button"
                  onClick={() => setLockedPreviewLevel(null)}
                  style={{ border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', color: '#0284c7' }}
                >
                  Dismiss
                </button>
              </div>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-primary, #0f172a)' }}>
                <strong>Focus:</strong> {lockedPreviewLevel.subtitle}. {lockedPreviewLevel.description}
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Primary Section Tabs */}
      <div className="rm-tabs-nav">
        <button
          type="button"
          onClick={() => { setShowHeaderInFocus(false); setActiveTab('problems'); }}
          className={`rm-tab-btn ${activeTab === 'problems' ? 'active' : ''}`}
        >
          <Code2 size={15} />
          Problems Workspace ({levelProblems.length})
        </button>

        <button
          type="button"
          onClick={() => { setShowHeaderInFocus(false); setActiveTab('theory'); }}
          className={`rm-tab-btn ${activeTab === 'theory' ? 'active' : ''}`}
        >
          <BookOpen size={15} />
          Concept Theory Modules ({activeLevelObj?.theory_modules?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => { setShowHeaderInFocus(false); setActiveTab('revision'); }}
          className={`rm-tab-btn ${activeTab === 'revision' ? 'active' : ''}`}
        >
          <Sparkles size={15} />
          Level {selectedLevelNum} Revision & Self-Test
        </button>

        {isSolvingFocus && (
          <button
            type="button"
            onClick={() => setShowHeaderInFocus((v) => !v)}
            className="rm-tab-btn rm-focus-info-btn"
            title={showHeaderInFocus ? 'Hide top header into Focus Mode' : 'Show level switcher, progress & reviews'}
          >
            {showHeaderInFocus ? <ChevronUp size={14} /> : <BarChart3 size={14} />}
            <span>{showHeaderInFocus ? 'Focus View' : `L${selectedLevelNum} · ${stats.pct}% · Sheet Info`}</span>
          </button>
        )}
      </div>

      {/* TAB 1: PROBLEMS WORKSPACE */}
      {activeTab === 'problems' && (
        <div className={`rm-workspace-split ${focusMode ? 'full-focus' : ''}`}>
          {/* Left Filter & Problem Directory Rail */}
          {!focusMode && (
            <div className="rm-directory-card">
              <div className="rm-filter-input-wrap">
                <Search size={14} style={{ position: 'absolute', left: '11px', color: 'var(--text-muted, #64748b)' }} />
                <input
                  type="text"
                  className="rm-filter-input"
                  placeholder="Search L1-012, anagram, TCS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="rm-filter-select-row">
                <select
                  className="rm-select"
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  aria-label="Filter by topic"
                >
                  <option value="ALL">All Topics ({levelProblems.length})</option>
                  {availableTopics.map(([topic, cnt]) => (
                    <option key={topic} value={topic}>
                      {topic} ({cnt})
                    </option>
                  ))}
                </select>

                <select
                  className="rm-select"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  aria-label="Filter by company"
                >
                  <option value="ALL">All Companies</option>
                  {availableCompanies.map(([comp, cnt]) => (
                    <option key={comp} value={comp}>
                      {comp} ({cnt})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rm-filter-select-row">
                <select
                  className="rm-select"
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value as any)}
                  aria-label="Filter by difficulty"
                >
                  <option value="ALL">All Difficulty</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>

                <select
                  className="rm-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  aria-label="Filter by status"
                >
                  <option value="ALL">All Status</option>
                  <option value="SOLVED">Solved</option>
                  <option value="UNSOLVED">Unsolved</option>
                  <option value="REVISED">Revised</option>
                  <option value="BOOKMARKED">Bookmarked</option>
                  <option value="SELF_TEST">Self-Test ({selfTestIdSet.size})</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>
                <span>Showing {filteredProblems.length} problems</span>
                {(topicFilter !== 'ALL' || companyFilter !== 'ALL' || difficultyFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTopicFilter('ALL');
                      setCompanyFilter('ALL');
                      setDifficultyFilter('ALL');
                      setStatusFilter('ALL');
                      setSearchQuery('');
                    }}
                    style={{ border: 'none', background: 'transparent', color: '#0284c7', fontWeight: 700, cursor: 'pointer', fontSize: '11.5px' }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <div className="rm-problem-list-scroll">
                {filteredProblems.length === 0 ? (
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)', textAlign: 'center', padding: '24px 8px' }}>
                    No problems match your filters.
                  </p>
                ) : (
                  filteredProblems.map((prob) => {
                    const prog = progressMap[prob.problem_code];
                    const isActive = currentProblem?.problem_code === prob.problem_code;
                    return (
                      <button
                        key={prob.problem_code}
                        type="button"
                        onClick={() => {
                          setSelectedProblemCode(prob.problem_code);
                          setSolvingFocus(true);
                          setShowHeaderInFocus(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`rm-problem-list-item ${isActive ? 'active' : ''}`}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7' }}>
                              {prob.problem_code}
                            </span>
                            <span className={`rm-diff-badge ${prob.difficulty}`}>{prob.difficulty}</span>
                            <span style={{ fontSize: '10.5px', color: 'var(--text-muted, #64748b)' }}>{prob.topic}</span>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '3px', lineHeight: 1.35 }}>
                            {prob.title}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          {prog?.is_bookmarked && <Bookmark size={13} color="#f59e0b" fill="#f59e0b" />}
                          {prog?.is_solved ? (
                            <CheckCircle2 size={16} color="#10b981" />
                          ) : (
                            <Circle size={15} color="#94a3b8" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Right Workbench */}
          {currentProblem ? (
            <RoadmapProblemWorkbench
              problem={currentProblem}
              positionIndex={activeIdxInFiltered}
              filteredTotal={Math.max(1, filteredProblems.length)}
              progress={progressMap[currentProblem.problem_code]}
              isPublicPreview={isPublicPreview}
              focusMode={focusMode}
              onToggleFocus={() => {
                setFocusMode((f) => {
                  const next = !f;
                  if (next) {
                    setSolvingFocus(true);
                    setShowHeaderInFocus(false);
                  }
                  return next;
                });
              }}
              hasPrev={activeIdxInFiltered > 0}
              hasNext={activeIdxInFiltered < filteredProblems.length - 1}
              onPrev={() => {
                if (activeIdxInFiltered > 0) {
                  setSelectedProblemCode(filteredProblems[activeIdxInFiltered - 1].problem_code);
                  setSolvingFocus(true);
                  setShowHeaderInFocus(false);
                }
              }}
              onNext={() => {
                if (activeIdxInFiltered < filteredProblems.length - 1) {
                  setSelectedProblemCode(filteredProblems[activeIdxInFiltered + 1].problem_code);
                  setSolvingFocus(true);
                  setShowHeaderInFocus(false);
                }
              }}
              onJumpToCode={handleJumpToProblem}
              onSaveProgress={handleSaveProgress}
              onStartSolving={() => {
                setSolvingFocus(true);
                setShowHeaderInFocus(false);
              }}
            />
          ) : (
            <div className="rm-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
              Select a problem from the directory to open the interactive C++17 & Hinglish workbench.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: THEORY MODULES */}
      {activeTab === 'theory' && activeLevelObj && (
        <RoadmapTheoryModulesView
          level={activeLevelObj}
          modules={activeLevelObj.theory_modules || []}
          onFilterByTopic={(topicName) => {
            setTopicFilter(topicName);
            setActiveTab('problems');
          }}
        />
      )}

      {/* TAB 3: LEVEL REVISION & SELF-TEST */}
      {activeTab === 'revision' && activeLevelObj && (
        <RoadmapRevisionView
          level={activeLevelObj}
          problemsByCode={problemsByCode}
          progressMap={progressMap}
          onSelectProblem={(pid) => handleJumpToProblem(pid)}
        />
      )}

      {/* Sheet Reviews Popup Modal */}
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

      {/* Leaderboard Modal */}
      <Modal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        title="DSA Roadmap Leaderboard"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
          {leaderboardList.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', textAlign: 'center', padding: '20px 0' }}>
              Be the first to solve problems on this roadmap!
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
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>
                  {row.solvedCount} / {stats.totalUnlocked}
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

      {/* Certificate Modal */}
      {certificate && (
        <Modal
          isOpen={showCertModal}
          onClose={() => setShowCertModal(false)}
          title="DSA Roadmap Certificate"
          size="lg"
        >
          <CertificateRenderer cert={certificate} canEditSettings={false} />
        </Modal>
      )}
    </div>
  );
}
