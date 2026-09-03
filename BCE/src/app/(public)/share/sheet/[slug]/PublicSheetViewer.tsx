'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Trophy, BookOpen, Share2, Search, ExternalLink, Play, Video, 
  FileText, Check, Shield, Globe, Lock, ArrowRight, Code2, Sparkles, ChevronRight, ChevronLeft,
  UserPlus, CheckCircle2, Loader2, Image
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { createClient } from '@/lib/supabase/client';

type PublicProblem = {
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

type PublicSheet = {
  id: string;
  slug: string;
  title: string;
  description: string;
  created_at: string;
  enrollment_access?: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  youtube_url?: string | null;
  creator?: {
    name: string;
    avatar_url?: string | null;
    role?: string;
  } | null;
  problems: PublicProblem[];
};

export default function PublicSheetViewer({
  sheet,
  shareUrl,
}: {
  sheet: PublicSheet;
  shareUrl: string;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // 5 problems per page pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const PROBLEMS_PER_PAGE = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDifficulty]);

  // Enroll state
  const [showEnrollConfirm, setShowEnrollConfirm] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // Modals for YT Video and Text Solution
  const [activeVideoProblem, setActiveVideoProblem] = useState<PublicProblem | null>(null);
  const [activeSolutionProblem, setActiveSolutionProblem] = useState<PublicProblem | null>(null);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setCurrentUser(data.user);
          // Check if already enrolled
          supabase
            .from('coding_sheet_enrollments')
            .select('id')
            .eq('sheet_id', sheet.id)
            .eq('user_id', data.user.id)
            .maybeSingle()
            .then(({ data: enrollment }) => {
              if (enrollment) {
                setEnrolled(true);
              }
            });
        }
      }).catch(() => {});
    } catch (e) {
      // Ignore auth check error on static pages
    }
  }, [sheet.id]);

  const problems = sheet.problems || [];

  const handleEnrollClick = () => {
    if (!currentUser) {
      // Redirect to login, then come back
      const returnPath = `/share/sheet/${sheet.slug || sheet.id}`;
      router.push(`/login?next=${encodeURIComponent(returnPath)}`);
      return;
    }
    if (enrolled) {
      // Already enrolled, go to arena
      router.push(`/code-arena/sheets/${sheet.id}`);
      return;
    }
    setEnrollError(null);
    setShowEnrollConfirm(true);
  };

  const handleEnrollConfirm = async () => {
    setEnrolling(true);
    setEnrollError(null);
    try {
      const res = await fetch(`/api/coding/sheets/${sheet.id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setEnrolled(true);
        setShowEnrollConfirm(false);
      } else {
        setEnrollError(json.error?.message || 'Failed to enroll. Please try again.');
      }
    } catch (err: any) {
      setEnrollError(err.message || 'Network error. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleCopyLink = async () => {
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
      // Fallback to clipboard copy
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt('Copy share link:', shareUrl);
    }
  };

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

  const filteredProblems = problems.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.source_type || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDiff =
      selectedDifficulty === 'ALL' ||
      p.difficulty?.toUpperCase() === selectedDifficulty.toUpperCase();

    return matchesSearch && matchesDiff;
  });

  const easyCount = problems.filter((p) => p.difficulty?.toUpperCase() === 'EASY').length;
  const mediumCount = problems.filter((p) => p.difficulty?.toUpperCase() === 'MEDIUM').length;
  const hardCount = problems.filter((p) => p.difficulty?.toUpperCase() === 'HARD').length;

  const getSolveProblemUrl = (problemId: string) => {
    const targetPath = `/code-arena/problems/${problemId}?sheet=${sheet.id}`;
    if (!currentUser) {
      return `/login?next=${encodeURIComponent(targetPath)}`;
    }
    return targetPath;
  };

  const getSolveArenaUrl = () => {
    const targetPath = `/code-arena/sheets/${sheet.id}`;
    if (!currentUser) {
      return `/login?next=${encodeURIComponent(targetPath)}`;
    }
    return targetPath;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#f8fafc', paddingBottom: '4rem' }}>
      {/* Top Banner Nav */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(11, 15, 25, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)',
            }}
          >
            <BookOpen size={20} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.3px', background: 'linear-gradient(90deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Smart Learn Code Arena
            </div>
            <div style={{ fontSize: '10px', color: '#06b6d4', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Public Practice Sheet
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: copied ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.06)',
              border: copied ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
              color: copied ? '#4ade80' : '#f8fafc',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {copied ? <Check size={14} /> : <Share2 size={14} />}
            {copied ? 'Link Copied!' : 'Share Sheet'}
          </button>

          <button
            type="button"
            onClick={handleEnrollClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: enrolled
                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              color: 'white',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: enrolled
                ? '0 0 14px rgba(34, 197, 94, 0.3)'
                : '0 0 14px rgba(6, 182, 212, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            {enrolled ? (
              <>
                <CheckCircle2 size={14} /> Enrolled — Open Sheet
              </>
            ) : (
              <>
                <UserPlus size={14} /> Enroll Now
              </>
            )}
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Sheet Hero Card */}
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.6))',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
          }}
        >
          {/* Subtle background glow */}
          <div
            style={{
              position: 'absolute',
              top: '-60px',
              right: '-60px',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15), transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#06b6d4',
                    background: 'rgba(6, 182, 212, 0.1)',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                  }}
                >
                  <Sparkles size={11} style={{ display: 'inline', marginRight: '4px' }} />
                  Curated Practice Sheet
                </span>

                {sheet.enrollment_access === 'restricted' && (
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#facc15', background: 'rgba(250, 204, 21, 0.1)', padding: '3px 10px', borderRadius: '12px' }}>
                    Passcode Required for Arena
                  </span>
                )}
              </div>

              <h1 style={{ fontSize: '28px', fontWeight: 900, margin: '0 0 10px 0', letterSpacing: '-0.5px', color: '#ffffff' }}>
                {sheet.title}
              </h1>

              <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: 1.6, maxWidth: '640px' }}>
                {sheet.description || 'Master key algorithm patterns with this curated practice sheet.'}
              </p>

              {/* Reference Material & Video Explanation Section */}
              {(sheet.attachment_url || sheet.youtube_url) && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
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
                        color: sheet.attachment_type === 'pdf' ? '#f87171' : '#06b6d4',
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

              {/* Creator Info */}
              {sheet.creator && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 700,
                      fontSize: '13px',
                      color: 'white',
                    }}
                  >
                    {sheet.creator.name ? sheet.creator.name.charAt(0).toUpperCase() : 'I'}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                      {sheet.creator.name || 'Instructor'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Curator</div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Metrics Badge Box */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '16px',
                minWidth: '220px',
              }}
            >
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Problems</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#06b6d4' }}>{problems.length}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Difficulty Mix</div>
                <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px', display: 'flex', gap: '6px' }}>
                  <span style={{ color: '#4ade80' }}>{easyCount}E</span>
                  <span style={{ color: '#facc15' }}>{mediumCount}M</span>
                  <span style={{ color: '#f87171' }}>{hardCount}H</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Search box */}
          <div
            style={{
              flex: 1,
              minWidth: '260px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search size={16} style={{ position: 'absolute', left: '14px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search problems by title or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                borderRadius: '10px',
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Difficulty pills */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setSelectedDifficulty(diff)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: selectedDifficulty === diff ? '1px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: selectedDifficulty === diff ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: selectedDifficulty === diff ? '#06b6d4' : '#94a3b8',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Problems List */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredProblems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(30, 41, 59, 0.3)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <BookOpen size={32} style={{ color: '#64748b', marginBottom: '12px' }} />
              <div style={{ fontSize: '14px', fontWeight: 700 }}>No matching problems found</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Try adjusting your search query or filter settings.</div>
            </div>
          ) : (() => {
            const totalPages = Math.max(1, Math.ceil(filteredProblems.length / PROBLEMS_PER_PAGE));
            const startIdx = (currentPage - 1) * PROBLEMS_PER_PAGE;
            const pagedFilteredProblems = filteredProblems.slice(startIdx, startIdx + PROBLEMS_PER_PAGE);

            return (
              <>
                {pagedFilteredProblems.map((problem, idx) => {
                  const overallIndex = startIdx + idx + 1;
                  const diffClass = (problem.difficulty || 'EASY').toUpperCase();
                  const diffColor = diffClass === 'EASY' ? '#4ade80' : diffClass === 'MEDIUM' ? '#facc15' : '#f87171';

                  return (
                    <div
                      key={problem.id}
                      className="practice-row-item"
                      style={{
                        borderRadius: '12px',
                        background: 'rgba(30, 41, 59, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)';
                        e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(30, 41, 59, 0.4)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                      }}
                    >
                      <div className="row-item-left" style={{ gap: '14px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', width: '24px' }}>
                          {overallIndex}.
                        </span>

                        <div className="row-problem-meta">
                          <div className="row-problem-title" style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                            {problem.title}
                          </div>

                          <div className="row-tags-group" style={{ marginTop: '4px' }}>
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 800,
                                color: '#06b6d4',
                                background: 'rgba(6, 182, 212, 0.1)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              {problem.source_type || 'CODEFORCES'}
                            </span>

                            {(problem.tags || []).slice(0, 3).map((tag) => (
                              <span key={tag} style={{ fontSize: '9px', color: '#94a3b8' }}>
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="row-item-right" style={{ gap: '10px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            color: diffColor,
                            background: `${diffColor}15`,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {problem.difficulty}
                        </span>

                        {/* Ask YT Button */}
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(problem.title || problem.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ask YT - Search on YouTube"
                          style={{
                            display: 'grid',
                            placeItems: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.05)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            cursor: 'pointer',
                            textDecoration: 'none'
                          }}
                        >
                          <Search size={14} />
                        </a>

                        {/* Solution Video button if available */}
                        {problem.youtube_url && (
                          <button
                            type="button"
                            onClick={() => setActiveVideoProblem(problem)}
                            title="Watch Video Solution"
                            style={{
                              display: 'grid',
                              placeItems: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#ef4444',
                              cursor: 'pointer',
                            }}
                          >
                            <Video size={14} />
                          </button>
                        )}

                        {/* Text Solution button if available */}
                        {problem.text_solution && (
                          <button
                            type="button"
                            onClick={() => setActiveSolutionProblem(problem)}
                            title="Read Text Solution"
                            style={{
                              display: 'grid',
                              placeItems: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: 'rgba(168, 85, 247, 0.1)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              color: '#a855f7',
                              cursor: 'pointer',
                            }}
                          >
                            <FileText size={14} />
                          </button>
                        )}

                        {/* External statement link if present */}
                        {problem.external_url && (
                          <a
                            href={problem.external_url}
                            target="_blank"
                            rel="noreferrer"
                            title="Official Statement"
                            style={{
                              display: 'grid',
                              placeItems: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#94a3b8',
                            }}
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}

                        {/* Action button */}
                        <Link
                          href={getSolveProblemUrl(problem.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <Play size={11} fill="currentColor" /> Solve
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {/* 5-Problems Per Page Pagination Bar */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '16px', padding: '12px 16px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                      Showing <strong style={{ color: '#ffffff' }}>{startIdx + 1}–{Math.min(startIdx + PROBLEMS_PER_PAGE, filteredProblems.length)}</strong> of <strong style={{ color: '#06b6d4' }}>{filteredProblems.length}</strong> problems
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: currentPage === 1 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: currentPage === 1 ? '#64748b' : '#f8fafc',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          opacity: currentPage === 1 ? 0.5 : 1,
                        }}
                      >
                        <ChevronLeft size={14} /> Previous
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: currentPage === pageNum ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'rgba(255,255,255,0.04)',
                            border: currentPage === pageNum ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                            color: currentPage === pageNum ? '#000000' : '#94a3b8',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: currentPage === totalPages ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: currentPage === totalPages ? '#64748b' : '#f8fafc',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          opacity: currentPage === totalPages ? 0.5 : 1,
                        }}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </section>

        {/* Footer Callout */}
        <div
          style={{
            marginTop: '20px',
            padding: '24px',
            borderRadius: '12px',
            background: 'rgba(6, 182, 212, 0.05)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>Want to track your progress & earn badges?</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Sign in to Smart Learn Code Arena to submit code, earn daily streaks, and get certified!</div>
          </div>
          <Link
            href={`/login?next=${encodeURIComponent(`/share/sheet/${sheet.slug}`)}`}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: '#06b6d4',
              color: '#000',
              fontWeight: 800,
              fontSize: '12px',
              textDecoration: 'none',
            }}
          >
            Log In / Sign Up
          </Link>
        </div>
      </main>

      {/* Video Solution Modal */}
      <Modal
        isOpen={activeVideoProblem !== null}
        onClose={() => setActiveVideoProblem(null)}
        title={activeVideoProblem?.id === 'sheet-overview-video' ? `Video Explanation: ${activeVideoProblem.title}` : `Video Solution: ${activeVideoProblem?.title}`}
        size="lg"
      >
        {activeVideoProblem?.youtube_url && getYoutubeEmbedUrl(activeVideoProblem.youtube_url) ? (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#000' }}>
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
            <p style={{ color: '#94a3b8', marginBottom: '16px' }}>
              This video cannot be embedded directly. Click below to watch:
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

      {/* Text Solution Modal */}
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
            <p style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
              No text solution available yet.
            </p>
          )}
        </div>
      </Modal>

      {/* Enrollment Confirmation Modal */}
      <Modal
        isOpen={showEnrollConfirm}
        onClose={() => { setShowEnrollConfirm(false); setEnrollError(null); }}
        title="Enroll in this Sheet"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px 0' }}>
          {/* Sheet info summary */}
          <div
            style={{
              background: 'rgba(6, 182, 212, 0.06)',
              border: '1px solid rgba(6, 182, 212, 0.15)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <BookOpen size={22} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
                {sheet.title}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                {problems.length} problems · {sheet.creator?.name ? `by ${sheet.creator.name}` : 'Curated Sheet'}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
            You&apos;ll be enrolled in this practice sheet. You can track your progress, submit solutions, and earn badges.
          </p>

          {/* Error message */}
          {enrollError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                color: '#f87171',
                fontWeight: 600,
              }}
            >
              {enrollError}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => { setShowEnrollConfirm(false); setEnrollError(null); }}
              disabled={enrolling}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#94a3b8',
                fontSize: '13px',
                fontWeight: 700,
                cursor: enrolling ? 'not-allowed' : 'pointer',
                opacity: enrolling ? 0.5 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEnrollConfirm}
              disabled={enrolling}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                border: 'none',
                color: 'white',
                fontSize: '13px',
                fontWeight: 700,
                cursor: enrolling ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
                opacity: enrolling ? 0.8 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {enrolling ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Enrolling...
                </>
              ) : (
                <>
                  <UserPlus size={14} /> Confirm Enrollment
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
