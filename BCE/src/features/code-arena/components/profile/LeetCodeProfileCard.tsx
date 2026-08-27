'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle2, RefreshCw, Key, Unlink, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LeetCodeProfileCard({ account, isOwnProfile = true }: { account: any; isOwnProfile?: boolean }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [handle, setHandle] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  // SVG chart helper
  const drawLineChart = (history: any[]) => {
    if (history.length === 0) return null;
    const padding = 12;
    const width = 240;
    const height = 70;
    
    const ratings = history.map(h => h.rating || 1500);
    const minRating = Math.min(...ratings) - 40;
    const maxRating = Math.max(...ratings) + 40;
    const ratingRange = maxRating - minRating || 1;
    
    const points = history.map((h, i) => {
      const x = padding + (i * (width - 2 * padding)) / (history.length - 1 || 1);
      const y = height - padding - (((h.rating || 1500) - minRating) * (height - 2 * padding)) / ratingRange;
      return { x, y, rating: h.rating, title: h.contest?.title || 'Contest' };
    });
    
    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const fillD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
    
    return { points, pathD, fillD };
  };

  const contestStats = account?.metadata?.contest_stats || {};
  const rawHistory = account?.metadata?.contest_history || [];
  const hasContestData = !!(contestStats.rating || account?.rating || rawHistory.length > 0);

  const rating = hasContestData ? (contestStats.rating || account?.rating || 0) : 0;
  const globalRanking = hasContestData ? (contestStats.globalRanking || null) : null;
  const totalParticipants = hasContestData ? (contestStats.totalParticipants || 0) : 0;
  const topPercentage = hasContestData ? (contestStats.topPercentage !== undefined ? contestStats.topPercentage : null) : null;
  const ratingDistribution = hasContestData && contestStats.ratingDistribution && contestStats.ratingDistribution.length > 0
    ? contestStats.ratingDistribution 
    : [];

  const contestHistory = hasContestData && rawHistory.length > 0 
    ? rawHistory 
    : [];

  const historyAttended = contestHistory.filter((h: any) => h.attended);
  const chartData = drawLineChart(historyAttended);
  const maxUserCount = Math.max(...ratingDistribution.map((d: any) => d.userCount || 1));

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;
    setIsConnecting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/coding/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'LEETCODE', username: handle.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to connect LeetCode profile');
      setSuccessMsg('Profile connected successfully! Syncing...');
      router.refresh();
      // Auto-trigger first sync
      await handleSync();
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check your username.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/coding/accounts/leetcode/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to sync LeetCode profile');
      setSuccessMsg('Synced successfully!');
      router.refresh();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your LeetCode account?')) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/coding/accounts/leetcode', { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to disconnect account');
      }
      setSuccessMsg('Disconnected.');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Disconnection failed.');
    }
  };

  if (!account) {
    return (
      <div className={`platform-profile-card leetcode-card not-connected ${mounted ? 'animate-fade-in' : ''}`}>
        <div className="platform-card-accent lc-accent" />
        <div className="platform-header">
          <div className="platform-title">
            <div className="platform-icon-badge lc-icon">LC</div>
            <h3>LeetCode</h3>
          </div>
          <span className="not-connected-badge">Not Connected</span>
        </div>
        <div className="platform-body" style={{ padding: '0 16px 16px 16px' }}>
          {isOwnProfile ? (
            <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '8px' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                <span>Connect your public LeetCode username to sync your stats and rank.</span>
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--neon-cyan, #06b6d4)',
                    fontSize: '11px',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showGuide ? 'Hide Guide' : 'Connection Guide'}
                </button>
              </p>

              {showGuide && (
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(6, 182, 212, 0.05)',
                  border: '1px solid rgba(6, 182, 212, 0.15)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  fontSize: '11px',
                  lineHeight: '1.4',
                  color: 'var(--text-main, #f8fafc)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--neon-cyan, #06b6d4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={12} /> LeetCode Connection Steps:
                  </div>
                  <div><strong>Step 1:</strong> First, open your browser and log into <a href="https://leetcode.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neon-cyan)', textDecoration: 'underline' }}>leetcode.com</a>.</div>
                  <div><strong>Step 2:</strong> Go to your profile. Copy ONLY your exact username (e.g. if profile page URL is <code>leetcode.com/yesiamrahul/</code>, copy <code>yesiamrahul</code>). Do NOT copy the full link.</div>
                  <div><strong>Step 3:</strong> Paste the username below and click <strong>Connect</strong>.</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="hub-search-input"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: 'var(--text-sm)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                  disabled={isConnecting}
                  placeholder="LeetCode username (e.g. neal_wu)"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={isConnecting || !handle.trim()}
                  className="hub-solve-btn"
                  style={{ padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: (isConnecting || !handle.trim()) ? 'not-allowed' : 'pointer' }}
                >
                  {isConnecting ? <RefreshCw size={13} className="spin animate-spin" /> : <Key size={13} />}
                  Connect
                </button>
              </div>
            </form>
          ) : (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
              No LeetCode account connected.
            </p>
          )}

          {errorMsg && (
            <div className="sync-error-banner" style={{ marginTop: '12px', fontSize: 'var(--text-xs)', color: '#f87171' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="sync-success-banner" style={{ marginTop: '12px', fontSize: 'var(--text-xs)', color: 'var(--neon-emerald)' }}>
              ✓ {successMsg}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`platform-profile-card leetcode-card ${mounted ? 'animate-fade-in' : ''}`}>
      <div className="platform-card-accent lc-accent" />
      <div className="platform-header">
        <div className="platform-title">
          <div className="platform-icon-badge lc-icon">LC</div>
          <div className="platform-title-info">
            <h3>LeetCode</h3>
            <span className="platform-handle">@{account.username}</span>
          </div>
          <span className="connected-mark"><CheckCircle2 size={12} /> Connected</span>
        </div>
        <div className="platform-actions">
          <a href={`https://leetcode.com/${account.username}`} target="_blank" rel="noopener noreferrer" className="icon-action-btn" title="Open on LeetCode">
            <ExternalLink size={15} />
          </a>
          {isOwnProfile && (
            <>
              <button 
                className={`sync-btn ${isSyncing ? 'syncing' : ''}`}
                onClick={handleSync}
                disabled={isSyncing}
              >
                <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
                {isSyncing ? 'Syncing…' : 'Sync'}
              </button>
              <button
                className="icon-action-btn"
                style={{ color: '#f87171' }}
                title="Disconnect Account"
                onClick={handleDisconnect}
              >
                <Unlink size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="sync-error-banner" style={{ fontSize: 'var(--text-xs)', color: '#f87171', margin: '8px 16px 0' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="sync-success-banner" style={{ fontSize: 'var(--text-xs)', color: 'var(--neon-emerald)', margin: '8px 16px 0' }}>
          ✓ {successMsg}
        </div>
      )}

      <div className="platform-stats-grid four-col">
        <div className="stat-box highlight-box">
          <span className="stat-label">Solved</span>
          <span className="stat-value highlight-lc">{account.problems_solved ?? '—'}</span>
          <span className="stat-sub">Total</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Easy</span>
          <span className="stat-value easy-val">{account.easy_solved ?? '—'}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Medium</span>
          <span className="stat-value medium-val">{account.medium_solved ?? '—'}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Hard</span>
          <span className="stat-value hard-val">{account.hard_solved ?? '—'}</span>
        </div>
      </div>
      
      {/* Contest Performance Charts Block */}
      {hasContestData ? (
        <div className="leetcode-contest-charts-section" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          padding: '16px 20px',
          borderTop: '1px solid var(--glass-border)',
          background: 'rgba(255, 255, 255, 0.005)',
        }}>
          {/* Left Side: Contest Rating, Ranking, Attended + Line Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Contest Rating</span>
                <strong style={{ fontSize: '18px', color: '#ffa116', fontWeight: 800 }}>{rating.toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Global Ranking</span>
                <strong style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 800 }}>
                  {globalRanking ? globalRanking.toLocaleString() : '—'}
                  {totalParticipants > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '9px' }}>/{totalParticipants.toLocaleString()}</span>}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Attended</span>
                <strong style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 800 }}>{contestStats.totalContests || historyAttended.length || 0}</strong>
              </div>
            </div>

            {/* Line Chart SVG */}
            {chartData && (
              <div style={{ position: 'relative', marginTop: '4px' }}>
                <svg width="100%" height="75" viewBox="0 0 240 75" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="lcLineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(255, 161, 22, 0.25)" />
                      <stop offset="100%" stopColor="rgba(255, 161, 22, 0)" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  <line x1="0" y1="12" x2="240" y2="12" stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
                  <line x1="0" y1="37" x2="240" y2="37" stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
                  <line x1="0" y1="62" x2="240" y2="62" stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />

                  {/* Fill area */}
                  <path d={chartData.fillD} fill="url(#lcLineGrad)" />
                  {/* Curve Line */}
                  <path d={chartData.pathD} fill="none" stroke="#ffa116" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Interactive Dots */}
                  {chartData.points.map((p: any, idx: number) => {
                    const isLast = idx === chartData.points.length - 1;
                    return (
                      <g key={idx} className="chart-node-group">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isLast ? 4 : 3}
                          fill={isLast ? '#fff' : '#ffa116'}
                          stroke={isLast ? '#ffa116' : 'rgba(11, 15, 25, 0.9)'}
                          strokeWidth="1.5"
                          style={{ cursor: 'pointer' }}
                        />
                        {/* Node tooltip text */}
                        <g className="chart-node-tooltip" style={{ opacity: 0, transition: 'opacity 0.15s ease' }}>
                          <rect x={p.x - 30} y={p.y - 28} width="60" height="20" rx="3" fill="#0f172a" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                          <text x={p.x} y={p.y - 14} fill="#fff" fontSize="9" fontWeight="700" textAnchor="middle">{p.rating}</text>
                        </g>
                      </g>
                    );
                  })}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
                  <span>Apr 2026</span>
                  <span>May 2026</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Top % + Distribution Bar Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, borderLeft: '1px solid var(--glass-border)', paddingLeft: '16px' }}>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Top</span>
              <strong style={{ fontSize: '18px', color: '#ffa116', fontWeight: 800 }}>{topPercentage ? `${topPercentage}%` : '—'}</strong>
            </div>

            {/* Bar Chart SVG */}
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '65px', gap: '2px', paddingBottom: '2px', position: 'relative' }}>
              {ratingDistribution.map((dist: any, idx: number) => {
                const isHighlight = rating >= dist.minRating && rating < dist.maxRating;
                const barHeightPercent = Math.max(8, ((dist.userCount || 1) / maxUserCount) * 100);
                const barColor = isHighlight ? '#ffa116' : 'rgba(255, 255, 255, 0.15)';
                const barHoverColor = isHighlight ? '#ffb84d' : 'rgba(255, 255, 255, 0.35)';

                return (
                  <div
                    key={idx}
                    className="dist-bar"
                    style={{
                      flex: 1,
                      height: `${barHeightPercent}%`,
                      background: barColor,
                      borderRadius: '1px 1px 0 0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = barHoverColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = barColor;
                    }}
                  >
                    {/* Tooltip */}
                    <div className="dist-bar-tooltip" style={{
                      visibility: 'hidden',
                      opacity: 0,
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%) translateY(-6px)',
                      background: '#0b0f19',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--text-main)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      whiteSpace: 'nowrap',
                      zIndex: 1000,
                      pointerEvents: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                      transition: 'opacity 0.15s, transform 0.15s'
                    }}>
                      <div style={{ fontWeight: 700 }}>Rating: {dist.minRating}-{dist.maxRating}</div>
                      <div style={{ color: 'var(--text-muted)' }}>Users: {dist.userCount.toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
              <span>0</span>
              <span>3000+</span>
            </div>
          </div>

          <style>{`
            .chart-node-group:hover .chart-node-tooltip {
              opacity: 1 !important;
            }
            .dist-bar:hover .dist-bar-tooltip {
              visibility: visible !important;
              opacity: 1 !important;
              transform: translateX(-50%) translateY(-4px) !important;
            }
          `}</style>
        </div>
      ) : (
        <div style={{
          padding: '24px 20px',
          borderTop: '1px solid var(--glass-border)',
          textAlign: 'center',
          color: 'var(--text-muted, #94a3b8)',
          fontSize: '12px',
          background: 'rgba(255, 255, 255, 0.002)',
          lineHeight: '1.5'
        }}>
          No contest history found. Participate in LeetCode contests (Weekly / Biweekly) to sync your contest rating, global rankings, and chart statistics.
        </div>
      )}

      <div className="platform-footer">
        <span className="last-synced">Last synced {mounted && account.last_synced_at ? new Date(account.last_synced_at).toLocaleString() : '—'}</span>
      </div>
    </div>
  );
}
