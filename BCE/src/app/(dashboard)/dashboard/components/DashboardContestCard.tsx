'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { Clock3, Trophy } from 'lucide-react';
import type { UnifiedContest } from '@/app/api/coding/contests/route';

const CONTEST_PLATFORMS = new Set(['CODECHEF', 'CODEFORCES', 'GEEKSFORGEEKS']);

function formatTimeLeft(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m ${seconds}s`;
}

function getPlatformName(platform: UnifiedContest['platform']) {
  if (platform === 'CODECHEF') return 'CC';
  if (platform === 'CODEFORCES') return 'CF';
  if (platform === 'GEEKSFORGEEKS') return 'GFG';
  return platform;
}

export default function DashboardContestCard() {
  const [contest, setContest] = useState<UnifiedContest | null>(null);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadContest = async () => {
      try {
        const response = await fetch('/api/coding/contests', { cache: 'no-store' });
        if (!response.ok) throw new Error('Unable to load contests');
        const json = await response.json();
        const currentTime = Date.now();
        const available = (Array.isArray(json.contests) ? json.contests : [])
          .filter((item: UnifiedContest) => CONTEST_PLATFORMS.has(item.platform) && item.endTime > currentTime)
          .sort((a: UnifiedContest, b: UnifiedContest) => a.startTime - b.startTime);
        if (active) setContest(available.find((item: UnifiedContest) => item.startTime <= currentTime) || available[0] || null);
      } catch {
        if (active) setContest(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadContest();
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const isLive = !!contest && contest.startTime <= now;
  const timeLeft = contest ? (isLive ? contest.endTime - now : contest.startTime - now) : 0;

  return (
    <Link href="/code-arena" style={{ textDecoration: 'none' }} title="View coding contests">
      <Card variant="glass" padding="lg" className="stat-card hover-lift" style={{ height: '100%', boxSizing: 'border-box' }}>
        <div className="stat-card-icon" style={{ background: 'rgba(255, 184, 0, 0.12)', color: 'var(--neon-gold)' }}>
          <Trophy size={24} />
        </div>
        <div className="stat-card-content" style={{ minWidth: 0 }}>
          <div className="stat-card-value" style={{ color: 'var(--neon-gold)', fontSize: '1.2rem', fontWeight: 800 }}>Contest</div>
          <div className="text-secondary stat-card-label">{loading ? 'Loading contests…' : contest ? `${getPlatformName(contest.platform)} · ${contest.title}` : 'No upcoming CC / CF / GFG contest'}</div>
          {contest && now > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, color: isLive ? 'var(--neon-lime)' : 'var(--neon-cyan)', fontSize: 'var(--text-xs)', fontWeight: 700 }}>
              <Clock3 size={13} />
              {isLive ? 'Ends in' : 'Starts in'} {formatTimeLeft(timeLeft)}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
