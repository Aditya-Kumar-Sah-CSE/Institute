'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, ExternalLink, Timer, Radio, Calendar, RefreshCw, MoreVertical, X, ChefHat, BarChart3, Code2, Trophy, Globe, Zap, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';
import type { UnifiedContest } from '@/app/api/coding/contests/route';
import { loadContestsCache, saveContestsCache, fetchFreshContests } from '@/features/code-arena/lib/contestCache';

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

interface RegistrationState {
  status: 'unverified' | 'pending_verification' | 'verifying' | 'verified' | 'failed';
  registered: boolean;
}

export default function UpcomingContestsAlert({ initialExpand = false }: UpcomingContestsAlertProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpand);
  const [contests, setContests] = useState<UnifiedContest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBackgroundFetching, setIsBackgroundFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [isCachedNotice, setIsCachedNotice] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'ALL' | 'CODECHEF' | 'CODEFORCES' | 'LEETCODE' | 'GEEKSFORGEEKS'>('ALL');
  const [registrations, setRegistrations] = useState<Record<string, RegistrationState>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setNowTick] = useState(Date.now());
  const initialLoadCompleted = useRef(false);

  // Fetch registrations from database
  const fetchRegistrations = async () => {
    try {
      const res = await fetch('/api/coding/contests/registrations');
      if (res.ok) {
        const json = await res.json();
        const map: Record<string, RegistrationState> = {};
        if (Array.isArray(json.registrations)) {
          json.registrations.forEach((r: any) => {
            map[r.contest_id] = {
              status: r.status || (r.registered ? 'verified' : 'unverified'),
              registered: Boolean(r.registered)
            };
          });
        }
        setRegistrations(map);
      }
    } catch (e) {
      console.warn('Failed to fetch contest registrations from DB:', e);
    }
  };

  /**
   * Main contest loader with 10-minute client-side caching & background revalidation.
   */
  const loadContestsData = async (forceNetwork: boolean = false) => {
    setErrorMessage(null);
    setIsCachedNotice(false);

    // 1. Try reading from client cache first (hydration-safe)
    const cached = loadContestsCache();

    if (cached && !forceNetwork) {
      // Instantly render cached data without waiting for network
      setContests(cached.data);
      setHasFetched(true);

      if (!cached.isStale) {
        // Cache is fresh (<= 10 mins) -> No background fetch needed
        setLoading(false);
        setIsBackgroundFetching(false);
        fetchRegistrations();
        return;
      }

      // Cache is stale (> 10 mins) -> Render stale cards immediately and fetch fresh data in background
      setIsBackgroundFetching(true);
      try {
        const [freshContests] = await Promise.all([
          fetchFreshContests(),
          fetchRegistrations()
        ]);
        setContests(freshContests);
      } catch (err) {
        console.warn('Background revalidation failed, retaining cached contests:', err);
        setIsCachedNotice(true);
      } finally {
        setIsBackgroundFetching(false);
      }
      return;
    }

    // 2. No valid cache found or forceNetwork is true -> Show loading state and fetch
    try {
      setLoading(true);
      const [freshContests] = await Promise.all([
        fetchFreshContests(),
        fetchRegistrations()
      ]);
      setContests(freshContests);
      setHasFetched(true);
    } catch (e: any) {
      console.warn('Failed to fetch upcoming contests:', e);
      if (contests.length > 0) {
        setIsCachedNotice(true);
      } else {
        setErrorMessage('Failed to fetch live contest schedules. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Hydration-safe initial check on client mount
  useEffect(() => {
    if (initialLoadCompleted.current) return;
    initialLoadCompleted.current = true;

    // Check if cache exists synchronously on client
    const cached = loadContestsCache();
    if (cached) {
      setContests(cached.data);
      setHasFetched(true);
      if (cached.isStale || initialExpand) {
        loadContestsData(false);
      }
    } else if (initialExpand) {
      loadContestsData(false);
    }
  }, [initialExpand]);

  // Handle clicking "Register Now" - opens official registration page & records intent in DB
  const handleRegisterClick = async (c: UnifiedContest) => {
    window.open(c.registerUrl, '_blank', 'noopener,noreferrer');
    
    // Update local state to pending_verification
    setRegistrations(prev => ({
      ...prev,
      [c.id]: { status: 'pending_verification', registered: false }
    }));

    try {
      await fetch('/api/coding/contests/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: c.platform,
          contestId: c.id,
          status: 'pending_verification',
          endTime: c.endTime
        })
      });
    } catch (e) {
      console.warn('Failed to record registration intent in DB:', e);
    }
  };

  // Handle registration verification
  const handleVerifyRegistration = async (c: UnifiedContest) => {
    setErrorMessage(null);
    setRegistrations(prev => ({
      ...prev,
      [c.id]: { status: 'verifying', registered: false }
    }));

    try {
      const res = await fetch('/api/coding/contests/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: c.platform,
          contestId: c.id,
          userConfirmed: true,
          endTime: c.endTime
        })
      });

      const json = await res.json();
      if (res.ok && json.registered) {
        setRegistrations(prev => ({
          ...prev,
          [c.id]: { status: 'verified', registered: true }
        }));
      } else {
        setErrorMessage(json.error || `Could not verify registration for ${c.platform}. Please ensure registration is complete.`);
        setRegistrations(prev => ({
          ...prev,
          [c.id]: { status: 'failed', registered: false }
        }));
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Verification service error. Please try again.');
      setRegistrations(prev => ({
        ...prev,
        [c.id]: { status: 'failed', registered: false }
      }));
    }
  };

  const handleToggle = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    if (nextState && (!hasFetched || contests.length === 0) && !loading) {
      loadContestsData(false);
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
        return { name: 'CodeChef', icon: <ChefHat size={13} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' };
      case 'CODEFORCES':
        return { name: 'Codeforces', icon: <BarChart3 size={13} />, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' };
      case 'LEETCODE':
        return { name: 'LeetCode', icon: <Code2 size={13} />, color: '#ffa116', bg: 'rgba(255, 161, 22, 0.15)', border: 'rgba(255, 161, 22, 0.4)' };
      case 'GEEKSFORGEEKS':
        return { name: 'GeeksforGeeks', icon: <BookOpen size={13} />, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)' };
      default:
        return { name: platform, icon: <Trophy size={13} />, color: 'var(--neon-cyan)', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.4)' };
    }
  };

  return (
    <div className="upcoming-contests-alert-card" style={{
      background: 'var(--bg-card)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      padding: '14px 18px',
      marginBottom: '20px',
      boxShadow: 'var(--shadow-md)',
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
              {(loading || isBackgroundFetching) && (
                <RefreshCw size={14} className="spin animate-spin" style={{ color: 'var(--neon-emerald)' }} />
              )}
            </h3>
            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isExpanded ? 'Live countdown timers & verified contest registration' : 'Tap 3-dots menu to view CodeChef, Codeforces & LeetCode contests'}
            </p>
          </div>
        </div>

        {/* 3-Dots / Close Toggle Button */}
        <button
          suppressHydrationWarning
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          title={isExpanded ? 'Close Contests' : 'View Contests'}
          style={{
            background: isExpanded ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: isExpanded ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--glass-border)',
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isExpanded ? '#f87171' : 'var(--text-main)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
        >
          {isExpanded ? <X size={20} /> : <MoreVertical size={20} />}
        </button>
      </div>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--glass-border)' }}>
          {/* Subtle Cached Data Notice */}
          {isCachedNotice && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              color: '#06b6d4',
              fontSize: '11px',
              marginBottom: '12px',
              fontWeight: 600
            }}>
              <span>Showing recently cached contests (offline fallback)</span>
              <button
                type="button"
                onClick={() => loadContestsData(true)}
                style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', fontWeight: 'bold' }}
              >
                Retry Network
              </button>
            </div>
          )}

          {/* Error / Verification Toast Banner */}
          {errorMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              fontSize: '12px',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
              <button 
                suppressHydrationWarning
                onClick={() => setErrorMessage(null)} 
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Platform Filter Buttons */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            background: 'var(--bg-secondary)',
            padding: '6px',
            borderRadius: '8px',
            border: '1px solid var(--border-default)',
            marginBottom: '14px',
          }}>
            {(['ALL', 'CODECHEF', 'CODEFORCES', 'LEETCODE', 'GEEKSFORGEEKS'] as const).map((plt) => (
              <button
                suppressHydrationWarning
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
                {plt === 'ALL' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Globe size={13} /> All</span>
                ) : plt === 'CODECHEF' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ChefHat size={13} /> CodeChef</span>
                ) : plt === 'CODEFORCES' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><BarChart3 size={13} /> Codeforces</span>
                ) : plt === 'LEETCODE' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Code2 size={13} /> LeetCode</span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><BookOpen size={13} /> GFG</span>
                )}
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
                const now = Date.now();
                const isLive = c.status === 'LIVE' || (now >= c.startTime && now <= c.endTime);
                const isStartingSoon = c.status === 'STARTING_SOON' || (!isLive && c.startTime - now <= 3 * 3600 * 1000);
                
                const regState = registrations[c.id] || { status: 'unverified', registered: false };
                const isVerifiedRegistered = regState.registered && regState.status === 'verified';
                const isPendingVerification = regState.status === 'pending_verification';
                const isVerifying = regState.status === 'verifying';

                return (
                  <div
                    key={c.id}
                    style={{
                      background: isLive ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-elevated)',
                      border: isLive ? '1px solid rgba(239, 68, 68, 0.4)' : isStartingSoon ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-default)',
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
                            <Radio size={12} /> LIVE NOW
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
                            <Zap size={12} /> STARTING SOON
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

                    {/* Registration Action Buttons */}
                    {isVerifiedRegistered ? (
                      <button
                        disabled
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'default',
                          background: 'rgba(34, 197, 94, 0.18)',
                          color: '#22c55e',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                        }}
                      >
                        <CheckCircle2 size={14} /> ✓ Registered
                      </button>
                    ) : isVerifying ? (
                      <button
                        disabled
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'var(--neon-cyan)',
                          border: '1px solid var(--glass-border)',
                          cursor: 'wait'
                        }}
                      >
                        <RefreshCw size={13} className="animate-spin" /> Verifying...
                      </button>
                    ) : isPendingVerification ? (
                      <button
                        onClick={() => handleVerifyRegistration(c)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.5)',
                          transition: 'all 0.2s ease',
                        }}
                        title="Click to confirm you completed registration on official site"
                      >
                        <Zap size={13} /> I&apos;ve Registered
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRegisterClick(c)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: isLive
                            ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                            : 'var(--neon-emerald)',
                          color: isLive ? '#fff' : '#000',
                          border: 'none',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {isLive ? (
                          <>
                            <Radio size={13} className="animate-pulse" /> Enter Live Contest
                          </>
                        ) : (
                          <>
                            Register Now <ExternalLink size={13} />
                          </>
                        )}
                      </button>
                    )}
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
