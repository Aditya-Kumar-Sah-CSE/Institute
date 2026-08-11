'use client';

import React from 'react';
import './XPBar.css';
import { getXPProgress, getXPForNextLevel } from '@/lib/utils';

interface XPBarProps {
  xp?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function XPBar({ xp = 0, showLabel = true, size = 'md', className = '' }: XPBarProps) {
  const safeXP = typeof xp === 'number' && !isNaN(xp) ? xp : 0;
  const progress = getXPProgress(safeXP);
  const { next, label } = getXPForNextLevel(safeXP);
  const isMaxLevel = next >= 9999999;

  return (
    <div className={`xp-bar-container xp-bar-${size} ${className}`}>
      {showLabel && (
        <div className="xp-bar-labels">
          <span className="xp-bar-level">{label}</span>
          <span suppressHydrationWarning className="xp-bar-numbers">
            {safeXP.toLocaleString('en-US')} / {isMaxLevel ? 'MAX' : next.toLocaleString('en-US')} XP
          </span>
        </div>
      )}
      <div className="xp-bar-track">
        <div
          className="xp-bar-fill"
          style={{ width: `${progress}%` }}
        >
          <div className="xp-bar-glow" />
        </div>
      </div>
      {showLabel && !isMaxLevel && (
        <div suppressHydrationWarning className="xp-bar-remaining">
          {Math.max(0, next - safeXP).toLocaleString('en-US')} XP to next level
        </div>
      )}
    </div>
  );
}
