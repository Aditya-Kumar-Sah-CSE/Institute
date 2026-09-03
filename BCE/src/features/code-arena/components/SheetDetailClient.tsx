'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Trophy, ArrowLeft, BookOpen, CheckCircle2, Circle, 
  ExternalLink, Code2, ArrowRight, Award, Play, Pencil, Users,
  Lock, Shield, Globe, KeyRound, AlertCircle, Video, FileText, Share2, Check, BarChart2, Search, Image,
  RefreshCw, RotateCcw, Eye, Copy, ChevronLeft, ChevronRight, Star, Edit3
} from 'lucide-react';
import MobileCodeArenaToggle from './MobileCodeArenaToggle';
import Card from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import CreateSheetWizard from './CreateSheetWizard';
import Modal from '@/components/ui/Modal';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import SolutionEditor from './SolutionEditor';
import SheetReviewsSection from './SheetReviewsSection';
import { calculateMotivationalAnalytics } from '../lib/motivational-engine';
import { SolvedStatusMap } from '@/lib/coding-platforms/solved-matcher';
import './CodeArena.css';

type Problem = {
  id: string;
  title: string;
  difficulty: string;
  source_type: string;
  external_platform?: string;
  external_problem_id?: string;
  external_url?: string;
  tags?: string[];
  order_index: number;
  youtube_url?: string | null;
  text_solution?: string | null;
};

type Sheet = {
  id: string;
  slug?: string;
  title: string;
  description: string;
  created_by: string;
  enrollment_access?: string;
  enrollment_passcode?: string;
  problems: Problem[];
  attachment_url?: string | null;
  attachment_type?: string | null;
  youtube_url?: string | null;
};

type Solver = {
  id: string;
  name: string;
  avatar_url?: string;
  solvedCount: number;
};

export default function SheetDetailClient({
  sheet,
  solvedProblemIds,
  solvedStatusMap = {},
  isInstructor,
  currentUser,
  totalStudentsSolving = 0,
  totalEnrolledSolvers = 0,
  totalEnrolled = 0,
  avgQuestionsSolved = '0',
  solversLeaderboard = [],
  enrolledStudents = [],
  enrollmentAccess = 'public',
  isEnrolled: initialIsEnrolled = false,
  reviewsData,
}: {
  sheet: Sheet;
  solvedProblemIds: string[];
  solvedStatusMap?: SolvedStatusMap;
  isInstructor?: boolean;
  currentUser?: any;
  totalStudentsSolving?: number;
  totalEnrolledSolvers?: number;
  totalEnrolled?: number;
  avgQuestionsSolved?: string;
  solversLeaderboard?: Solver[];
  enrolledStudents?: { id: string; name: string; avatar_url?: string | null; email: string; enrolled_at?: string }[];
  enrollmentAccess?: string;
  isEnrolled?: boolean;
  reviewsData?: any;
}) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(initialIsEnrolled);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);
  const [showSolversModal, setShowSolversModal] = useState(false);
  const [solverSearch, setSolverSearch] = useState('');
  const [showEnrolledModal, setShowEnrolledModal] = useState(false);
  const [enrolledSearch, setEnrolledSearch] = useState('');

  // 5 problems per page pagination
  const [currentProblemPage, setCurrentProblemPage] = useState(1);
  const PROBLEMS_PER_PAGE = 5;

  const filteredSolvers = solversLeaderboard.filter(s =>
    s.name.toLowerCase().includes(solverSearch.toLowerCase())
  );

  const filteredEnrolled = enrolledStudents.filter(s =>
    s.name.toLowerCase().includes(enrolledSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(enrolledSearch.toLowerCase())
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCopyShareLink = async () => {
    const shareUrl = `${window.location.origin}/share/sheet/${sheet.slug || sheet.id}`;
    try {
      if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await navigator.share({
          title: sheet.title,
          text: `Check out this coding practice sheet: ${sheet.title}`,
          url: shareUrl,
        });
        return;
      }
    } catch {
      // Fallback
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      prompt('Copy public share link:', shareUrl);
    }
  };

  // Modals for YT Video and Text Solution
  const [activeVideoProblem, setActiveVideoProblem] = useState<Problem | null>(null);
  const [activeSolutionProblem, setActiveSolutionProblem] = useState<Problem | null>(null);
  const [editProblem, setEditProblem] = useState<Problem | null>(null);

  // Last Solution Modal State
  const [activeLastSubmissionProblem, setActiveLastSubmissionProblem] = useState<Problem | null>(null);
  const [lastSubmissionData, setLastSubmissionData] = useState<{
    id?: string;
    code?: string;
    language?: string;
    status?: string;
    runtime?: number;
    memory?: number;
    createdAt?: string;
    externalInfo?: { platform?: string; externalUrl?: string; title?: string } | null;
  } | null>(null);
  const [loadingLastSubmission, setLoadingLastSubmission] = useState(false);
  const [syncingAccounts, setSyncingAccounts] = useState(false);
  const [copiedSubmissionCode, setCopiedSubmissionCode] = useState(false);

  // Edit fields
  const [editYoutubeUrl, setEditYoutubeUrl] = useState('');
  const [editSolutionText, setEditSolutionText] = useState('');
  const [savingSolution, setSavingSolution] = useState(false);

  const handleSyncAccounts = async () => {
    setSyncingAccounts(true);
    try {
      await Promise.allSettled([
        fetch('/api/coding/accounts/LEETCODE/sync', { method: 'POST' }),
        fetch('/api/coding/accounts/CODEFORCES/sync', { method: 'POST' }),
        fetch('/api/coding/accounts/CODECHEF/sync', { method: 'POST' }),
        fetch('/api/coding/accounts/GEEKSFORGEEKS/sync', { method: 'POST' }),
      ]);
      router.refresh();
    } catch {
      // Ignore network errors
    } finally {
      setSyncingAccounts(false);
    }
  };

  const handleViewLastSolution = async (problem: Problem) => {
    setActiveLastSubmissionProblem(problem);
    setLoadingLastSubmission(true);
    setLastSubmissionData(null);
    setCopiedSubmissionCode(false);

    try {
      const res = await fetch(`/api/coding/problems/${problem.id}/last-submission`);
      const json = await res.json();

      if (res.ok && json.success) {
        if (json.data) {
          setLastSubmissionData(json.data);
        } else {
          setLastSubmissionData({ externalInfo: json.externalInfo });
        }
      } else {
        setLastSubmissionData(null);
      }
    } catch {
      setLastSubmissionData(null);
    } finally {
      setLoadingLastSubmission(false);
    }
  };
  
  // Motivational Engine State
  const [activityLog, setActivityLog] = useState<{date: string, problems_solved: number}[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  const problems = sheet.problems || [];
  const totalProblems = problems.length;
  const solvedProblems = problems.filter(p => solvedProblemIds.includes(p.id)).length;
  const progressPct = totalProblems > 0 ? Math.round((solvedProblems / totalProblems) * 100) : 0;
  const isCompleted = progressPct === 100 && totalProblems > 0;

  useEffect(() => {
    if (currentUser?.id) {
      fetch('/api/coding/activity')
        .then(res => res.json())
        .then(data => {
          if (data.activity) {
            setActivityLog(data.activity);
            setAnalytics(calculateMotivationalAnalytics(data.activity, totalProblems, solvedProblems));
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.id, totalProblems, solvedProblems]);

  const isCreator = currentUser?.id === sheet.created_by;
  const canEdit = isInstructor || isCreator;
  // Instructors/admins and creators bypass enrollment gate
  const hasAccess = canEdit || isEnrolled || enrollmentAccess === 'public';

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return '';
  };

  const handleWatchVideo = (problem: Problem) => {
    setActiveVideoProblem(problem);
  };

  const handleReadSolution = (problem: Problem) => {
    setActiveSolutionProblem(problem);
  };

  const handleEditSolution = (problem: Problem) => {
    setEditProblem(problem);
    setEditYoutubeUrl(problem.youtube_url || '');
    setEditSolutionText(problem.text_solution || '');
  };

  const handleSaveProblemSolution = async () => {
    if (!editProblem) return;
    setSavingSolution(true);
    try {
      const res = await fetch(`/api/coding/sheets/${sheet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: editProblem.id,
          youtube_url: editYoutubeUrl.trim(),
          text_solution: editSolutionText.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error?.message || 'Failed to save solution.');
      } else {
        setEditProblem(null);
        router.refresh();
      }
    } catch {
      alert('Network error. Failed to save solution.');
    } finally {
      setSavingSolution(false);
    }
  };

  const [claimingCert, setClaimingCert] = useState(false);
  const [certError, setCertError] = useState('');

  const handleClaimCertificate = async () => {
    setClaimingCert(true);
    setCertError('');
    try {
      const res = await fetch(`/api/coding/sheets/${sheet.id}/certificate`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setCertError(json.error || 'Failed to generate certificate.');
      } else if (json.data?.id) {
        router.push(`/certificates/${json.data.id}`);
      }
    } catch {
      setCertError('Network error while claiming certificate.');
    } finally {
      setClaimingCert(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    setEnrollError('');
    try {
      const body: any = {};
      if (enrollmentAccess === 'restricted') {
        body.passcode = passcodeInput.trim();
      }

      const res = await fetch(`/api/coding/sheets/${sheet.id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setEnrollError(json.error?.message || 'Enrollment failed.');
      } else {
        setIsEnrolled(true);
        router.refresh();
      }
    } catch {
      setEnrollError('Network error. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleScrollToReviews = () => {
    const section = document.getElementById('sheet-reviews-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="code-arena-page" suppressHydrationWarning style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', paddingBottom: '2rem' }}>
      <MobileCodeArenaToggle />

      {/* Header Bar */}
      <header className="code-arena-header-compact">

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} suppressHydrationWarning>
          <button
            type="button"
            onClick={handleSyncAccounts}
            disabled={syncingAccounts}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: syncingAccounts ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.05)',
              border: syncingAccounts ? '1px solid rgba(6,182,212,0.4)' : '1px solid var(--glass-border)',
              color: syncingAccounts ? 'var(--neon-cyan)' : 'var(--text-main)',
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: syncingAccounts ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Sync solved problems from connected LeetCode and Codeforces accounts"
          >
            <RefreshCw size={12} className={syncingAccounts ? 'spin-icon' : ''} />
            {syncingAccounts ? 'Syncing...' : 'Sync Connected Accounts'}
          </button>

          <button
            type="button"
            onClick={handleCopyShareLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: copiedShare ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)',
              border: copiedShare ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--glass-border)',
              color: copiedShare ? '#4ade80' : 'var(--text-main)',
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {copiedShare ? <Check size={12} /> : <Share2 size={12} />}
            {copiedShare ? 'Copied Link!' : 'Share Link'}
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-main)',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            >
              <Pencil size={12} /> Edit Sheet
            </button>
          )}
          {/* Access type badge */}
          {enrollmentAccess === 'public' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#4ade80', background: 'rgba(34,197,94,0.08)', padding: '3px 10px', borderRadius: '10px', fontWeight: 600 }}>
              <Globe size={12} /> Public
            </div>
          )}
          {enrollmentAccess === 'restricted' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#facc15', background: 'rgba(250,204,21,0.08)', padding: '3px 10px', borderRadius: '10px', fontWeight: 600 }}>
              <Shield size={12} /> Restricted
            </div>
          )}
          {enrollmentAccess === 'private' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#f87171', background: 'rgba(248,113,113,0.08)', padding: '3px 10px', borderRadius: '10px', fontWeight: 600 }}>
              <Lock size={12} /> Private
            </div>
          )}
        </div>
      </header>

      {/* Creator Analytics Panel */}
      {isCreator && (
        <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '16px 20px', borderRadius: 'var(--radius-md)', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Creator Analytics</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>{sheet.title}</div>
          </div>
          <div style={{ height: '30px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Total Problems</div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>{totalProblems}</div>
          </div>
          <div style={{ height: '30px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Students Solving</div>
            <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={14} className="text-neon-cyan" /> {totalStudentsSolving}
            </div>
          </div>
          <div style={{ height: '30px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Access</div>
            <div style={{ fontSize: '14px', fontWeight: 700, textTransform: 'capitalize' }}>{enrollmentAccess}</div>
          </div>
        </div>
      )}

      {/* Hero Overview */}
      <div 
        style={{ 
          background: 'rgba(20,20,25,0.4)', 
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: '0 0 6px 0' }} className="text-gradient">
            {sheet.title}
          </h2>
          <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', margin: '0 0 12px 0', maxWidth: '520px' }}>
            {sheet.description || 'Practice curated coding questions.'}
          </p>

          {/* Reference Material & Video Explanation Section */}
          {(sheet.attachment_url || sheet.youtube_url) && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {sheet.youtube_url && (
                <button
                  type="button"
                  onClick={() => setActiveVideoProblem({ id: 'sheet-overview-video', title: sheet.title, difficulty: '', source_type: '', order_index: -1, youtube_url: sheet.youtube_url })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; }}
                >
                  <Video size={14} fill="currentColor" style={{ opacity: 0.8 }} /> Watch Explanation Video
                </button>
              )}

              {sheet.attachment_url && (
                <a
                  href={sheet.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: sheet.attachment_type === 'pdf' ? 'rgba(239,68,68,0.06)' : 'rgba(6,182,212,0.08)',
                    border: sheet.attachment_type === 'pdf' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(6,182,212,0.25)',
                    color: sheet.attachment_type === 'pdf' ? '#f87171' : 'var(--neon-cyan)',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = sheet.attachment_type === 'pdf' ? 'rgba(239,68,68,0.12)' : 'rgba(6,182,212,0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = sheet.attachment_type === 'pdf' ? 'rgba(239,68,68,0.06)' : 'rgba(6,182,212,0.08)'; }}
                >
                  {sheet.attachment_type === 'pdf' ? <FileText size={14} /> : <Image size={14} />}
                  {sheet.attachment_type === 'pdf' ? 'Download Reference PDF' : 'View Reference Image'}
                </a>
              )}
            </div>
          )}

          {/* Community Solver Stats Bar — Visible to Everyone */}
          <div className="sheet-stats-container">
            {/* Box 1: Enrolled */}
            <div 
              onClick={() => setShowEnrolledModal(true)}
              className="sheet-stat-box clickable"
            >
              <Users size={15} style={{ color: 'var(--neon-cyan)' }} />
              <div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>ENROLLED</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>{totalEnrolled} Students</div>
              </div>
            </div>

            {/* Box 2: Solver Enrolled */}
            <div className="sheet-stat-box">
              <CheckCircle2 size={15} style={{ color: '#10b981' }} />
              <div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>SOLVER ENROLLED</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>{totalStudentsSolving} Students</div>
              </div>
            </div>

            {/* Box 3: Avg Questions Solved */}
            <div className="sheet-stat-box">
              <BarChart2 size={15} style={{ color: 'var(--neon-purple)' }} />
              <div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>AVG QUESTIONS</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>{avgQuestionsSolved} / {totalProblems}</div>
              </div>
            </div>

            {/* Box 4: View All Solvers */}
            <div 
              onClick={() => setShowSolversModal(true)}
              className="sheet-stat-box clickable"
            >
              <Trophy size={15} style={{ color: '#fbbf24' }} />
              <div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>VIEW ALL SOLVER</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Leaderboard ({solversLeaderboard.length})
                  {solversLeaderboard.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
                      {solversLeaderboard.slice(0, 3).map((solver, idx) => (
                        <div
                          key={solver.id}
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: '1px solid #18181b',
                            marginLeft: idx > 0 ? '-4px' : '0',
                            overflow: 'hidden',
                            background: '#1e293b',
                            position: 'relative',
                          }}
                          title={`#${idx + 1} ${solver.name}`}
                        >
                          <img
                            src={solver.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(solver.name)}&background=06b6d4&color=fff`}
                            alt={solver.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rating & Review Now Header Card — Red Box Area */}
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-end', 
            gap: '10px', 
            padding: '16px 20px', 
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.85) 100%)', 
            borderRadius: '16px', 
            border: '1px solid rgba(245, 158, 11, 0.3)', 
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(12px)',
            minWidth: '210px'
          }}
        >
          <div 
            onClick={handleScrollToReviews}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'transform 0.2s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            title="Click to view all sheet ratings and student feedback"
          >
            <Star size={24} style={{ color: '#f59e0b', fill: '#f59e0b', filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.7))' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                  {reviewsData?.stats?.averageRating ? reviewsData.stats.averageRating : '5.0'}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ 5.0</span>
              </div>
              <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>
                {reviewsData?.stats?.totalReviews ? `${reviewsData.stats.totalReviews} ${reviewsData.stats.totalReviews === 1 ? 'review' : 'reviews'}` : 'New Sheet'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleScrollToReviews}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              padding: '8px 16px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#000000',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(245, 158, 11, 0.35)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { 
              e.currentTarget.style.transform = 'translateY(-1px)'; 
              e.currentTarget.style.boxShadow = '0 0 22px rgba(245, 158, 11, 0.5)'; 
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.transform = 'translateY(0)'; 
              e.currentTarget.style.boxShadow = '0 0 16px rgba(245, 158, 11, 0.35)'; 
            }}
          >
            <Edit3 size={14} /> {reviewsData?.userReview ? 'Edit Your Review' : 'Review Now'}
          </button>
        </div>

        {hasAccess && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '10px', flex: '1 1 260px', minWidth: 0 }}>
            {analytics ? (
               <div style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                     <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>TGT TODAY</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--neon-cyan)' }}>{analytics.targetToday} Problems</div>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>EXP. FINISH</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{analytics.expectedFinishDate}</div>
                     </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '12px', borderLeft: '2px solid var(--neon-purple)', paddingLeft: '8px' }}>
                     "{analytics.quote}"
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>PROGRESS {progressPct}%</span>
                    <span style={{ color: isCompleted ? '#22c55e' : 'var(--neon-cyan)' }}>
                      {solvedProblems}/{totalProblems}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${progressPct}%`, 
                        height: '100%', 
                        background: isCompleted ? 'linear-gradient(90deg, #22c55e, #4ade80)' : 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }} 
                    />
                  </div>
               </div>
            ) : (
               <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold' }}>
                   <span style={{ color: 'var(--text-secondary)' }}>TOTAL PROGRESS</span>
                   <span style={{ color: isCompleted ? '#22c55e' : 'var(--neon-cyan)' }}>
                     {progressPct}% ({solvedProblems}/{totalProblems})
                   </span>
                 </div>
                 <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                   <div 
                     style={{ 
                       width: `${progressPct}%`, 
                       height: '100%', 
                       background: isCompleted ? 'linear-gradient(90deg, #22c55e, #4ade80)' : 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))',
                       borderRadius: '4px',
                       transition: 'width 0.4s ease'
                     }} 
                   />
                 </div>
               </div>
            )}

            {isCompleted && (
              <button
                type="button"
                onClick={handleClaimCertificate}
                disabled={claimingCert}
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                  border: 'none',
                  color: '#000',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: claimingCert ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 0 12px rgba(251, 191, 36, 0.3)',
                  transition: 'all 0.2s ease',
                  marginTop: '8px'
                }}
              >
                <Award size={14} /> {claimingCert ? 'Generating...' : '🏆 View Certificate'}
              </button>
            )}

            {certError && (
              <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 600 }}>
                {certError}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Enrollment Gate — shown when student doesn't have access */}
      {!hasAccess && (
        <div style={{
          background: 'rgba(20,20,25,0.6)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '16px',
        }}>
          {enrollmentAccess === 'restricted' ? (
            <>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(250,204,21,0.1)', border: '2px solid rgba(250,204,21,0.3)',
                display: 'grid', placeItems: 'center', color: '#facc15',
              }}>
                <KeyRound size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: '0 0 6px 0' }}>Enrollment Required</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, maxWidth: '400px' }}>
                  This coding sheet requires a passcode to access. Enter the code provided by your instructor to enroll.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', maxWidth: '320px' }}>
                <input
                  type="text"
                  value={passcodeInput}
                  onChange={(e) => { setPasscodeInput(e.target.value); setEnrollError(''); }}
                  placeholder="Enter passcode..."
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-main)',
                    fontSize: 'var(--text-sm)',
                    outline: 'none',
                    fontFamily: 'monospace',
                    letterSpacing: '1px',
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && passcodeInput.trim()) handleEnroll(); }}
                />
                <button
                  type="button"
                  onClick={handleEnroll}
                  disabled={enrolling || !passcodeInput.trim()}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '10px 20px', borderRadius: 'var(--radius-sm)',
                    background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                    border: 'none', color: 'white', fontSize: '13px', fontWeight: 700,
                    cursor: enrolling ? 'wait' : 'pointer', opacity: enrolling || !passcodeInput.trim() ? 0.5 : 1,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  {enrolling ? 'Enrolling...' : 'Enroll'}
                </button>
              </div>
              {enrollError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#f87171', fontWeight: 600 }}>
                  <AlertCircle size={14} /> {enrollError}
                </div>
              )}
            </>
          ) : (
            /* Private sheet — no way to self-enroll */
            <>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(248,113,113,0.1)', border: '2px solid rgba(248,113,113,0.3)',
                display: 'grid', placeItems: 'center', color: '#f87171',
              }}>
                <Lock size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: '0 0 6px 0' }}>Enrollment Restricted</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, maxWidth: '400px' }}>
                  You don&apos;t currently have permission to enroll in this coding sheet. Contact your instructor for access.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Problems Checklist — only shown when user has access */}
      {hasAccess && (() => {
        const totalProblemPages = Math.max(1, Math.ceil(problems.length / PROBLEMS_PER_PAGE));
        const startProblemIdx = (currentProblemPage - 1) * PROBLEMS_PER_PAGE;
        const pagedProblems = problems.slice(startProblemIdx, startProblemIdx + PROBLEMS_PER_PAGE);

        return (
          <section className="arena-problems-section" style={{ marginTop: '8px' }}>
            <h3 className="split-sect-title" style={{ fontSize: 'var(--text-md)', fontWeight: 800, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Problems List ({totalProblems})</span>
              {totalProblemPages > 1 && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Page {currentProblemPage} of {totalProblemPages}
                </span>
              )}
            </h3>

            <div className="practice-rows-list">
              {pagedProblems.map((problem, idx) => {
                const overallIndex = startProblemIdx + idx + 1;
                const status = solvedStatusMap[problem.id];
                const isSolved = status ? status.isSolved : solvedProblemIds.includes(problem.id);
                const sources = status?.sources || (isSolved ? ['ARENA'] : []);

                return (
                  <div 
                    key={problem.id}
                    className="practice-row-item"
                    style={{ 
                      textDecoration: 'none', 
                      cursor: 'default',
                      border: isSolved ? '1px solid rgba(6, 182, 212, 0.25)' : '1px solid var(--glass-border)',
                      background: isSolved ? 'rgba(6, 182, 212, 0.03)' : 'rgba(255,255,255,0.01)',
                    }}
                  >
                    <div className="row-item-left">
                      {/* Solved Status Indicator */}
                      <div className="solve-status-box" style={{ cursor: 'pointer' }}>
                        {isSolved ? (
                          <CheckCircle2 size={18} className="text-neon-cyan" />
                        ) : (
                          <Circle size={18} className="text-muted" />
                        )}
                      </div>

                      <div className="row-problem-meta" style={{ marginLeft: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="row-problem-title" style={{ fontWeight: 700, fontSize: '13px' }}>
                            {overallIndex}. {problem.title}
                          </span>

                          {/* Solved Platform Badges */}
                          {isSolved && (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              {sources.includes('LEETCODE') && (
                                <span style={{ fontSize: '9px', fontWeight: 700, color: '#f97316', background: 'rgba(249, 115, 22, 0.12)', border: '1px solid rgba(249, 115, 22, 0.3)', padding: '1px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Check size={10} /> Solved on LeetCode
                                </span>
                              )}
                              {sources.includes('CODEFORCES') && (
                                <span style={{ fontSize: '9px', fontWeight: 700, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '1px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Check size={10} /> Solved on Codeforces
                                </span>
                              )}
                              {sources.includes('ARENA') && (
                                <span style={{ fontSize: '9px', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Check size={10} /> Solved in Arena
                                </span>
                              )}
                              {sources.length === 0 && (
                                <span style={{ fontSize: '9px', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Check size={10} /> Solved
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="row-tags-group">
                          <span className="source-label" style={{ fontSize: '9px', padding: '1px 6px' }}>
                            {problem.source_type}
                          </span>
                          {problem.tags?.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="tag-pill" style={{ fontSize: '9px' }}>#{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="row-item-right" style={{ gap: '10px' }}>
                      <span suppressHydrationWarning className={`difficulty-badge-styled difficulty-${problem.difficulty}`} style={{ fontSize: '9px' }}>
                        {problem.difficulty}
                      </span>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* View Last Solution Button for Solved Problems */}
                        {isSolved && (
                          <button
                            type="button"
                            onClick={() => handleViewLastSolution(problem)}
                            className="oj-icon-btn"
                            title="View Last Submitted Solution"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              background: 'rgba(6, 182, 212, 0.1)',
                              border: '1px solid rgba(6, 182, 212, 0.3)',
                              borderRadius: '6px',
                              color: 'var(--neon-cyan)',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={12} /> Last Sol
                          </button>
                        )}

                        {/* Ask YT Button */}
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(problem.title || problem.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="oj-icon-btn"
                          title="Ask YT - Search on YouTube"
                          style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', textDecoration: 'none' }}
                        >
                          <Search size={13} />
                        </a>

                        {/* Video Solution button if present */}
                        {problem.youtube_url && (
                          <button
                            type="button"
                            onClick={() => handleWatchVideo(problem)}
                            className="oj-icon-btn"
                            title="Watch Video Solution"
                            style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#ef4444', cursor: 'pointer' }}
                          >
                            <Video size={13} />
                          </button>
                        )}

                        {/* Text Solution button if present */}
                        {problem.text_solution && (
                          <button
                            type="button"
                            onClick={() => handleReadSolution(problem)}
                            className="oj-icon-btn"
                            title="Read Text Solution"
                            style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '6px', color: '#a855f7', cursor: 'pointer' }}
                          >
                            <FileText size={13} />
                          </button>
                        )}

                        {/* Instructor Edit Solution button */}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleEditSolution(problem)}
                            className="oj-icon-btn"
                            title="Manage Solution & Video"
                            style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer' }}
                          >
                            <Pencil size={12} />
                          </button>
                        )}

                        {/* Official External Link if present */}
                        {problem.external_url && (
                          <a 
                            href={problem.external_url}
                            target="_blank"
                            rel="noreferrer"
                            className="oj-icon-btn"
                            title="View Official Statement"
                            style={{ display: 'grid', placeItems: 'center', width: '32px', height: '32px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-muted)' }}
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}

                        {/* Reattempt / Solve Button */}
                        {isSolved ? (
                          <Link
                            href={`/code-arena/problems/${problem.id}?sheet=${sheet.id}&reattempt=true`}
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              padding: '6px 12px', 
                              borderRadius: '6px', 
                              fontSize: '11px', 
                              fontWeight: 'bold',
                              height: '32px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--glass-border)',
                              color: 'var(--text-main)',
                              textDecoration: 'none',
                            }}
                            title="Solve clean starter code again"
                          >
                            <RotateCcw size={12} /> Reattempt
                          </Link>
                        ) : (
                          <Link
                            href={`/code-arena/problems/${problem.id}?sheet=${sheet.id}`}
                            className="btn-battle-action action-live"
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              padding: '6px 14px', 
                              borderRadius: '6px', 
                              fontSize: '11px', 
                              fontWeight: 'bold',
                              height: '32px',
                              textDecoration: 'none'
                            }}
                          >
                            <Play size={12} fill="currentColor" /> Solve in Arena
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 5-Problems Per Page Pagination Bar */}
            {totalProblemPages > 1 && (() => {
              const getVisiblePageNumbers = (current: number, total: number) => {
                if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
                if (current <= 3) return [1, 2, 3, 4, '...', total];
                if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
                return [1, '...', current - 1, current, current + 1, '...', total];
              };

              const pageNumbers = getVisiblePageNumbers(currentProblemPage, totalProblemPages);

              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '16px', padding: '12px 16px', background: 'rgba(20, 20, 25, 0.4)', borderRadius: '12px', border: '1px solid var(--glass-border)', maxWidth: '100%' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Showing <strong style={{ color: 'var(--text-main)' }}>{startProblemIdx + 1}–{Math.min(startProblemIdx + PROBLEMS_PER_PAGE, problems.length)}</strong> of <strong style={{ color: 'var(--neon-cyan)' }}>{problems.length}</strong> problems
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', maxWidth: '100%', overflowX: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => setCurrentProblemPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentProblemPage === 1}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: currentProblemPage === 1 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--glass-border)',
                        color: currentProblemPage === 1 ? 'var(--text-muted)' : 'var(--text-main)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: currentProblemPage === 1 ? 'not-allowed' : 'pointer',
                        opacity: currentProblemPage === 1 ? 0.5 : 1,
                      }}
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>

                    {pageNumbers.map((pageNum, idx) => {
                      if (pageNum === '...') {
                        return (
                          <span key={`dots-${idx}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>
                            ...
                          </span>
                        );
                      }

                      const pNum = pageNum as number;
                      return (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() => setCurrentProblemPage(pNum)}
                          style={{
                            minWidth: '32px',
                            height: '32px',
                            padding: '0 6px',
                            borderRadius: '8px',
                            background: currentProblemPage === pNum ? 'linear-gradient(135deg, var(--neon-cyan), #3b82f6)' : 'rgba(255,255,255,0.04)',
                            border: currentProblemPage === pNum ? 'none' : '1px solid var(--glass-border)',
                            color: currentProblemPage === pNum ? '#000' : 'var(--text-secondary)',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {pNum}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setCurrentProblemPage(prev => Math.min(prev + 1, totalProblemPages))}
                      disabled={currentProblemPage === totalProblemPages}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: currentProblemPage === totalProblemPages ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--glass-border)',
                        color: currentProblemPage === totalProblemPages ? 'var(--text-muted)' : 'var(--text-main)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: currentProblemPage === totalProblemPages ? 'not-allowed' : 'pointer',
                        opacity: currentProblemPage === totalProblemPages ? 0.5 : 1,
                      }}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })()}
          </section>
        );
      })()}

      {/* Practice Sheet Reviews Section */}
      <div id="sheet-reviews-section" style={{ marginTop: 'var(--space-lg)' }}>
        <SheetReviewsSection
          sheetId={sheet.id}
          currentUserId={currentUser?.id}
          isStaff={Boolean(isInstructor)}
          reviews={reviewsData?.reviews || []}
          userReview={reviewsData?.userReview || null}
          stats={reviewsData?.stats || { averageRating: 0, totalReviews: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } }}
        />
      </div>

      {isEditing && (
        <CreateSheetWizard 
          initialSheet={sheet}
          onClose={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            router.refresh();
          }}
        />
      )}

      {/* Video Modal */}
      <Modal
        isOpen={activeVideoProblem !== null}
        onClose={() => setActiveVideoProblem(null)}
        title={activeVideoProblem?.id === 'sheet-overview-video' ? `Video Explanation: ${activeVideoProblem.title}` : `Video Solution: ${activeVideoProblem?.title}`}
        size="lg"
      >
        {activeVideoProblem?.youtube_url && getYoutubeEmbedUrl(activeVideoProblem.youtube_url) ? (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--glass-border)', background: '#000' }}>
            <iframe
              src={getYoutubeEmbedUrl(activeVideoProblem.youtube_url)}
              title="Video Solution"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              This video cannot be embedded. Click the link below to watch:
            </p>
            <a
              href={activeVideoProblem?.youtube_url || '#'}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: '#ef4444',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 'bold',
              }}
            >
              <ExternalLink size={16} /> Open Video Solution
            </a>
          </div>
        )}
      </Modal>

      {/* Read Solution Modal */}
      <Modal
        isOpen={activeSolutionProblem !== null}
        onClose={() => setActiveSolutionProblem(null)}
        title={`Text Solution: ${activeSolutionProblem?.title}`}
        size="lg"
      >
        <div style={{ maxHeight: 'calc(80vh - 120px)', overflowY: 'auto', paddingRight: '8px' }}>
          {activeSolutionProblem?.text_solution ? (
            <MarkdownRenderer content={activeSolutionProblem.text_solution} />
          ) : (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
              No text solution available.
            </p>
          )}
        </div>
      </Modal>

      {/* Edit Solution Modal */}
      <Modal
        isOpen={editProblem !== null}
        onClose={() => setEditProblem(null)}
        title={`Manage Solution & Video: ${editProblem?.title}`}
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
              YouTube Video URL
            </label>
            <input
              type="text"
              placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              value={editYoutubeUrl}
              onChange={(e) => setEditYoutubeUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-card)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-main)',
                fontSize: 'var(--text-sm)',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Supports standard YouTube video URLs and share links.
            </span>
          </div>

          <SolutionEditor
            value={editSolutionText}
            onChange={setEditSolutionText}
            onSave={handleSaveProblemSolution}
            saving={savingSolution}
            onCancel={() => setEditProblem(null)}
            title="Text Solution (Markdown Supported)"
          />
        </div>
      </Modal>

      {/* View All Solvers & Top Performers Modal */}
      <Modal
        isOpen={showSolversModal}
        onClose={() => setShowSolversModal(false)}
        title="🏆 Sheet Leaderboard & Top Performers"
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }}>
          {/* Summary Stats */}
          <div className="summary-stats-grid" style={{ gap: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL SOLVERS</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--neon-cyan)' }}>{solversLeaderboard.length} Students</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL PROBLEMS</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#facc15' }}>{totalProblems} Questions</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>AVG QUESTIONS SOLVED</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--neon-purple)' }}>{avgQuestionsSolved}</div>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search solver by name..."
              value={solverSearch}
              onChange={(e) => setSolverSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-main)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Top 3 Podium Highlights if search is empty */}
          {!solverSearch && solversLeaderboard.length >= 3 && (
            <div className="podium-grid" style={{ gap: '10px', margin: '4px 0 8px 0', paddingBottom: '4px' }}>
              {/* 2nd Place */}
              <div style={{ background: 'rgba(148, 163, 184, 0.08)', border: '1px solid rgba(148, 163, 184, 0.3)', borderRadius: '10px', padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#cbd5e1', marginBottom: '4px' }}>🥈 2nd Place</div>
                <img
                  src={solversLeaderboard[1].avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(solversLeaderboard[1].name)}&background=94a3b8&color=fff`}
                  alt={solversLeaderboard[1].name}
                  style={{ width: '38px', height: '38px', borderRadius: '50%', marginBottom: '6px', objectFit: 'cover' }}
                />
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{solversLeaderboard[1].name}</div>
                <div style={{ fontSize: '11px', color: 'var(--neon-cyan)', fontWeight: 800 }}>{solversLeaderboard[1].solvedCount} / {totalProblems}</div>
              </div>

              {/* 1st Place */}
              <div style={{ background: 'rgba(250, 204, 21, 0.1)', border: '1px solid rgba(250, 204, 21, 0.4)', borderRadius: '10px', padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'scale(1.03)', boxShadow: '0 0 15px rgba(250, 204, 21, 0.15)' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, color: '#facc15', marginBottom: '4px' }}>🏆 1st Place</div>
                <img
                  src={solversLeaderboard[0].avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(solversLeaderboard[0].name)}&background=facc15&color=000`}
                  alt={solversLeaderboard[0].name}
                  style={{ width: '42px', height: '42px', borderRadius: '50%', marginBottom: '6px', objectFit: 'cover', border: '2px solid #facc15' }}
                />
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{solversLeaderboard[0].name}</div>
                <div style={{ fontSize: '11px', color: '#facc15', fontWeight: 800 }}>{solversLeaderboard[0].solvedCount} / {totalProblems} Solved</div>
              </div>

              {/* 3rd Place */}
              <div style={{ background: 'rgba(217, 119, 6, 0.08)', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: '10px', padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#fbbf24', marginBottom: '4px' }}>🥉 3rd Place</div>
                <img
                  src={solversLeaderboard[2].avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(solversLeaderboard[2].name)}&background=d97706&color=fff`}
                  alt={solversLeaderboard[2].name}
                  style={{ width: '38px', height: '38px', borderRadius: '50%', marginBottom: '6px', objectFit: 'cover' }}
                />
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{solversLeaderboard[2].name}</div>
                <div style={{ fontSize: '11px', color: 'var(--neon-cyan)', fontWeight: 800 }}>{solversLeaderboard[2].solvedCount} / {totalProblems}</div>
              </div>
            </div>
          )}

          {/* Full Solvers Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredSolvers.map((solver) => {
              const rank = solversLeaderboard.findIndex(s => s.id === solver.id) + 1;
              const pct = totalProblems > 0 ? Math.round((solver.solvedCount / totalProblems) * 100) : 0;
              const isPerfect = pct === 100 && totalProblems > 0;

              return (
                <div
                  key={solver.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isPerfect ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                    border: isPerfect ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--glass-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, width: '28px', color: rank === 1 ? '#facc15' : rank === 2 ? '#cbd5e1' : rank === 3 ? '#fbbf24' : 'var(--text-muted)' }}>
                      #{rank}
                    </span>

                    <img
                      src={solver.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(solver.name)}&background=06b6d4&color=fff`}
                      alt={solver.name}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    />

                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {solver.name}
                        {isPerfect && <span style={{ fontSize: '10px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>🏆 Master</span>}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {pct}% Completed ({solver.solvedCount}/{totalProblems})
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '120px' }}>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: isPerfect ? 'linear-gradient(90deg, #22c55e, #4ade80)' : 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: isPerfect ? '#22c55e' : 'var(--neon-cyan)' }}>
                      {solver.solvedCount}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredSolvers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No solvers found matching "{solverSearch}".
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Enrolled Students Modal */}
      <Modal
        isOpen={showEnrolledModal}
        onClose={() => setShowEnrolledModal(false)}
        title="👥 Enrolled Students List"
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }}>
          {/* Summary Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL ENROLLED</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--neon-cyan)' }}>{enrolledStudents.length} Students</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>ENROLLMENT ACCESS</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--neon-purple)', textTransform: 'capitalize' }}>{enrollmentAccess}</div>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search student by name or email..."
              value={enrolledSearch}
              onChange={(e) => setEnrolledSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-main)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Students list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredEnrolled.map((student) => {
              const solverInfo = solversLeaderboard.find(s => s.id === student.id);
              const solvedCount = solverInfo ? solverInfo.solvedCount : 0;

              return (
                <div
                  key={student.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <img
                      src={student.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=a855f7&color=fff`}
                      alt={student.name}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {student.name}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {student.email || 'No email provided'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: solvedCount > 0 ? 'var(--neon-cyan)' : 'var(--text-muted)' }}>
                      {solvedCount} / {totalProblems} Solved
                    </span>
                    {student.enrolled_at && (
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        Enrolled {new Date(student.enrolled_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredEnrolled.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No enrolled students found matching "{enrolledSearch}".
              </div>
            )}
          </div>
        </div>
      </Modal>
      {/* View Last Solution Modal */}
      <Modal
        isOpen={activeLastSubmissionProblem !== null}
        onClose={() => setActiveLastSubmissionProblem(null)}
        title={`📜 Last Accepted Solution: ${activeLastSubmissionProblem?.title}`}
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto' }}>
          {loadingLastSubmission ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              Loading solution details...
            </div>
          ) : lastSubmissionData?.code ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--glass-border)', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>
                    {lastSubmissionData.language || 'Code'}
                  </span>
                  {lastSubmissionData.runtime !== undefined && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      ⚡ Runtime: <strong style={{ color: '#4ade80' }}>{lastSubmissionData.runtime} ms</strong>
                    </span>
                  )}
                  {lastSubmissionData.memory !== undefined && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      💾 Memory: <strong style={{ color: '#3b82f6' }}>{(lastSubmissionData.memory / (1024 * 1024)).toFixed(2)} MB</strong>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (lastSubmissionData?.code) {
                      navigator.clipboard.writeText(lastSubmissionData.code);
                      setCopiedSubmissionCode(true);
                      setTimeout(() => setCopiedSubmissionCode(false), 2000);
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: copiedSubmissionCode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: copiedSubmissionCode ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--glass-border)',
                    color: copiedSubmissionCode ? '#4ade80' : 'var(--text-main)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {copiedSubmissionCode ? <Check size={12} /> : <Copy size={12} />}
                  {copiedSubmissionCode ? 'Copied!' : 'Copy Code'}
                </button>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '14px', overflowX: 'auto' }}>
                <pre style={{ margin: 0, fontFamily: 'Fira Code, monospace', fontSize: '13px', lineHeight: '1.5', color: '#e6edf3' }}>
                  <code>{lastSubmissionData.code}</code>
                </pre>
              </div>
            </>
          ) : lastSubmissionData?.externalInfo ? (
            <div style={{ textAlign: 'center', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                This problem was solved on <strong style={{ color: 'var(--text-main)' }}>{lastSubmissionData.externalInfo.platform || 'External Platform'}</strong>.
              </div>
              {lastSubmissionData.externalInfo.externalUrl && (
                <a
                  href={lastSubmissionData.externalInfo.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '12px',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={14} /> View Problem & Submission on {lastSubmissionData.externalInfo.platform || 'Official Site'}
                </a>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No accepted submission code found for this problem.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
