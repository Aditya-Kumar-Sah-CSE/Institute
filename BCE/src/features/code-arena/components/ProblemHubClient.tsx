'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, Tag, Trophy, Flame, X,
  ChevronLeft, ChevronRight, Code2, Swords, Plus,
} from 'lucide-react';
import ProblemCard from './ProblemCard';
import type { ProblemCardData } from './ProblemCard';
import MobileCodeArenaToggle from './MobileCodeArenaToggle';
import Modal from '@/components/ui/Modal';
import './CodeArena.css';

const PLATFORMS = ['All', 'CODEFORCES', 'LEETCODE', 'SL'] as const;
const DIFFICULTIES = ['All', 'EASY', 'MEDIUM', 'HARD'] as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ProblemHubClient({ userId }: { userId: string }) {
  const [problems, setProblems] = useState<ProblemCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPlatform, setImportPlatform] = useState<'CODEFORCES' | 'LEETCODE'>('CODEFORCES');
  const [importProblemId, setImportProblemId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [visibleCount, setVisibleCount] = useState(4);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importProblemId.trim()) {
      setImportError('Problem identifier or URL is required.');
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
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to import problem from external platform.');
      }
      window.location.href = `/code-arena/problems/${json.data.problem.id}`;
    } catch (err: any) {
      setImportError(err.message || 'An error occurred during import.');
      setImporting(false);
    }
  };
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProblems = useCallback(async (searchVal: string, platformVal: string, difficultyVal: string, tagVal: string, pageVal: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchVal) params.set('q', searchVal);
      if (platformVal && platformVal !== 'All') {
        params.set('platform', platformVal === 'SL' || platformVal === 'BCE' ? 'INTERNAL' : platformVal);
      }
      if (difficultyVal && difficultyVal !== 'All') params.set('difficulty', difficultyVal);
      if (tagVal) params.set('tag', tagVal);
      params.set('page', String(pageVal));
      params.set('limit', '20');

      const res = await fetch(`/api/coding/problems/hub?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setProblems(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotal(json.pagination?.total || 0);
        setVisibleCount(4);
        if (json.availableTags) setAvailableTags(json.availableTags);
      }
    } catch (e) {
      console.error('Problem hub fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProblems('', '', '', '', 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchProblems(val, platform, difficulty, selectedTag, 1);
    }, 300);
  };

  const applyFilter = (newPlatform: string, newDifficulty: string, newTag: string) => {
    setPlatform(newPlatform);
    setDifficulty(newDifficulty);
    setSelectedTag(newTag);
    setPage(1);
    fetchProblems(search, newPlatform, newDifficulty, newTag, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchProblems(search, platform, difficulty, selectedTag, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeFilterCount = [
    platform && platform !== 'All' ? 1 : 0,
    difficulty && difficulty !== 'All' ? 1 : 0,
    selectedTag ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="code-arena-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', paddingBottom: '1rem', marginBottom: '1rem' }}>
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
          <h1 className="hub-title">Competitive Programming Hub</h1>
          <p className="hub-subtitle">
            Practice Codeforces, LeetCode and SL problems directly inside Smart Learn.
          </p>
        </div>
        <div className="hub-hero-actions">
          <button
            type="button"
            onClick={() => {
              setShowImportModal(true);
              setImportError('');
              setImportProblemId('');
            }}
            className="btn btn-primary animate-pulse"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', height: '36px', padding: '0 16px' }}
          >
            <Plus size={14} /> Import Problem
          </button>
          <Link href="/code-arena/profile" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', height: '36px', padding: '0 16px' }}>
            <Flame size={14} /> Profile
          </Link>
        </div>
      </header>

      {/* Search + Filter Bar */}
      <div className="hub-search-bar">
        <div className="hub-search-input-wrapper">
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            className="hub-search-input"
            placeholder="Search problems, IDs, tags, topics..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {search && (
            <button type="button" className="oj-icon-btn" onClick={() => { setSearch(''); fetchProblems('', platform, difficulty, selectedTag, 1); }}>
              <X size={13} />
            </button>
          )}
        </div>
        <button type="button" className="hub-filter-toggle" onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && <span className="hub-filter-count">{activeFilterCount}</span>}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="hub-filters-panel">
          {/* Platform Filters */}
          <div className="hub-filter-group">
            <span className="hub-filter-label">Platform</span>
            <div className="hub-filter-chips">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`hub-chip ${platform === p || (!platform && p === 'All') ? 'active' : ''}`}
                  onClick={() => applyFilter(p === 'All' ? '' : p, difficulty, selectedTag)}
                >
                  {p === 'All' ? 'All' : p === 'SL' ? '● SL' : p === 'CODEFORCES' ? '● CF' : '● LC'}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Filters */}
          <div className="hub-filter-group">
            <span className="hub-filter-label">Difficulty</span>
            <div className="hub-filter-chips">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`hub-chip ${difficulty === d || (!difficulty && d === 'All') ? 'active' : ''} ${d !== 'All' ? `chip-${d}` : ''}`}
                  onClick={() => applyFilter(platform, d === 'All' ? '' : d, selectedTag)}
                >
                  {d === 'All' ? 'All' : d}
                </button>
              ))}
            </div>
          </div>

          {/* Tag Filters */}
          {availableTags.length > 0 && (
            <div className="hub-filter-group">
              <span className="hub-filter-label"><Tag size={12} /> Tags</span>
              <div className="hub-filter-chips" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                <button
                  type="button"
                  className={`hub-chip ${!selectedTag ? 'active' : ''}`}
                  onClick={() => applyFilter(platform, difficulty, '')}
                >
                  All
                </button>
                {availableTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`hub-chip ${selectedTag === t ? 'active' : ''}`}
                    onClick={() => applyFilter(platform, difficulty, t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear All */}
          {activeFilterCount > 0 && (
            <button type="button" className="hub-clear-filters" onClick={() => applyFilter('', '', '')}>
              <X size={12} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {loading ? 'Loading...' : `${total} problem${total !== 1 ? 's' : ''} found`}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Page {page} of {totalPages}
        </span>
      </div>

      {/* Problem Cards Grid */}
      {loading ? (
        <div className="hub-loading">
          <div className="hub-loading-spinner" />
          <span>Loading problems...</span>
        </div>
      ) : problems.length === 0 ? (
        <div className="hub-empty">
          <Trophy size={36} style={{ color: 'var(--text-muted)' }} />
          <h3>No problems found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          <div className="hub-problem-grid">
            {problems.slice(0, visibleCount).map((p) => (
              <ProblemCard key={p.id} problem={p} />
            ))}
          </div>
          {problems.length > visibleCount && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px', marginBottom: '16px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setVisibleCount((prev) => Math.min(problems.length, prev + 8))}
                style={{
                  padding: '8px 24px',
                  borderRadius: '20px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 15px rgba(6,182,212,0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Show More
              </button>
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="hub-pagination">
          <button
            type="button"
            className="hub-page-btn"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <div className="hub-page-numbers">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`hub-page-num ${page === pageNum ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="hub-page-btn"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Modal Import */}
      <Modal isOpen={showImportModal} onClose={() => !importing && setShowImportModal(false)} title="Import CP Problem" size="md">
        <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
            Enter a Codeforces Contest + Index (e.g., <code>4A</code>, <code>1985A</code>) or LeetCode slug (e.g., <code>two-sum</code>), or copy-paste the full problem URL. We will download the statements and official testcases.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 650, color: 'var(--text-muted)' }}>SELECT PLATFORM</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className={`hub-chip ${importPlatform === 'CODEFORCES' ? 'active' : ''}`}
                onClick={() => setImportPlatform('CODEFORCES')}
                style={{ flex: 1, padding: '0.625rem', display: 'flex', justifyContent: 'center', fontWeight: 'bold' }}
              >
                Codeforces
              </button>
              <button
                type="button"
                className={`hub-chip ${importPlatform === 'LEETCODE' ? 'active' : ''}`}
                onClick={() => setImportPlatform('LEETCODE')}
                style={{ flex: 1, padding: '0.625rem', display: 'flex', justifyContent: 'center', fontWeight: 'bold' }}
              >
                LeetCode
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 650, color: 'var(--text-muted)' }}>PROBLEM ID OR URL</span>
            <input
              type="text"
              placeholder={importPlatform === 'CODEFORCES' ? "e.g., 4A, 1982B, or URL" : "e.g., two-sum, reverse-integer, or URL"}
              value={importProblemId}
              onChange={(e) => setImportProblemId(e.target.value)}
              disabled={importing}
              style={{
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--glass-border)',
                color: 'white',
                fontSize: 'var(--text-sm)',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          {importError && (
            <div style={{ padding: '0.625rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: 'var(--text-xs)' }}>
              {importError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowImportModal(false)}
              disabled={importing}
              style={{ fontSize: 'var(--text-xs)', padding: '8px 20px', borderRadius: '20px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={importing}
              style={{ fontSize: 'var(--text-xs)', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '8px 20px', borderRadius: '20px' }}
            >
              {importing ? (
                <>
                  <div className="hub-loading-spinner" style={{ width: '0.75rem', height: '0.75rem', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                  Importing...
                </>
              ) : (
                'Import & Solve'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
