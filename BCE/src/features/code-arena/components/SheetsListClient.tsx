'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Trophy, ArrowLeft, BookOpen, Plus, Search, 
  ChevronRight, Trash2, CheckCircle2, Award, X 
} from 'lucide-react';
import CreateSheetWizard from './CreateSheetWizard';
import MobileCodeArenaToggle from './MobileCodeArenaToggle';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import './CodeArena.css';

type CodingSheet = {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  coding_sheet_problems: { problem_id: string }[];
};

export default function SheetsListClient({
  initialSheets,
  isInstructor,
  solvedProblemIds,
}: {
  initialSheets: CodingSheet[];
  isInstructor: boolean;
  solvedProblemIds: string[];
}) {
  const [sheets, setSheets] = useState<CodingSheet[]>(initialSheets);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWizard, setShowWizard] = useState(false);

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

  const filteredSheets = sheets.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="code-arena-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', paddingBottom: '2rem' }}>
      <MobileCodeArenaToggle />

      {/* Header Bar */}
      <header className="code-arena-header-compact">
        <div className="code-arena-header-left">
          <Link
            href="/code-arena"
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
            title="Back to Code Arena"
            aria-label="Back to Code Arena"
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

                <div>
                  <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 800, margin: '0 0 8px 0', paddingRight: isCompleted ? '90px' : '0' }}>{sheet.title}</h3>
                  <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', margin: '0 0 16px 0', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {sheet.description || 'Practice curated coding questions.'}
                  </p>

                  {/* Progress tracker bar */}
                  {totalProblems > 0 && (
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
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Link
                    href={`/code-arena/sheets/${sheet.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '36px' }}
                  >
                    View Sheet <ChevronRight size={14} />
                  </Link>

                  {isInstructor && (
                    <button
                      onClick={() => handleDeleteSheet(sheet.id)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-sm)',
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
