'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import LevelBadge from '@/components/shared/LevelBadge';
import UserAvatar from '@/components/shared/UserAvatar';
import { User, MessageSquare, Loader2, ChevronLeft, ChevronDown } from 'lucide-react';
import { TenantLink as Link, useTenant } from '@/lib/tenant/TenantProvider';
import { useRouter } from 'next/navigation';
import { createDirectChat } from '@/features/chat/actions/chat';
import type { LeaderboardEntry } from '@/types';
import './Leaderboard.css';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export default function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const { baseUrl } = useTenant();
  const [isSpawningChat, setIsSpawningChat] = useState<string | null>(null);

  const startChat = async (userId: string) => {
    setIsSpawningChat(userId);
    try {
      await createDirectChat(userId);
      router.push(`${baseUrl}/dashboard/chat`);
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

  const displayedEntries = isExpanded ? entries : entries.slice(0, 5);

  return (
    <div className="leaderboard-container glass-card" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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

      {entries.length > 5 && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-lg) 0' }}>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'transparent',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
          >
            {isExpanded ? 'Show Less' : `Show More (${entries.length - 5})`}
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
