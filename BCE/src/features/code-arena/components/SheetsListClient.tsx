'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Trophy, ArrowLeft, BookOpen, Plus, Search, 
  ChevronRight, Trash2, CheckCircle2, Award, X,
  Globe, Shield, Lock, Share2, Check, UserPlus, Loader2, Star
} from 'lucide-react';
import CreateSheetWizard from './CreateSheetWizard';
import MobileCodeArenaToggle from './MobileCodeArenaToggle';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { getBatchSheetRatingStats } from '../actions/sheet-reviews';
import { useLivePageContext } from '@/features/analytics/context/LivePageContext';
import './CodeArena.css';

type CodingSheet = {
  id: string;
  slug?: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  enrollment_access?: string;
  coding_sheet_problems: { problem_id: string }[];
};

export default function SheetsListClient({
  initialSheets,
  isInstructor,
  solvedProblemIds,
  enrolledSheetIds: initialEnrolledIds,
}: {
  initialSheets: CodingSheet[];
  isInstructor: boolean;
  solvedProblemIds: string[];
  enrolledSheetIds: string[];
}) {
  const [sheets, setSheets] = useState<CodingSheet[]>(initialSheets);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [copiedSheetId, setCopiedSheetId] = useState<string | null>(null);
  // Sheet ratings & Live Context state
  const [sheetRatings, setSheetRatings] = useState<Record<string, { averageRating: number; totalReviews: number }>>({});
  const { setLiveContext } = useLivePageContext();

  useEffect(() => {
    const ids = initialSheets.map(s => s.id);
    if (ids.length > 0) {
      getBatchSheetRatingStats(ids).then(stats => {
        if (stats) setSheetRatings(stats);
      });
    }

    const visibleSheets = initialSheets.map(s => {
      const problemsList = s.coding_sheet_problems || [];
      const totalProblems = problemsList.length;
      const solvedProblems = problemsList.filter(p => solvedProblemIds.includes(p.problem_id)).length;
      const progressPct = totalProblems > 0 ? Math.round((solvedProblems / totalProblems) * 100) : 0;
      return {
        id: s.id,
        slug: s.slug,
        title: s.title,
        description: s.description,
        totalProblems,
        solvedProblems,
        progress: progressPct,
        requiresPasscode: s.enrollment_access === 'restricted'
      };
    });

    setLiveContext({
      route: '/code-arena/sheets',
      pageType: 'dsa_sheets',
      pageTitle: 'DSA Practice Sheets',
      visibleEntities: {
        sheets: visibleSheets
      },
      availableActions: ['open_sheet', 'search_sheet', 'filter_sheets']
    });
  }, [initialSheets, solvedProblemIds, setLiveContext]);

  // Enrollment state
  const [enrolledIds, setEnrolledIds] = useState<string[]>(initialEnrolledIds);
  const [enrollSheet, setEnrollSheet] = useState<CodingSheet | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');

  const handleShareSheet = async (sheet: CodingSheet, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
      setCopiedSheetId(sheet.id);
      setTimeout(() => setCopiedSheetId(null), 2500);
    } catch {
      prompt('Copy public share link:', shareUrl);
    }
  };

  const handleDeleteSheet = async (sheetId: string) => {
    if (!window.confirm('Are you sure you want to delete this coding sheet?')) return;

    try {
      const res = await fetch(`/api/coding/sheets/${sheetId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to delete sheet.');
      }
      setSheets(prev => prev.filter(s => s.id !== sheetId));
    } catch (err: any) {
      alert(err.message || 'An error occurred while deleting.');
    }
  };

  const handleEnrollClick = (sheet: CodingSheet) => {
    setEnrollError(null);
    setPasscodeInput('');
    setEnrollSheet(sheet);
  };

  const handleEnrollConfirm = async () => {
    if (!enrollSheet) return;
    setEnrolling(true);
    setEnrollError(null);
    try {
      const body: any = {};
      if (enrollSheet.enrollment_access === 'restricted') {
        body.passcode = passcodeInput.trim();
      }

      const res = await fetch(`/api/coding/sheets/${enrollSheet.id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setEnrolledIds(prev => [...prev, enrollSheet.id]);
        setEnrollSheet(null);
        setPasscodeInput('');
      } else {
        setEnrollError(json.error?.message || 'Failed to enroll. Please try again.');
      }
    } catch (err: any) {
      setEnrollError(err.message || 'Network error. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const filteredSheets = sheets.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="code-arena-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', paddingBottom: '2rem' }}>
      <MobileCodeArenaToggle />

      {/* Header Bar */}
      <header className="code-arena-header-compact">

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--neon-cyan)', background: 'rgba(6,182,212,0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            <BookOpen size={13} /> Coding Practice Sheets
          </div>
          {isInstructor && (
            <Button size="sm" onClick={() => setShowWizard(true)}>
              <Plus size={14} /> New Sheet
            </Button>
          )}
        </div>
      </header>

      {/* Search Input bar */}
      <div className="hub-search-bar" style={{ marginTop: '4px' }}>
        <div className="hub-search-input-wrapper">
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            className="hub-search-input"
            placeholder="Search coding sheets by name, topics, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="oj-icon-btn" onClick={() => setSearchQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Sheets Cards Grid */}
      {filteredSheets.length === 0 ? (
        <Card variant="glass" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <BookOpen size={36} className="text-muted" style={{ marginBottom: '12px' }} />
          <h3 style={{ margin: 0 }}>No coding sheets found</h3>
          <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', maxWidth: '320px', margin: '6px auto 16px auto' }}>
            Get started by creating your first curated practice coding sheet.
          </p>
          {isInstructor && (
            <Button size="sm" onClick={() => setShowWizard(true)}>
              + Create Practice Sheet
            </Button>
          )}
        </Card>
      ) : (
        <div className="problem-grid">
          {filteredSheets.map((sheet) => {
            const problemsList = sheet.coding_sheet_problems || [];
            const totalProblems = problemsList.length;
            const solvedProblems = problemsList.filter(p => solvedProblemIds.includes(p.problem_id)).length;
            const progressPct = totalProblems > 0 ? Math.round((solvedProblems / totalProblems) * 100) : 0;
            const isCompleted = progressPct === 100 && totalProblems > 0;
            const isEnrolled = enrolledIds.includes(sheet.id);
            // Instructors always get direct access (no enroll needed)
            const showEnroll = !isInstructor && !isEnrolled;

            return (
              <Card
                key={sheet.id}
                variant="glass"
                className="problem-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 'var(--space-md)',
                  position: 'relative',
                  border: isCompleted ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--glass-border)',
                  boxShadow: isCompleted ? '0 0 15px rgba(34, 197, 94, 0.1)' : 'none',
                }}
              >
                {/* Completion Ribbon badge */}
                {isCompleted && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 'bold', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                    <Award size={12} /> SHEET DONE
                  </div>
                )}

                {/* Access type badge */}
                {!isCompleted && sheet.enrollment_access && sheet.enrollment_access !== 'public' && (
                  <div style={{
                    position: 'absolute', top: '12px', right: '12px',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '10px', fontWeight: 'bold',
                    padding: '2px 8px', borderRadius: '10px',
                    color: sheet.enrollment_access === 'restricted' ? '#facc15' : '#f87171',
                    background: sheet.enrollment_access === 'restricted' ? 'rgba(250,204,21,0.08)' : 'rgba(248,113,113,0.08)',
                  }}>
                    {sheet.enrollment_access === 'restricted' ? <Shield size={11} /> : <Lock size={11} />}
                    {sheet.enrollment_access === 'restricted' ? 'PASSCODE' : 'PRIVATE'}
                  </div>
                )}

                <div>
                  <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 800, margin: '0 0 8px 0', paddingRight: isCompleted ? '90px' : '0' }}>{sheet.title}</h3>
                  <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', margin: '0 0 16px 0', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {sheet.description || 'Practice curated coding questions.'}
                  </p>

                  {/* Progress tracker bar — only show when enrolled */}
                  {isEnrolled && totalProblems > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 'bold' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>PROGRESS</span>
                        <span style={{ color: isCompleted ? '#22c55e' : 'var(--neon-cyan)' }}>{progressPct}% ({solvedProblems}/{totalProblems})</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${progressPct}%`, 
                            height: '100%', 
                            background: isCompleted ? 'linear-gradient(90deg, #22c55e, #4ade80)' : 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))',
                            borderRadius: '3px',
                            transition: 'width 0.4s ease'
                          }} 
                        />
                      </div>
                    </div>
                  )}

                  {/* Metadata Row: Problem count & Rating badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '8px' }}>
                    {totalProblems > 0 ? (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#06b6d4', background: 'rgba(6,182,212,0.1)', padding: '2px 8px', borderRadius: '8px' }}>
                        {totalProblems} problems
                      </span>
                    ) : <div />}

                    {/* Rating Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(245, 158, 11, 0.08)', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                      <Star size={11} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#fbbf24' }}>
                        {sheetRatings[sheet.id]?.totalReviews > 0 ? sheetRatings[sheet.id].averageRating.toFixed(1) : 'New'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        ({sheetRatings[sheet.id]?.totalReviews || 0})
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {showEnroll ? (
                    <button
                      type="button"
                      onClick={() => handleEnrollClick(sheet)}
                      className="btn btn-sm"
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        height: '36px',
                        background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 0 12px rgba(6, 182, 212, 0.2)',
                      }}
                    >
                      <UserPlus size={14} /> Enroll
                    </button>
                  ) : (
                    <Link
                      href={`/code-arena/sheets/${sheet.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '36px' }}
                    >
                      View Sheet <ChevronRight size={14} />
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleShareSheet(sheet, e)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      background: copiedSheetId === sheet.id ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: copiedSheetId === sheet.id ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: copiedSheetId === sheet.id ? '#4ade80' : '#94a3b8',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      transition: 'all 0.2s',
                    }}
                    title={copiedSheetId === sheet.id ? 'Link Copied!' : 'Share Public Link'}
                  >
                    {copiedSheetId === sheet.id ? <Check size={15} /> : <Share2 size={15} />}
                  </button>

                  {isInstructor && (
                    <button
                      onClick={() => handleDeleteSheet(sheet.id)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: 'rgba(239, 68, 68, 0.8)',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
                        e.currentTarget.style.borderColor = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                      }}
                      title="Delete Sheet"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Enrollment Confirmation Modal */}
      <Modal
        isOpen={enrollSheet !== null}
        onClose={() => { setEnrollSheet(null); setEnrollError(null); setPasscodeInput(''); }}
        title="Enroll in this Sheet"
        size="sm"
      >
        {enrollSheet && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px 0' }}>
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
                <div style={{ fontSize: '15px', fontWeight: 800 }}>
                  {enrollSheet.title}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  {(enrollSheet.coding_sheet_problems || []).length} problems
                </div>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
              {enrollSheet.enrollment_access === 'restricted'
                ? "This coding sheet is restricted. You must enter the passcode provided by your instructor to enroll."
                : "You'll be enrolled in this practice sheet. You can track your progress, submit solutions, and earn badges."}
            </p>

            {enrollSheet.enrollment_access === 'restricted' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  ENTER PASSCODE
                </label>
                <input
                  type="text"
                  placeholder="Enter passcode..."
                  value={passcodeInput}
                  onChange={(e) => { setPasscodeInput(e.target.value); setEnrollError(null); }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-main)',
                    fontSize: 'var(--text-sm)',
                    outline: 'none',
                    fontFamily: 'monospace',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && passcodeInput.trim() && !enrolling) {
                      handleEnrollConfirm();
                    }
                  }}
                />
              </div>
            )}

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

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setEnrollSheet(null); setEnrollError(null); setPasscodeInput(''); }}
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
                disabled={enrolling || (enrollSheet.enrollment_access === 'restricted' && !passcodeInput.trim())}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  border: 'none',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: (enrolling || (enrollSheet.enrollment_access === 'restricted' && !passcodeInput.trim())) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
                  opacity: (enrolling || (enrollSheet.enrollment_access === 'restricted' && !passcodeInput.trim())) ? 0.5 : 1,
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
        )}
      </Modal>

      {/* Sheets wizard setup modal */}
      {showWizard && (
        <CreateSheetWizard
          onClose={() => setShowWizard(false)}
          onSuccess={(newSheet) => {
            setSheets(prev => [newSheet, ...prev]);
            setShowWizard(false);
          }}
        />
      )}
    </div>
  );
}
