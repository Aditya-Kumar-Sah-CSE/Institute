'use client';

import React, { useState, useEffect } from 'react';
import { Bell, ExternalLink, Timer, Radio, Calendar, RefreshCw, MoreVertical, ChevronDown } from 'lucide-react';
import type { UnifiedContest } from '@/app/api/coding/contests/route';

export function formatTimeRemaining(targetTimeMs: number): string {
  const diff = Math.max(0, targetTimeMs - Date.now());
  if (diff <= 0) return '00h 00m 00s';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
  }
  return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
}

interface UpcomingContestsAlertProps {
  initialExpand?: boolean;
}

export default function UpcomingContestsAlert({ initialExpand = false }: UpcomingContestsAlertProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpand);
  const [contests, setContests] = useState<UnifiedContest[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'ALL' | 'CODECHEF' | 'CODEFORCES' | 'LEETCODE'>('ALL');
  const [, setNowTick] = useState(Date.now());

  const fetchContests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/coding/contests');
      if (res.ok) {
        const json = await res.json();
        setContests(json.contests || []);
        setHasFetched(true);
      }
    } catch (e) {
      console.warn('Failed to fetch upcoming contests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialExpand && !hasFetched) {
      fetchContests();
    }
  }, [initialExpand]);

  const handleToggle = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    if (nextState && !hasFetched && !loading) {
      fetchContests();
    }
  };

  // Update timer tick every second without drift
  useEffect(() => {
    if (!isExpanded) return;
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [isExpanded]);

  const filteredContests = contests.filter((c) => {
    if (selectedPlatform !== 'ALL' && c.platform !== selectedPlatform) return false;
    return true;
  });

  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'CODECHEF':
        return { name: 'CodeChef', icon: '👨‍🍳', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' };
      case 'CODEFORCES':
        return { name: 'Codeforces', icon: '📊', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' };
      case 'LEETCODE':
        return { name: 'LeetCode', icon: '💻', color: '#ffa116', bg: 'rgba(255, 161, 22, 0.15)', border: 'rgba(255, 161, 22, 0.4)' };
      default:
        return { name: platform, icon: '🏆', color: 'var(--neon-cyan)', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.4)' };
    }
  };

  return (
    <div className="upcoming-contests-alert-card" style={{
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      padding: '14px 18px',
      marginBottom: '20px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      transition: 'all 0.3s ease',
    }}>
      <div 
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#22c55e',
            flexShrink: 0,
          }}>
            <Bell size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Upcoming & Live Contests Alert
              {loading && <RefreshCw size={14} className="spin animate-spin" style={{ color: 'var(--neon-emerald)' }} />}
            </h3>
            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isExpanded ? 'Live countdown timers & direct register links' : 'Tap 3-dots menu to view CodeChef, Codeforces & LeetCode contests'}
            </p>
          </div>
        </div>

        {/* 3-Dots Menu Icon Toggle Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          title={isExpanded ? 'Hide Contests' : 'View Contests'}
          style={{
            background: isExpanded ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: isExpanded ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--glass-border)',
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isExpanded ? '#22c55e' : 'var(--text-main)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
        >
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--glass-border)' }}>
          {/* Platform Filter Buttons (Mobile Wrapped) */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '6px',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
            marginBottom: '14px',
          }}>
            {(['ALL', 'CODECHEF', 'CODEFORCES', 'LEETCODE'] as const).map((plt) => (
              <button
                key={plt}
                onClick={() => setSelectedPlatform(plt)}
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedPlatform === plt ? 'var(--neon-emerald)' : 'transparent',
                  color: selectedPlatform === plt ? '#000' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flex: '1 1 auto',
                  textAlign: 'center',
                }}
              >
                {plt === 'ALL' ? 'All' : plt === 'CODECHEF' ? '👨‍🍳 CodeChef' : plt === 'CODEFORCES' ? '📊 Codeforces' : '💻 LeetCode'}
              </button>
            ))}
          </div>

      {/* Contest Cards Grid */}
      {filteredContests.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          {loading ? 'Fetching live contest schedules...' : 'No upcoming contests found for this platform filter.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {filteredContests.map((c) => {
            const badge = getPlatformBadge(c.platform);
            const isLive = c.status === 'LIVE' || Date.now() >= c.startTime && Date.now() <= c.endTime;
            const isStartingSoon = c.status === 'STARTING_SOON' || (!isLive && c.startTime - Date.now() <= 3 * 3600 * 1000);

            return (
              <div
                key={c.id}
                style={{
                  background: isLive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: isLive ? '1px solid rgba(239, 68, 68, 0.4)' : isStartingSoon ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                    }}>
                      <span>{badge.icon}</span>
                      <span>{badge.name}</span>
                    </span>

                    {isLive ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.15)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        animation: 'pulse 1.5s infinite',
                      }}>
                        <Radio size={12} /> 🔴 LIVE NOW
                      </span>
                    ) : isStartingSoon ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#f59e0b',
                        background: 'rgba(245, 158, 11, 0.15)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                      }}>
                        ⚡ STARTING SOON
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Calendar size={12} /> {new Date(c.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', lineHeight: '1.3' }}>
                    {c.title}
                  </h4>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: isLive ? '#ef4444' : isStartingSoon ? '#f59e0b' : 'var(--neon-emerald)', fontWeight: 800 }}>
                    <Timer size={14} />
                    <span>
                      {isLive ? `Ends in ${formatTimeRemaining(c.endTime)}` : `Starts in ${formatTimeRemaining(c.startTime)}`}
                    </span>
                  </div>
                </div>

                <a
                  href={c.registerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    background: isLive ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'var(--neon-emerald)',
                    color: isLive ? '#fff' : '#000',
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  {isLive ? '🔴 Enter Live Contest' : 'Register Now'}
                  <ExternalLink size={13} />
                </a>
              </div>
            );
          })}
        </div>
      )}
        </div>
      )}
    </div>
  );
}
