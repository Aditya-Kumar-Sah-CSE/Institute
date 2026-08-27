'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Trophy, ArrowLeft, BookOpen, CheckCircle2, Circle, 
  ExternalLink, Code2, ArrowRight, Award, Play, Pencil, Users,
  Lock, Shield, Globe, KeyRound, AlertCircle, Video, FileText, Share2, Check, BarChart2, Search, Image
} from 'lucide-react';
import MobileCodeArenaToggle from './MobileCodeArenaToggle';
import Card from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import CreateSheetWizard from './CreateSheetWizard';
import Modal from '@/components/ui/Modal';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import SolutionEditor from './SolutionEditor';
import { calculateMotivationalAnalytics } from '../lib/motivational-engine';
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
  isInstructor,
  currentUser,
  totalStudentsSolving = 0,
  totalEnrolledSolvers = 0,
  totalEnrolled = 0,
  avgQuestionsSolved = '0',
  solversLeaderboard = [],
  enrollmentAccess = 'public',
  isEnrolled: initialIsEnrolled = false,
}: {
  sheet: Sheet;
  solvedProblemIds: string[];
  isInstructor?: boolean;
  currentUser?: any;
  totalStudentsSolving?: number;
  totalEnrolledSolvers?: number;
  totalEnrolled?: number;
  avgQuestionsSolved?: string;
  solversLeaderboard?: Solver[];
  enrollmentAccess?: string;
  isEnrolled?: boolean;
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

  const filteredSolvers = solversLeaderboard.filter(s =>
    s.name.toLowerCase().includes(solverSearch.toLowerCase())
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

  // Edit fields
  const [editYoutubeUrl, setEditYoutubeUrl] = useState('');
  const [editSolutionText, setEditSolutionText] = useState('');
  const [savingSolution, setSavingSolution] = useState(false);
  
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

  return (
    <div className="code-arena-page" suppressHydrationWarning style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', paddingBottom: '2rem' }}>
      <MobileCodeArenaToggle />

      {/* Header Bar */}
      <header className="code-arena-header-compact">
        <div className="code-arena-header-left">
          <Link
            href="/code-arena/sheets"
            style={{
              display: 'grid',
              placeItems: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            title="Back to Sheets"
            aria-label="Back to Sheets"
            className="oj-icon-btn"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="code-arena-header-title">
              Code Arena
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} suppressHydrationWarning>
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
          <Link 
            href="/code-arena/sheets"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '12px', 
              color: 'var(--neon-cyan)', 
              background: 'rgba(6,182,212,0.1)', 
              padding: '4px 10px', 
              borderRadius: '12px', 
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.1)'; }}
          >
            <BookOpen size={13} /> Sheet Detail
          </Link>
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
            <div className="sheet-stat-box">
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
      {hasAccess && (
        <section className="arena-problems-section" style={{ marginTop: '8px' }}>
          <h3 className="split-sect-title" style={{ fontSize: 'var(--text-md)', fontWeight: 800, marginBottom: '16px' }}>
            Problems List ({totalProblems})
          </h3>

          <div className="practice-rows-list">
            {problems.map((problem, idx) => {
              const isSolved = solvedProblemIds.includes(problem.id);

              return (
                <div 
                  key={problem.id}
                  className="practice-row-item"
                  style={{ 
                    textDecoration: 'none', 
                    cursor: 'default',
                    border: isSolved ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid var(--glass-border)',
                    background: isSolved ? 'rgba(6, 182, 212, 0.02)' : 'rgba(255,255,255,0.01)',
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
                      <span className="row-problem-title" style={{ fontWeight: 700, fontSize: '13px' }}>
                        {idx + 1}. {problem.title}
                      </span>
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

                  <div className="row-item-right" style={{ gap: '12px' }}>
                    <span suppressHydrationWarning className={`difficulty-badge-styled difficulty-${problem.difficulty}`} style={{ fontSize: '9px' }}>
                      {problem.difficulty}
                    </span>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

                      {/* Solve inside Arena button */}
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
          {/* Summary Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', margin: '4px 0 8px 0' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
    </div>
  );
}
