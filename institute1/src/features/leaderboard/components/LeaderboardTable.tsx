'use client';

import React from 'react';
import Image from 'next/image';
import LevelBadge from '@/components/shared/LevelBadge';
import Link from 'next/link';
import type { LeaderboardEntry } from '@/types';
import './Leaderboard.css';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export default function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
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
        {entries.length > 0 ? entries.map((entry) => {
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
                    <span>{(entry.name || '?').charAt(0)}</span>
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
              
              <div className="col-xp text-gradient">
                {entry.xp.toLocaleString()}
              </div>
            </div>
          );
        }) : (
          <div className="leaderboard-empty">
            No learners found for this category yet.
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
