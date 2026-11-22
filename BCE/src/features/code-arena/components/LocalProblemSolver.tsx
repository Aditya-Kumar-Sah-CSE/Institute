'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Trophy, AlertCircle } from 'lucide-react';
import ResizableIdeLayout from '@/features/code-arena/components/ResizableIdeLayout';
import PracticeArenaHeader from '@/features/code-arena/components/PracticeArenaHeader';
import type { ProblemData } from '@/features/code-arena/components/ProblemStatementRenderer';
import FocusTimer from '@/features/code-arena/components/FocusTimer';
import SpotifyConnect from '@/features/code-arena/components/SpotifyConnect';
import '@/features/code-arena/components/CodeArena.css';

export default function LocalProblemSolver({ problemId }: { problemId: string }) {
  const [problemData, setProblemData] = useState<ProblemData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      // 1. Check direct problem storage
      const single = localStorage.getItem(`sl_problem_${problemId}`);
      if (single) {
        setProblemData(JSON.parse(single));
        setLoading(false);
        return;
      }

      // 2. Check in imported problems list
      const listRaw = localStorage.getItem('sl_imported_problems');
      if (listRaw) {
        const list = JSON.parse(listRaw);
        const found = list.find((p: any) => p.id === problemId || p.slug === problemId);
        if (found) {
          setProblemData(found);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load local problem from device storage:', e);
    }
    setLoading(false);
  }, [problemId]);

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading problem from device storage...
      </div>
    );
  }

  if (!problemData) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px', textAlign: 'center' }}>
        <AlertCircle size={44} style={{ color: 'var(--accent-warning, #f59e0b)' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Problem Not Found in Device Storage</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', fontSize: '14px', lineHeight: 1.5 }}>
          This problem is not saved in your browser storage. You can import any problem from LeetCode or Codeforces to start practicing.
        </p>
        <Link href="/code-arena/compiler" className="btn btn-primary" style={{ padding: '8px 20px', borderRadius: '8px', textDecoration: 'none' }}>
          ← Back to Compiler
        </Link>
      </div>
    );
  }

  return (
    <div className="code-arena-page ide-mode">
      {/* Practice Arena Header with Top Action Controls */}
      <PracticeArenaHeader
        problem={problemData}
        profileName="User"
        profileAvatar={null}
      />

      {/* Resizable Desktop IDE Layout */}
      <div className="code-arena-workspace-container">
        <ResizableIdeLayout problemData={problemData} />
      </div>
    </div>
  );
}
