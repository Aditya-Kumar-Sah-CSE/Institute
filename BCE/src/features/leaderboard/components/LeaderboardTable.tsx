'use client';

import React, { useState, useEffect, useRef } from 'react';
import LevelBadge from '@/components/shared/LevelBadge';
import UserAvatar from '@/components/shared/UserAvatar';
import { MessageSquare, Loader2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createDirectChat } from '@/features/chat/actions/chat';
import type { LeaderboardEntry } from '@/types';
import './Leaderboard.css';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

const ITEMS_PER_PAGE = 10;

export default function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const [isSpawningChat, setIsSpawningChat] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset to page 1 when entries change (e.g. filter change)
  useEffect(() => {
    setCurrentPage(1);
    setExpandedRows({});
  }, [entries]);

  const startChat = async (userId: string) => {
    setIsSpawningChat(userId);
    try {
      await createDirectChat(userId);
      router.push('/dashboard/chat');
    } catch(err) {
      console.error(err);
      setIsSpawningChat(null);
    }
  };

  const toggleRow = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedRows(prev => ({...prev, [id]: !prev[id]}));
  };

  const totalPages = Math.max(1, Math.ceil(entries.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const displayedEntries = entries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (safeCurrentPage > 3) pages.push('...');
    
    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);

    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }

    if (safeCurrentPage < totalPages - 2) pages.push('...');
    if (!pages.includes(totalPages)) pages.push(totalPages);

    return pages;
  };

  return (
    <div ref={containerRef} className="leaderboard-container glass-card" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div className="leaderboard-min-width-wrapper">
        <div className="leaderboard-header">
          <div className="col-rank">Rank</div>
          <div className="col-user">Learner</div>
          <div className="col-level">Level</div>
          <div className="col-badges">Badges</div>
          <div className="col-xp">XP</div>
        </div>
      
        <div className="leaderboard-body">
          {displayedEntries.length > 0 ? displayedEntries.map((entry) => {
            const isCurrentUser = entry.id === currentUserId;
            const isTop3 = entry.rank <= 3;
            
            return (
              <React.Fragment key={entry.id}>
                <div 
                  className={`leaderboard-row ${isCurrentUser ? 'current-user' : ''} ${isTop3 ? `top-${entry.rank}` : ''}`}
                >
                  <div className="col-rank" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      className="mobile-accordion-btn"
                      onClick={(e) => toggleRow(entry.id, e)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                      {expandedRows[entry.id] ? <ChevronDown size={18} /> : <ChevronLeft size={18} />}
                    </button>
                    {!isCurrentUser && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); startChat(entry.id); }}
                        disabled={isSpawningChat === entry.id}
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: isSpawningChat === entry.id ? 'var(--text-muted)' : 'var(--neon-cyan)', cursor: isSpawningChat === entry.id ? 'not-allowed' : 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', transition: 'all 0.2s', boxShadow: '0 0 5px rgba(0,240,255,0.1)' }}
                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        title="Direct Message"
                      >
                        {isSpawningChat === entry.id ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                      </button>
                    )}
                    <span>{entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}</span>
                  </div>
                  
                  <Link href={isCurrentUser ? '/profile' : `/users/${entry.id}`} className="col-user" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <div className="user-avatar-sm">
                      <UserAvatar url={entry.avatar_url} name={entry.name} size={32} />
                    </div>
                    <span className="user-name" style={{ transition: 'color 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-cyan)'} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>
                      {entry.name || 'Anonymous User'} {isCurrentUser && '(You)'}
                    </span>
                  </Link>
                  
                  <div className="col-level desktop-only-col">
                    <LevelBadge level={entry.level} size="sm" />
                  </div>
                  
                  <div className="col-badges desktop-only-col">
                    <span className="badge-count-pill">🏆 {entry.badge_count}</span>
                  </div>
                  
                  <div suppressHydrationWarning className="col-xp text-gradient desktop-only-col">
                    {entry.xp.toLocaleString('en-US')}
                  </div>
                </div>

                {expandedRows[entry.id] && (
                  <div className="mobile-expanded-details" style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-divider)', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Level</span>
                      <LevelBadge level={entry.level} size="sm" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Badges</span>
                      <span className="badge-count-pill" style={{ margin: 0 }}>🏆 {entry.badge_count}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>XP</span>
                      <span suppressHydrationWarning className="text-gradient" style={{ fontWeight: 'bold' }}>{entry.xp.toLocaleString('en-US')}</span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          }) : (
            <div className="leaderboard-empty">
              No learners found for this category yet.
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="leaderboard-pagination">
            <div className="pagination-info">
              Showing <span className="highlight-text">{startIndex + 1}</span>–<span className="highlight-text">{Math.min(startIndex + ITEMS_PER_PAGE, entries.length)}</span> of <span className="highlight-text">{entries.length}</span> learners
            </div>
            <div className="pagination-controls">
              <button
                type="button"
                className="pagination-btn"
                disabled={safeCurrentPage <= 1}
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                title="Previous Page"
              >
                <ChevronLeft size={16} />
                <span className="btn-label-desktop">Prev</span>
              </button>

              <div className="pagination-pages">
                {getPageNumbers().map((p, idx) => (
                  typeof p === 'number' ? (
                    <button
                      key={p}
                      type="button"
                      className={`pagination-num ${safeCurrentPage === p ? 'active' : ''}`}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </button>
                  ) : (
                    <span key={`dots-${idx}`} className="pagination-ellipsis">
                      ...
                    </span>
                  )
                ))}
              </div>

              <button
                type="button"
                className="pagination-btn"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                title="Next Page"
              >
                <span className="btn-label-desktop">Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
