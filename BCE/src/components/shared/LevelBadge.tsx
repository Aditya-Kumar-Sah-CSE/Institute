'use client';

import React from 'react';
import './LevelBadge.css';
import { getLevelColor } from '@/lib/utils';
import type { LevelName } from '@/types';

interface LevelBadgeProps {
  level: LevelName;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const levelIcons: Record<LevelName, string> = {
  Beginner: '🌱',
  Novice: '🌿',
  Intermediate: '⚡',
  Advanced: '🔥',
  Expert: '💥',
  Master: '🏅',
  Grandmaster: '👁️',
  Legend: '👑',
  Mythic: '🌌',
};

export default function LevelBadge({ level, size = 'md', className = '' }: LevelBadgeProps) {
  const color = getLevelColor(level);

  return (
    <div
      className={`level-badge level-badge-${size} ${className}`}
      style={{ '--level-color': color } as React.CSSProperties}
    >
      <span className="level-badge-icon">{levelIcons[level]}</span>
      <span className="level-badge-text">{level}</span>
    </div>
  );
}
