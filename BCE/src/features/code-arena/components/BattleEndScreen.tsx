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
    <div
      style={{
        maxWidth: '680px',
        margin: 'var(--space-xl) auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
      }}
    >
      <Card
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-2xl)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-lg)',
        }}
      >
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 'var(--space-md)',
            width: '100%',
            marginTop: 'var(--space-sm)',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
            }}
          >
            <Award size={18} style={{ color: '#eab308', marginBottom: '4px' }} />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Final Rank</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: '#eab308' }}>
              #{userStats.rank}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
            }}
          >
            <Trophy size={18} style={{ color: 'var(--neon-cyan)', marginBottom: '4px' }} />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Total Score</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--neon-cyan)' }}>
              {userStats.score} pts
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
            }}
          >
            <CheckCircle2 size={18} style={{ color: 'var(--neon-emerald)', marginBottom: '4px' }} />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Solved</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--neon-emerald)' }}>
              {userStats.solvedCount} / {userStats.totalProblems}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
            }}
          >
            <Target size={18} style={{ color: 'var(--neon-purple)', marginBottom: '4px' }} />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Accuracy</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--neon-purple)' }}>
              {userStats.accuracy}%
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-md)',
            width: '100%',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: 'var(--space-md)',
          }}
        >
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
