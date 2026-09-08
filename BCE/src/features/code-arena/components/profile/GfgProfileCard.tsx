'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink, CheckCircle2, TrendingUp, Target, Award, Key, Unlink, Sparkles, BookOpen, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GfgProfileCard({ account, isOwnProfile = true }: { account: any; isOwnProfile?: boolean }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [handle, setHandle] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showGuide, setShowGuide] = useState(false);

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
        body: JSON.stringify({ platform: 'GEEKSFORGEEKS', username: handle.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to connect GeeksforGeeks handle');
      setSuccessMsg('GeeksforGeeks profile connected! Syncing...');
      router.refresh();
      await handleSync();
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection failed.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus('IDLE');
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/coding/accounts/geeksforgeeks/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to sync GeeksforGeeks');
      setSyncStatus('SUCCESS');
      setSuccessMsg('Synced successfully!');
      router.refresh();
      setTimeout(() => {
        setSyncStatus('IDLE');
        setSuccessMsg('');
      }, 3000);
    } catch (e: any) {
      setSyncStatus('ERROR');
      setErrorMsg(e.message || 'Sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your GeeksforGeeks account?')) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/coding/accounts/geeksforgeeks', { method: 'DELETE' });
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
      <div className={`platform-profile-card gfg-card not-connected ${mounted ? 'animate-fade-in' : ''}`}>
        <div className="platform-card-accent gfg-accent" style={{ background: 'linear-gradient(90deg, #16a34a, #15803d)' }} />
        <div 
          className="platform-header" 
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button, a, input')) return;
            setIsExpanded(!isExpanded);
          }}
        >
          <div className="platform-title">
            <div className="platform-icon-badge gfg-icon" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
              <BookOpen size={18} />
            </div>
            <h3>GeeksforGeeks</h3>
          </div>
          <div className="platform-actions">
            <span className="not-connected-badge">Not Connected</span>
            <button
              type="button"
              className="icon-action-btn"
              title={isExpanded ? "Collapse card" : "Expand card"}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <ChevronDown 
                size={16} 
                style={{ 
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.25s ease' 
                }} 
              />
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="platform-body" style={{ padding: '0 16px 16px 16px' }}>
            {isOwnProfile ? (
              <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '8px' }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                  <span>Connect your public GeeksforGeeks handle to track coding score, rank, and solved problems.</span>
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
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    color: 'var(--text-main, #f8fafc)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={12} /> GeeksforGeeks Connection Steps:
                    </div>
                    <div><strong>Step 1:</strong> Log into <a href="https://www.geeksforgeeks.org" target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', textDecoration: 'underline' }}>geeksforgeeks.org</a>.</div>
                    <div><strong>Step 2:</strong> Copy ONLY your exact username/handle from your profile page (e.g. <code>geek_123</code>).</div>
                    <div><strong>Step 3:</strong> Paste your username below and click <strong>Connect</strong>.</div>
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
                    placeholder="GFG handle (e.g. geek_user)"
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
                No GeeksforGeeks account connected.
              </p>
            )}

            {errorMsg && (
              <div className="sync-error-banner" style={{ marginTop: '12px', fontSize: 'var(--text-xs)', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Unlink size={13} /> {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="sync-success-banner" style={{ marginTop: '12px', fontSize: 'var(--text-xs)', color: 'var(--neon-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={13} /> {successMsg}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const md = account.metadata || {};
  const easy = account.easy_solved || 0;
  const medium = account.medium_solved || 0;
  const hard = account.hard_solved || 0;
  const total = account.problems_solved || 0;
  const score = account.rating ?? md.coding_score ?? '—';

  const ratingDistribution = [
    { label: 'Easy', range: 'Basic/Easy', value: easy, color: 'var(--neon-green)', pct: total ? (easy / total) * 100 : 0 },
    { label: 'Medium', range: 'Medium', value: medium, color: 'var(--neon-yellow)', pct: total ? (medium / total) * 100 : 0 },
    { label: 'Hard', range: 'Hard', value: hard, color: 'var(--neon-orange)', pct: total ? (hard / total) * 100 : 0 }
  ];

  return (
    <div className={`platform-profile-card gfg-card ${mounted ? 'animate-fade-in' : ''}`}>
      <div className="platform-card-accent gfg-accent" style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a)' }} />
      
      <div 
        className="platform-header" 
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, a, input')) return;
          setIsExpanded(!isExpanded);
        }}
      >
        <div className="platform-title">
          <div className="platform-icon-badge gfg-icon" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
            <BookOpen size={18} />
          </div>
          <div className="platform-title-info">
            <h3>GeeksforGeeks</h3>
            <span className="platform-handle">@{account.username}</span>
          </div>
          <span className="connected-mark"><CheckCircle2 size={12} /> Connected</span>
        </div>
        
        <div className="platform-actions">
          <a href={`https://www.geeksforgeeks.org/user/${account.username}/`} target="_blank" rel="noopener noreferrer" className="icon-action-btn" title="Open on GeeksforGeeks">
            <ExternalLink size={15} />
          </a>
          {isOwnProfile && (
            <>
              <button 
                className={`sync-btn ${isSyncing ? 'syncing' : ''} ${syncStatus === 'SUCCESS' ? 'success' : ''} ${syncStatus === 'ERROR' ? 'error' : ''}`}
                onClick={handleSync}
                disabled={isSyncing}
              >
                <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
                {isSyncing ? 'Syncing…' : syncStatus === 'SUCCESS' ? 'Synced!' : syncStatus === 'ERROR' ? 'Failed' : 'Sync'}
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
          <button
            type="button"
            className="icon-action-btn"
            title={isExpanded ? "Collapse card" : "Expand card"}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronDown 
              size={16} 
              style={{ 
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', 
                transition: 'transform 0.25s ease' 
              }} 
            />
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {(errorMsg || syncStatus === 'ERROR') && (
            <div className="sync-error-banner" style={{ margin: '8px 16px 0', fontSize: 'var(--text-xs)', color: '#f87171' }}>
              ⚠️ {errorMsg || 'Failed to sync GeeksforGeeks'}
            </div>
          )}

          {successMsg && (
            <div className="sync-success-banner" style={{ fontSize: 'var(--text-xs)', color: 'var(--neon-emerald)', margin: '8px 16px 0' }}>
              ✓ {successMsg}
            </div>
          )}

          <div className="platform-stats-grid three-col">
            <div className="stat-box">
              <span className="stat-icon-mini"><TrendingUp size={14} /></span>
              <span className="stat-label">Coding Score</span>
              <span className="stat-value highlight-purple" style={{ color: '#22c55e' }}>{score}</span>
              <span className="stat-sub">Score</span>
            </div>
            <div className="stat-box">
              <span className="stat-icon-mini"><Award size={14} /></span>
              <span className="stat-label">Global Rank</span>
              <span className="stat-value">{account.rank ?? (md.global_rank ? `#${md.global_rank}` : '—')}</span>
              <span className="stat-sub">Rank</span>
            </div>
            <div className="stat-box">
              <span className="stat-icon-mini"><Target size={14} /></span>
              <span className="stat-label">Solved</span>
              <span className="stat-value">{total ?? '—'}</span>
              <span className="stat-sub">Total</span>
            </div>
          </div>

          <div className="difficulty-breakdown">
            <h4>Difficulty Breakdown</h4>
            <div className="difficulty-bars">
              {ratingDistribution.map((d, i) => (
                <div key={i} className="difficulty-bar-row">
                  <div className="diff-label-value">
                    <span className="diff-label-text">
                      <span className="diff-color-dot" style={{ backgroundColor: d.color }} />
                      {d.label} <span className="diff-range">{d.range}</span>
                    </span>
                    <span className="diff-count">{d.value}</span>
                  </div>
                  <div className="diff-progress-track">
                    <div 
                      className="diff-progress-fill" 
                      style={{ 
                        width: `${d.pct}%`,
                        backgroundColor: d.color,
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="platform-footer">
            <span className="last-synced">Last synced {mounted && account.last_synced_at ? new Date(account.last_synced_at).toLocaleString() : '—'}</span>
          </div>
        </>
      )}
    </div>
  );
}
