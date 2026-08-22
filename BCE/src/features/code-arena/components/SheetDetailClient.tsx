'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Trophy, ArrowLeft, BookOpen, CheckCircle2, Circle, 
  ExternalLink, Code2, ArrowRight, Award, Play, Pencil, Users,
  Lock, Shield, Globe, KeyRound, AlertCircle
} from 'lucide-react';
import MobileCodeArenaToggle from './MobileCodeArenaToggle';
import Card from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import CreateSheetWizard from './CreateSheetWizard';
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
};

type Sheet = {
  id: string;
  title: string;
  description: string;
  created_by: string;
  enrollment_access?: string;
  enrollment_passcode?: string;
  problems: Problem[];
};

export default function SheetDetailClient({
  sheet,
  solvedProblemIds,
  isInstructor,
  currentUser,
  totalStudentsSolving = 0,
  enrollmentAccess = 'public',
  isEnrolled: initialIsEnrolled = false,
}: {
  sheet: Sheet;
  solvedProblemIds: string[];
  isInstructor?: boolean;
  currentUser?: any;
  totalStudentsSolving?: number;
  enrollmentAccess?: string;
  isEnrolled?: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(initialIsEnrolled);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [passcodeInput, setPasscodeInput] = useState('');
  
  const problems = sheet.problems || [];
  const totalProblems = problems.length;
  const solvedProblems = problems.filter(p => solvedProblemIds.includes(p.id)).length;
  const progressPct = totalProblems > 0 ? Math.round((solvedProblems / totalProblems) * 100) : 0;
  const isCompleted = progressPct === 100 && totalProblems > 0;

  const isCreator = currentUser?.id === sheet.created_by;
  const canEdit = isInstructor || isCreator;
  // Instructors/admins and creators bypass enrollment gate
  const hasAccess = canEdit || isEnrolled || enrollmentAccess === 'public';

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
    <div className="code-arena-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', paddingBottom: '2rem' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--neon-cyan)', background: 'rgba(6,182,212,0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            <BookOpen size={13} /> Sheet Detail
          </div>
        </div>
      </header>

      {/* Creator Analytics Panel */}
      {isCreator && (
        <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '16px 20px', borderRadius: 'var(--radius-md)', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Creator Analytics</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>{sheet.title}</div>
          </div>
          <div style={{ height: '30px', width: '1px', background: 'var(--glass-border)' }} />
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Total Problems</div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>{totalProblems}</div>
          </div>
          <div style={{ height: '30px', width: '1px', background: 'var(--glass-border)' }} />
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Students Solving</div>
            <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={14} className="text-neon-cyan" /> {totalStudentsSolving}
            </div>
          </div>
          <div style={{ height: '30px', width: '1px', background: 'var(--glass-border)' }} />
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
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: '0 0 6px 0' }} className="text-gradient">
            {sheet.title}
          </h2>
          <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', margin: 0, maxWidth: '480px' }}>
            {sheet.description || 'Practice curated coding questions.'}
          </p>
        </div>

        {hasAccess && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                        href={`/code-arena/problems/${problem.id}`}
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
    </div>
  );
}
