import React from 'react';
import { Trophy, Radio, ExternalLink, Timer, Sparkles } from 'lucide-react';
import type { UnifiedContest } from '@/app/api/coding/contests/route';
import { formatTimeRemaining } from './UpcomingContestsAlert';

interface LiveContestHubProps {
  contests: UnifiedContest[];
}

export default function LiveContestHub({ contests }: LiveContestHubProps) {
  const liveContests = contests.filter((c) => c.status === 'LIVE');

  if (liveContests.length === 0) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 22px',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
            }}
          >
            <Radio size={20} className="animate-pulse" />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 800,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Live Contests In Progress
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  background: '#ef4444',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  letterSpacing: '0.05em',
                }}
              >
                LIVE
              </span>
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              Compete live on official competitive programming platforms
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
        }}
      >
        {liveContests.map((c) => (
          <div
            key={c.id}
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Trophy size={13} />
                  {c.platform}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Timer size={12} style={{ color: '#ef4444' }} />
                  {formatTimeRemaining(c.endTime)}
                </span>
              </div>

              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                {c.title}
              </h4>
            </div>

            <a
              href={c.registerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: '#ef4444',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 800,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span>Enter Live Contest</span>
              <ExternalLink size={13} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
