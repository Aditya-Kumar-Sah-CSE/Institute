'use client';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Trophy, Target, Award, CheckCircle2, BarChart2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface BattleEndScreenProps {
  battle: any;
  userStats: {
    rank: number | string;
    score: number;
    solvedCount: number;
    totalProblems: number;
    accuracy: number;
  };
  onViewLeaderboard: () => void;
  onViewAnalytics: () => void;
}

export default function BattleEndScreen({
  battle,
  userStats,
  onViewLeaderboard,
  onViewAnalytics,
}: BattleEndScreenProps) {
  return (
    <div className="battle-complete-wrapper">
      <Card className="battle-complete-card">
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(245, 158, 11, 0.3))',
            border: '2px solid #eab308',
            color: '#eab308',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Trophy size={36} />
        </div>

        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: '4px 0' }}>
            🏆 Battle Complete
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
            {battle.title} has ended. Great effort!
          </p>
        </div>

        {/* Final Performance Summary Grid */}
        <div className="battle-complete-grid">
          <div className="battle-complete-grid-item">
            <Award size={18} style={{ color: '#eab308', marginBottom: '4px' }} />
            <div className="battle-complete-grid-label">Final Rank</div>
            <div className="battle-complete-grid-val-rank">
              #{userStats.rank}
            </div>
          </div>

          <div className="battle-complete-grid-item">
            <Trophy size={18} style={{ color: 'var(--neon-cyan)', marginBottom: '4px' }} />
            <div className="battle-complete-grid-label">Total Score</div>
            <div className="battle-complete-grid-val-score">
              {userStats.score} pts
            </div>
          </div>

          <div className="battle-complete-grid-item">
            <CheckCircle2 size={18} style={{ color: 'var(--neon-emerald)', marginBottom: '4px' }} />
            <div className="battle-complete-grid-label">Solved</div>
            <div className="battle-complete-grid-val-solved">
              {userStats.solvedCount} / {userStats.totalProblems}
            </div>
          </div>

          <div className="battle-complete-grid-item">
            <Target size={18} style={{ color: 'var(--neon-purple)', marginBottom: '4px' }} />
            <div className="battle-complete-grid-label">Accuracy</div>
            <div className="battle-complete-grid-val-accuracy">
              {userStats.accuracy}%
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="battle-complete-actions">
          <Button variant="primary" onClick={onViewLeaderboard}>
            <Trophy size={18} /> View Leaderboard
          </Button>

          <Button variant="secondary" onClick={onViewAnalytics}>
            <BarChart2 size={18} /> View Analytics
          </Button>

          <Link href="/code-arena">
            <Button variant="ghost">
              <ArrowLeft size={18} /> Back to Code Arena
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
