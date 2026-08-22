'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Trophy, ArrowLeft, BookOpen, CheckCircle2, Circle, 
  ExternalLink, Code2, ArrowRight, Award, Play 
} from 'lucide-react';
import MobileCodeArenaToggle from './MobileCodeArenaToggle';
import Card from '@/components/ui/Card';
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
  problems: Problem[];
};

export default function SheetDetailClient({
  sheet,
  solvedProblemIds,
}: {
  sheet: Sheet;
  solvedProblemIds: string[];
}) {
  const problems = sheet.problems || [];
  const totalProblems = problems.length;
  const solvedProblems = problems.filter(p => solvedProblemIds.includes(p.id)).length;
  const progressPct = totalProblems > 0 ? Math.round((solvedProblems / totalProblems) * 100) : 0;
  const isCompleted = progressPct === 100 && totalProblems > 0;

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--neon-cyan)', background: 'rgba(6,182,212,0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            <BookOpen size={13} /> Sheet Detail
          </div>
        </div>
      </header>

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
      </div>

      {/* Problems Checklist */}
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
    </div>
  );
}
