'use client';

import { Trophy, Star, CheckCircle2, Code2, Flame, Clock } from 'lucide-react';

interface AccountData {
  platform: string;
  username?: string;
  rating?: number | null;
  max_rating?: number | null;
  rank?: string | null;
  problems_solved?: number | null;
  easy_solved?: number | null;
  medium_solved?: number | null;
  hard_solved?: number | null;
  last_synced_at?: string | null;
}

export default function CompetitiveProgress({
  bceSolved,
  battlesPlayed,
  accounts,
}: {
  bceSolved: number;
  battlesPlayed: number;
  accounts: AccountData[];
}) {
  const cf = accounts.find((a) => a.platform === 'CODEFORCES');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Flame size={20} style={{ color: 'var(--neon-cyan)' }} /> Competitive Progress
      </h2>

      <div className="progress-grid">
        {/* BCE Stats */}
        <div className="progress-card">
          <div className="progress-card-header">
            <div className="progress-icon" style={{ background: 'rgba(6,182,212,0.15)', color: '#22d3ee' }}>
              <Code2 size={18} />
            </div>
            <span className="progress-platform">BCE Code Arena</span>
          </div>
          <div className="progress-stats">
            <div className="progress-stat-item">
              <span className="progress-stat-number" style={{ color: '#4ade80' }}>{bceSolved}</span>
              <span className="progress-stat-label">Problems Solved</span>
            </div>
            <div className="progress-stat-item">
              <span className="progress-stat-number" style={{ color: 'var(--neon-cyan)' }}>{battlesPlayed}</span>
              <span className="progress-stat-label">Battles Played</span>
            </div>
          </div>
        </div>

        {/* Codeforces Stats */}
        <div className="progress-card">
          <div className="progress-card-header">
            <div className="progress-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
              <Star size={18} />
            </div>
            <span className="progress-platform">Codeforces</span>
            {cf && (
              <span style={{ fontSize: '10px', color: '#4ade80', marginLeft: 'auto' }}>● Connected</span>
            )}
          </div>
          {cf ? (
            <div className="progress-stats">
              <div className="progress-stat-item">
                <span className="progress-stat-number" style={{ color: 'var(--neon-gold)' }}>{cf.rating ?? '—'}</span>
                <span className="progress-stat-label">Rating</span>
              </div>
              <div className="progress-stat-item">
                <span className="progress-stat-number" style={{ color: '#4ade80' }}>{cf.problems_solved ?? 0}</span>
                <span className="progress-stat-label">Solved</span>
              </div>
              {cf.rank && (
                <div className="progress-stat-item">
                  <span className="progress-stat-number" style={{ textTransform: 'capitalize', fontSize: 'var(--text-sm)' }}>{cf.rank}</span>
                  <span className="progress-stat-label">Rank</span>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
              Connect your Codeforces handle in Profile → Connected Accounts.
            </p>
          )}
        </div>

        {/* LeetCode Stats */}
        <div className="progress-card">
          <div className="progress-card-header">
            <div className="progress-icon" style={{ background: 'rgba(234,179,8,0.15)', color: '#facc15' }}>
              <Trophy size={18} />
            </div>
            <span className="progress-platform">LeetCode</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>○ Unavailable</span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
            LeetCode sync is not yet available. Problem browsing and import remain functional.
          </p>
        </div>
      </div>
    </div>
  );
}
