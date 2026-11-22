'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Play, Clock, ArrowRight } from 'lucide-react';
import Card from '@/components/ui/Card';

interface LastSolvedProblem {
  problemId: string;
  title: string;
  difficulty?: string;
  sheetId?: string | null;
  solveTimeSeconds?: number;
  solvedAt?: string;
}

export default function DashboardSheetsCard() {
  const [lastSolved, setLastSolved] = useState<LastSolvedProblem | null>(null);
  const [avgTimeStr, setAvgTimeStr] = useState<string | null>(null);
  const [totalSolved, setTotalSolved] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const loadStats = () => {
      try {
        // 1. Last solved problem
        const rawLast = localStorage.getItem('smartlearn_last_solved_problem');
        if (rawLast) {
          const parsed = JSON.parse(rawLast);
          if (parsed && parsed.problemId) {
            setLastSolved(parsed);
          }
        }

        // 2. Average solve time
        const rawTimes = localStorage.getItem('smartlearn_solved_problem_times');
        if (rawTimes) {
          const map = JSON.parse(rawTimes);
          const entries = Object.values(map) as any[];
          const times = entries.map(e => Number(e.timeSeconds) || 0).filter(t => t > 0);
          if (times.length > 0) {
            setTotalSolved(times.length);
            const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
            const mins = Math.floor(avg / 60);
            const secs = avg % 60;
            setAvgTimeStr(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
          }
        }
      } catch (e) {
        console.error('Error loading dashboard sheets stats:', e);
      }
    };

    loadStats();

    // Listen to custom problem-solved event
    const handleProblemSolved = () => loadStats();
    window.addEventListener('smartlearn:problem-solved', handleProblemSolved);
    window.addEventListener('storage', handleProblemSolved);

    return () => {
      window.removeEventListener('smartlearn:problem-solved', handleProblemSolved);
      window.removeEventListener('storage', handleProblemSolved);
    };
  }, []);

  const continueUrl = lastSolved
    ? `/code-arena/problems/${lastSolved.problemId}${lastSolved.sheetId ? `?sheet=${lastSolved.sheetId}` : ''}`
    : '/code-arena/sheets';

  return (
    <Card 
      variant="glass" 
      padding="lg" 
      className="stat-card hover-lift" 
      style={{ 
        position: 'relative', 
        minHeight: '130px', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        cursor: 'default' 
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', width: '100%' }}>
        <Link href="/code-arena/sheets" style={{ textDecoration: 'none' }} title="Browse All Coding Sheets">
          <div className="stat-card-icon" style={{ background: 'rgba(57, 255, 20, 0.1)', color: 'var(--neon-lime)', cursor: 'pointer' }}>
            <BookOpen size={24} />
          </div>
        </Link>

        <div className="stat-card-content" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px' }}>
            <Link href="/code-arena/sheets" style={{ textDecoration: 'none' }}>
              <div className="stat-card-value" style={{ color: 'var(--neon-lime)', fontSize: '1.4rem', fontWeight: 800 }}>
                Sheets <span style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.85 }}>Solve</span>
              </div>
            </Link>
            
            {mounted && avgTimeStr && (
              <span 
                style={{ 
                  fontSize: '10px', 
                  fontWeight: 700, 
                  color: 'var(--neon-cyan)', 
                  background: 'rgba(6,182,212,0.12)', 
                  border: '1px solid rgba(6,182,212,0.3)', 
                  padding: '2px 8px', 
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={`Average time taken to solve 1 problem across ${totalSolved} solved problems`}
              >
                <Clock size={11} /> Avg: {avgTimeStr} / prob
              </span>
            )}
          </div>

          <Link href="/code-arena/sheets" style={{ textDecoration: 'none' }}>
            <div className="text-secondary stat-card-label" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              DSA SHEETS
            </div>
          </Link>
        </div>
      </div>

      {/* Continue Solving Action Row */}
      {mounted && lastSolved ? (
        <div 
          style={{ 
            marginTop: '10px', 
            paddingTop: '8px', 
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }} title={lastSolved.title}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Last:</span> {lastSolved.title}
          </div>

          <Link
            href={continueUrl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              padding: '5px 12px',
              borderRadius: '6px',
              textDecoration: 'none',
              boxShadow: '0 0 10px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            <Play size={11} fill="currentColor" /> Continue Solving →
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: '8px' }}>
          <Link 
            href="/code-arena/sheets" 
            style={{ 
              fontSize: '11px', 
              color: 'var(--neon-lime)', 
              fontWeight: 700, 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px',
              textDecoration: 'none' 
            }}
          >
            Explore Coding Sheets <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </Card>
  );
}

