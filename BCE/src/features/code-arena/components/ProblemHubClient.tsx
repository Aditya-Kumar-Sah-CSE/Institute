'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, Trophy, Flame, X,
  ChevronLeft, Plus, Trash2, ArrowRight, Download, Upload, Code2
} from 'lucide-react';
import ProblemCard from './ProblemCard';
import type { ProblemCardData } from './ProblemCard';
import MobileCodeArenaToggle from './MobileCodeArenaToggle';
import Modal from '@/components/ui/Modal';
import './CodeArena.css';

const PLATFORMS = ['All', 'CODEFORCES', 'LEETCODE', 'CODECHEF', 'GEEKSFORGEEKS'] as const;
const DIFFICULTIES = ['All', 'EASY', 'MEDIUM', 'HARD'] as const;

export default function ProblemHubClient({ userId: _userId }: { userId?: string }) {
  const [problems, setProblems] = useState<ProblemCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPlatform, setImportPlatform] = useState<'CODEFORCES' | 'LEETCODE' | 'CODECHEF' | 'GEEKSFORGEEKS'>('CODEFORCES');
  const [importProblemId, setImportProblemId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  // Load imported problems from client Device Storage (LocalStorage)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sl_imported_problems');
      if (stored) {
        setProblems(JSON.parse(stored));
      } else {
        setProblems([]);
      }
    } catch (e) {
      console.error('Failed to load local problems:', e);
      setProblems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleImport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!importProblemId.trim()) {
      setImportError('Problem URL or identifier is required.');
      return;
    }
    setImporting(true);
    setImportError('');

    try {
      const res = await fetch('/api/coding/problems/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: importProblemId.trim(),
          platform: importPlatform,
          persist: false, // ZERO save on Supabase!
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to import problem from external platform.');
      }

      const importedProblem = json.data.problem;

      // Save into client localStorage
      try {
        const stored: ProblemCardData[] = JSON.parse(localStorage.getItem('sl_imported_problems') || '[]');
        const updated = [importedProblem, ...stored.filter((p) => p.id !== importedProblem.id)];
        localStorage.setItem('sl_imported_problems', JSON.stringify(updated));
        localStorage.setItem(`sl_problem_${importedProblem.id}`, JSON.stringify(importedProblem));
        setProblems(updated);
      } catch (storageErr) {
        console.error('LocalStorage write failed:', storageErr);
      }

      setShowImportModal(false);
      setImportProblemId('');
      window.location.href = `/code-arena/problems/${importedProblem.id}`;
    } catch (err: any) {
      setImportError(err.message || 'An error occurred during import.');
      setImporting(false);
    }
  };

  const handleDeleteProblem = (id: string) => {
    try {
      const stored: ProblemCardData[] = JSON.parse(localStorage.getItem('sl_imported_problems') || '[]');
      const updated = stored.filter((p) => p.id !== id);
      localStorage.setItem('sl_imported_problems', JSON.stringify(updated));
      localStorage.removeItem(`sl_problem_${id}`);
      setProblems(updated);
    } catch (e) {
      console.error('Failed to delete problem:', e);
    }
  };

  const handleClearAll = () => {
    if (!window.confirm('Clear all imported problems from your device storage?')) return;
    try {
      localStorage.removeItem('sl_imported_problems');
      setProblems([]);
    } catch (e) {
      console.error('Failed to clear problems:', e);
    }
  };

  // Filtered problems list
  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesId = p.external_problem_id?.toLowerCase().includes(q);
        const matchesTags = p.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesId && !matchesTags) return false;
      }
      if (platform !== 'All') {
        const pPlatform = (p.external_platform || p.source_type || '').toUpperCase();
        if (pPlatform !== platform) return false;
      }
      if (difficulty !== 'All') {
        const pDiff = (p.difficulty || 'EASY').toUpperCase();
        if (pDiff !== difficulty) return false;
      }
      return true;
    });
  }, [problems, search, platform, difficulty]);

  return (
    <div className="code-arena-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', paddingBottom: '2rem' }}>
      <MobileCodeArenaToggle />

      {/* Hero Header */}
      <header className="hub-hero">
        <div>
          <div className="hub-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Link href="/code-arena" style={{ display: 'inline-flex', alignItems: 'center', color: 'inherit', textDecoration: 'none', marginRight: '4px' }}>
              <ChevronLeft size={16} style={{ strokeWidth: 3 }} />
            </Link>
            <Trophy size={14} /> Code Arena
          </div>
          <h1 className="hub-title">Problem Hub</h1>
          <p className="hub-subtitle">
            Import and practice problems on demand. Everything is saved directly to your device storage with zero cloud persistence.
          </p>
        </div>
        <div className="hub-hero-actions">
          <Link href="/code-arena/profile" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', height: '36px', padding: '0 16px' }}>
            <Flame size={14} /> Profile
          </Link>
        </div>
      </header>

      {/* Quick Import Box */}
      <div style={{
        background: 'rgba(20, 20, 28, 0.6)',
        border: '1px solid var(--glass-border)',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code2 size={18} className="text-neon-cyan" />
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
              Import Problem to Practice
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['CODEFORCES', 'LEETCODE', 'CODECHEF', 'GEEKSFORGEEKS'] as const).map((plat) => (
              <button
                key={plat}
                type="button"
                onClick={() => setImportPlatform(plat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: importPlatform === plat ? '1px solid var(--neon-cyan)' : '1px solid rgba(255,255,255,0.1)',
                  background: importPlatform === plat ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                  color: importPlatform === plat ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                  transition: 'all 0.2s'
                }}
              >
                {plat === 'GEEKSFORGEEKS' ? 'GFG' : plat}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleImport} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
          <input
            type="text"
            value={importProblemId}
            onChange={(e) => setImportProblemId(e.target.value)}
            placeholder={
              importPlatform === 'CODEFORCES'
                ? 'e.g. 4A or https://codeforces.com/problemset/problem/4/A'
                : importPlatform === 'LEETCODE'
                ? 'e.g. two-sum or https://leetcode.com/problems/two-sum'
                : 'Paste problem URL or ID...'
            }
            disabled={importing}
            style={{
              flex: '1 1 240px',
              minWidth: '200px',
              height: '42px',
              background: 'var(--bg-input, rgba(0,0,0,0.3))',
              border: '1px solid var(--border-default, rgba(255,255,255,0.12))',
              borderRadius: '8px',
              padding: '0 14px',
              color: 'var(--text-main)',
              fontSize: '13.5px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <button
            type="submit"
            disabled={importing || !importProblemId.trim()}
            style={{
              height: '42px',
              padding: '0 20px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
              color: '#fff',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
              boxShadow: '0 4px 15px rgba(6,182,212,0.2)'
            }}
          >
            {importing ? 'Importing...' : 'Import & Solve →'}
          </button>
        </form>

        {importError && (
          <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>
            ❌ {importError}
          </div>
        )}
      </div>

      {/* Search and Filters Bar (Only shown if problems exist) */}
      {problems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: '1 1 260px' }}>
              <div style={{
                position: 'relative',
                flex: 1,
                display: 'flex',
                alignItems: 'center'
              }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your imported problems..."
                  style={{
                    width: '100%',
                    height: '38px',
                    paddingLeft: '36px',
                    paddingRight: '32px',
                    background: 'var(--bg-input, rgba(0,0,0,0.3))',
                    border: '1px solid var(--border-default, rgba(255,255,255,0.12))',
                    borderRadius: '8px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: '10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  height: '38px',
                  padding: '0 14px',
                  background: showFilters ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.05)',
                  border: showFilters ? '1px solid var(--neon-cyan)' : '1px solid var(--glass-border)',
                  color: showFilters ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: 600
                }}
              >
                <SlidersHorizontal size={14} /> Filters
              </button>
            </div>

            <button
              type="button"
              onClick={handleClearAll}
              style={{
                height: '38px',
                padding: '0 14px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700
              }}
              title="Clear all problems from device storage"
            >
              <Trash2 size={13} /> Clear All
            </button>
          </div>

          {/* Filter Chips Panel */}
          {showFilters && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '12px 16px',
              background: 'rgba(15, 18, 26, 0.6)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Platform:</span>
                {PLATFORMS.map((plat) => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setPlatform(plat)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: platform === plat ? '1px solid var(--neon-cyan)' : '1px solid transparent',
                      background: platform === plat ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.05)',
                      color: platform === plat ? 'var(--neon-cyan)' : 'var(--text-secondary)'
                    }}
                  >
                    {plat}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Difficulty:</span>
                {DIFFICULTIES.map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: difficulty === diff ? '1px solid var(--neon-purple)' : '1px solid transparent',
                      background: difficulty === diff ? 'rgba(124, 58, 237, 0.2)' : 'rgba(255,255,255,0.05)',
                      color: difficulty === diff ? 'var(--neon-purple)' : 'var(--text-secondary)'
                    }}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Problems Grid / Empty State */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading your device workspace...
        </div>
      ) : filteredProblems.length === 0 ? (
        <div style={{
          minHeight: '40vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px 20px',
          background: 'rgba(20, 20, 28, 0.3)',
          border: '1px dashed var(--glass-border)',
          borderRadius: '16px',
          gap: '12px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--neon-cyan)'
          }}>
            <Code2 size={28} />
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '8px 0 0 0', color: 'var(--text-main)' }}>
            {problems.length === 0 ? 'Your Problem Workspace is Clean' : 'No matching problems found'}
          </h3>

          <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', fontSize: '13.5px', lineHeight: 1.5, margin: 0 }}>
            {problems.length === 0
              ? 'No problems are saved on the platform servers. Paste any LeetCode, Codeforces, or CodeChef problem link above to import and practice. Everything stays in your device storage.'
              : 'Try clearing your search query or filters to view your imported problems.'}
          </p>
        </div>
      ) : (
        <div className="hub-problem-grid">
          {filteredProblems.map((p) => (
            <ProblemCard 
              key={p.id} 
              problem={p} 
              onDelete={handleDeleteProblem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
