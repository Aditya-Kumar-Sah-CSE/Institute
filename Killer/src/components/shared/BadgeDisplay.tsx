'use client';

import React from 'react';
import Image from 'next/image';
import './BadgeDisplay.css';
import type { Badge, UserBadge } from '@/types';

interface BadgeDisplayProps {
  allBadges: Badge[];
  earnedBadges: UserBadge[];
  compact?: boolean;
  className?: string;
}

export default function BadgeDisplay({ allBadges, earnedBadges, compact = false, className = '' }: BadgeDisplayProps) {
  const earnedIds = new Set(earnedBadges.map(ub => ub.badge_id));

  return (
    <div className={`badge-display ${compact ? 'badge-compact' : ''} ${className}`}>
      {allBadges.map((badge) => {
        const isEarned = earnedIds.has(badge.id);
        return (
          <div
            key={badge.id}
            className={`badge-item ${isEarned ? 'badge-earned' : 'badge-locked'}`}
            title={`${badge.name}: ${badge.description || ''}`}
          >
            {badge.icon.startsWith('http') ? (
              <Image src={badge.icon} alt={badge.name} width={32} height={32} className="badge-icon" style={{ objectFit: 'contain' }} />
            ) : (
              <span className="badge-icon">{badge.icon}</span>
            )}
            {!compact && <span className="badge-name">{badge.name}</span>}
          </div>
        );
      })}
    </div>
  );
}
