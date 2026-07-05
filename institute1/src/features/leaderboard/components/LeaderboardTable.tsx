'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import LevelBadge from '@/components/shared/LevelBadge';
import { User } from 'lucide-react';
import Link from 'next/link';
import type { LeaderboardEntry } from '@/types';
import './Leaderboard.css';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export default function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayedEntries = isExpanded ? entries : entries.slice(0, 5);

  return (
    <div className="leaderboard-container glass-card" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ minWidth: '600px' }}>
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
            <div 
              key={entry.id} 
              className={`leaderboard-row ${isCurrentUser ? 'current-user' : ''} ${isTop3 ? `top-${entry.rank}` : ''}`}
            >
              <div className="col-rank">
                {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
              </div>
              
              <Link href={isCurrentUser ? '/profile' : `/users/${entry.id}`} className="col-user" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <div className="user-avatar-sm">
                  {entry.avatar_url ? (
                    <Image src={entry.avatar_url} alt={entry.name || 'User'} width={40} height={40} style={{ objectFit: 'cover' }} />
                  ) : (
                    <span><User size={24} opacity={0.5} /></span>
                  )}
                </div>
                <span className="user-name" style={{ transition: 'color 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-cyan)'} onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}>
                  {entry.name || 'Anonymous User'} {isCurrentUser && '(You)'}
                </span>
              </Link>
              
              <div className="col-level">
                <LevelBadge level={entry.level} size="sm" />
              </div>
              
              <div className="col-badges">
                <span className="badge-count-pill">🏆 {entry.badge_count}</span>
              </div>
              
              <div suppressHydrationWarning className="col-xp text-gradient">
                {entry.xp.toLocaleString('en-US')}
              </div>
            </div>
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
