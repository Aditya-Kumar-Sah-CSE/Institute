'use client';

import React from 'react';
import { Trophy, Code2, Code, Flame, Star } from 'lucide-react';

interface CompetitiveOverviewProps {
  bceSolved: number;
  streak?: number;
  cfRating: number | null;
  lcSolved: number | null;
  ccRating?: number | null;
  ccMaxRating?: number | null;
  ccStars?: string | null;
}

const statCards = [
  { key: 'bce', icon: Trophy, label: 'SL Solved', colorVar: '--neon-cyan', glowClass: 'glow-cyan' },
  { key: 'cc', icon: Star, label: 'CC Rating', colorVar: '--neon-gold', glowClass: 'glow-gold' },
  { key: 'cf', icon: Code2, label: 'CF Rating', colorVar: '--neon-purple', glowClass: 'glow-purple' },
  { key: 'lc', icon: Code, label: 'LC Solved', colorVar: '--neon-yellow', glowClass: 'glow-yellow' },
];

export default function CompetitiveOverview({ bceSolved, cfRating, lcSolved, ccRating, ccMaxRating, ccStars }: CompetitiveOverviewProps) {
  const ccDisplay = ccRating != null 
    ? `${ccRating}${ccMaxRating ? ` (Max: ${ccMaxRating})` : ''}` 
    : ccStars 
    ? ccStars 
    : '—';

  const values: Record<string, string | number> = {
    bce: bceSolved,
    cc: ccDisplay,
    cf: cfRating ?? '—',
    lc: lcSolved ?? '—',
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
