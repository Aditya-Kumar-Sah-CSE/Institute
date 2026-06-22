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
          <span className="xp-bar-numbers">
            {xp.toLocaleString()} / {next === 99999 ? 'MAX' : next.toLocaleString()} XP
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
        <div className="xp-bar-remaining">
          {(next - xp).toLocaleString()} XP to next level
        </div>
      )}
    </div>
  );
}
