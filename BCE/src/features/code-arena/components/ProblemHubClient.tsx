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
import './CodeArena.css';

const PLATFORMS = ['All', 'CODEFORCES', 'LEETCODE', 'BCE'] as const;
const DIFFICULTIES = ['All', 'EASY', 'MEDIUM', 'HARD'] as const;

export default function ProblemHubClient({ userId }: { userId: string }) {
  const [problems, setProblems] = useState<ProblemCardData[]>([]);
  const [loading, setLoading] = useState(true);
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
        params.set('platform', platformVal === 'BCE' ? 'INTERNAL' : platformVal);
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
    <div className="code-arena-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <MobileCodeArenaToggle />
      {/* Hero Header */}
      <header className="hub-hero">
        <div>
          <div className="hub-badge">
            <Trophy size={14} /> Code Arena
          </div>
          <h1 className="hub-title">Competitive Programming Hub</h1>
          <p className="hub-subtitle">
            Practice Codeforces, LeetCode and BCE problems directly inside BCE.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href="/code-arena" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)' }}>
            <Swords size={14} /> Battles
          </Link>
          <Link href="/code-arena/compiler" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)' }}>
            <Code2 size={14} /> Compiler
          </Link>
          <Link href="/code-arena/profile" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)' }}>
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
                  {p === 'All' ? 'All' : p === 'BCE' ? 'BCE' : p === 'CODEFORCES' ? '● CF' : '● LC'}
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
        <div className="hub-problem-grid">
          {problems.map((p) => (
            <ProblemCard key={p.id} problem={p} />
          ))}
        </div>
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
    </div>
  );
}
