'use client';

import React from 'react';
import { Trophy, Code2, Code, Flame } from 'lucide-react';

interface CompetitiveOverviewProps {
  bceSolved: number;
  streak: number;
  cfRating: number | null;
  lcSolved: number | null;
}

const statCards = [
  { key: 'bce', icon: Trophy, label: 'BCE Solved', colorVar: '--neon-cyan', glowClass: 'glow-cyan' },
  { key: 'cf', icon: Code2, label: 'CF Rating', colorVar: '--neon-purple', glowClass: 'glow-purple' },
  { key: 'lc', icon: Code, label: 'LC Solved', colorVar: '--neon-yellow', glowClass: 'glow-yellow' },
  { key: 'streak', icon: Flame, label: 'Coding Streak', colorVar: '--neon-orange', glowClass: 'glow-orange' },
];

export default function CompetitiveOverview({ bceSolved, streak, cfRating, lcSolved }: CompetitiveOverviewProps) {
  const values: Record<string, string | number> = {
    bce: bceSolved,
    cf: cfRating ?? '—',
    lc: lcSolved ?? '—',
    streak: streak > 0 ? `${streak}d` : '0d',
  };

  return (
    <div className="competitive-overview-section">
      <div className="section-heading-row">
        <h2 className="section-heading">Competitive Overview</h2>
        <span className="section-heading-line" />
      </div>
      
      <div className="overview-cards-grid">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.key} 
              className={`overview-stat-card ${card.glowClass}`}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="stat-icon-wrapper" style={{ color: `var(${card.colorVar})` }}>
                <Icon size={22} />
              </div>
              <div className="stat-content">
                <span className="stat-value" style={{ color: `var(${card.colorVar})` }}>
                  {values[card.key]}
                </span>
                <span className="stat-label">{card.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
