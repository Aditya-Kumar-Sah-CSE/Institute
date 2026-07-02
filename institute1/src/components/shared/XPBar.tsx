'use client';

import React from 'react';
import './XPBar.css';
import { getXPProgress, getXPForNextLevel } from '@/lib/utils';

interface XPBarProps {
  xp: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function XPBar({ xp, showLabel = true, size = 'md', className = '' }: XPBarProps) {
  const progress = getXPProgress(xp);
  const { next, label } = getXPForNextLevel(xp);

  return (
    <div className={`xp-bar-container xp-bar-${size} ${className}`}>
      {showLabel && (
        <div className="xp-bar-labels">
          <span className="xp-bar-level">{label}</span>
          <span suppressHydrationWarning className="xp-bar-numbers">
            {xp.toLocaleString('en-US')} / {next === 99999 ? 'MAX' : next.toLocaleString('en-US')} XP
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
      {showLabel && next !== 99999 && (
        <div suppressHydrationWarning className="xp-bar-remaining">
          {(next - xp).toLocaleString('en-US')} XP to next level
        </div>
      )}
    </div>
  );
}
