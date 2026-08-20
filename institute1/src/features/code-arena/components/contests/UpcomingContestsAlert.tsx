'use client';

import React, { useState, useEffect } from 'react';
import { Bell, ExternalLink, Timer, Radio, Calendar, RefreshCw, MoreVertical, X, ChefHat, BarChart3, Code2, Trophy, Globe, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import type { UnifiedContest } from '@/app/api/coding/contests/route';

export function formatTimeRemaining(targetTimeMs: number): string {
  const diff = targetTimeMs - Date.now();
  if (diff <= 0) return 'Ended / Live Now';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

interface RegistrationState {
  status: 'unverified' | 'pending_verification' | 'verifying' | 'verified' | 'failed';
  registered: boolean;
}

export default function UpcomingContestsAlert({ initialExpand = false }: { initialExpand?: boolean }) {
  const [contests, setContests] = useState<UnifiedContest[]>([]);
  const [registrations, setRegistrations] = useState<Record<string, RegistrationState>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [hasFetched, setHasFetched] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpand);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchContests = async () => {
    setLoading(true);
    try {
      const [contestRes, regRes] = await Promise.all([
        fetch('/api/coding/contests'),
        fetch('/api/coding/contests/registrations')
      ]);

      if (contestRes.ok) {
        const cJson = await contestRes.json();
        setContests(cJson.contests || []);
      }

      if (regRes.ok) {
        const rJson = await regRes.json();
        const map: Record<string, RegistrationState> = {};
        if (Array.isArray(rJson.registrations)) {
          rJson.registrations.forEach((r: any) => {
            map[r.contest_id] = {
              status: r.status || (r.registered ? 'verified' : 'unverified'),
              registered: !!r.registered
            };
          });
        }
        setRegistrations(map);
      }
      setHasFetched(true);
    } catch (err) {
      console.warn('Failed to fetch contests/registrations:', err);
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
    if (!hasFetched && !isExpanded) {
      fetchContests();
    }
    setIsExpanded(!isExpanded);
  };

  const handleRegisterClick = async (c: UnifiedContest) => {
    window.open(c.registerUrl, '_blank', 'noopener,noreferrer');
    
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
        setErrorMessage(json.error || `Could not verify registration for ${c.platform}.`);
        setRegistrations(prev => ({
          ...prev,
          [c.id]: { status: 'failed', registered: false }
        }));
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Verification network request failed.');
      setRegistrations(prev => ({
        ...prev,
        [c.id]: { status: 'failed', registered: false }
      }));
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'CODECHEF':
        return <ChefHat size={16} style={{ color: '#f59e0b' }} />;
      case 'CODEFORCES':
        return <BarChart3 size={16} style={{ color: '#3b82f6' }} />;
      case 'LEETCODE':
        return <Code2 size={16} style={{ color: '#eab308' }} />;
      default:
        return <Trophy size={16} style={{ color: 'var(--neon-emerald)' }} />;
    }
  };

  return (
    <div className="upcoming-contests-card" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 20px',
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
              {isExpanded ? 'Live countdown timers & verified contest registration' : 'Tap 3-dots menu to view CodeChef, Codeforces & LeetCode contests'}
            </p>
          </div>
        </div>

        {/* 3-Dots / Close Toggle Button */}
        <button
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
          {errorMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: 'var(--text-xs)',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={15} />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
          )}

          {loading && !hasFetched ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', color: 'var(--text-muted)', gap: '8px', fontSize: '13px' }}>
              <RefreshCw size={16} className="spin animate-spin" />
              <span>Fetching live contests from CodeChef, Codeforces & LeetCode...</span>
            </div>
          ) : contests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No upcoming contests scheduled at the moment.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {contests.map((c) => {
                const regState = registrations[c.id] || { status: 'unverified', registered: false };

                return (
                  <div key={c.id} style={{
                    background: 'var(--bg-dark-card, rgba(15, 23, 42, 0.6))',
                    border: regState.status === 'verified' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {getPlatformIcon(c.platform)}
                          <span>{c.platform}</span>
                        </div>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: c.status === 'LIVE' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                          color: c.status === 'LIVE' ? '#ef4444' : '#60a5fa',
                          border: c.status === 'LIVE' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(59, 130, 246, 0.4)',
                        }}>
                          {c.status === 'LIVE' ? '🔴 LIVE' : 'UPCOMING'}
                        </span>
                      </div>

                      <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: '#f8fafc', lineHeight: '1.3' }}>
                        {c.title}
                      </h4>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <Timer size={13} style={{ color: 'var(--neon-emerald)' }} />
                        <span>{formatTimeRemaining(c.startTime)}</span>
                      </div>
                    </div>

                    {/* Registration Action Buttons */}
                    <div style={{ marginTop: '4px' }}>
                      {regState.status === 'verified' ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          color: '#4ade80',
                          fontSize: '12px',
                          fontWeight: 700
                        }}>
                          <CheckCircle2 size={14} />
                          <span>✓ Registered</span>
                        </div>
                      ) : regState.status === 'verifying' ? (
                        <button disabled style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(234, 179, 8, 0.15)',
                          border: '1px solid rgba(234, 179, 8, 0.4)',
                          color: '#facc15',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'wait'
                        }}>
                          <RefreshCw size={13} className="spin animate-spin" />
                          <span>Verifying...</span>
                        </button>
                      ) : regState.status === 'pending_verification' ? (
                        <button onClick={() => handleVerifyRegistration(c)} style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          color: '#60a5fa',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}>
                          <span>I&apos;ve Registered</span>
                          <CheckCircle2 size={13} />
                        </button>
                      ) : (
                        <button onClick={() => handleRegisterClick(c)} style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--neon-emerald)',
                          border: 'none',
                          color: '#000',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}>
                          <span>Register Now</span>
                          <ExternalLink size={13} />
                        </button>
                      )}
                    </div>
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
