'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink, CheckCircle2, TrendingUp, Target, Award, Key, Unlink, Star, ChefHat } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CodeChefProfileCard({ account, isOwnProfile = true }: { account: any; isOwnProfile?: boolean }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [handle, setHandle] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
        body: JSON.stringify({ platform: 'CODECHEF', username: handle.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to connect CodeChef handle');
      setSuccessMsg('CodeChef profile connected! Syncing...');
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
      const res = await fetch('/api/coding/accounts/codechef/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to sync CodeChef');
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
    if (!confirm('Are you sure you want to disconnect your CodeChef account?')) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/coding/accounts/codechef', { method: 'DELETE' });
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
      <div className={`platform-profile-card codechef-card not-connected ${mounted ? 'animate-fade-in' : ''}`}>
        <div className="platform-card-accent cc-accent" style={{ background: 'linear-gradient(90deg, #d97706, #b45309)' }} />
        <div className="platform-header">
          <div className="platform-title">
            <div className="platform-icon-badge cc-icon" style={{ background: 'rgba(217, 119, 6, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
              <ChefHat size={18} />
            </div>
            <h3>CodeChef</h3>
          </div>
          <span className="not-connected-badge">Not Connected</span>
        </div>
        <div className="platform-body" style={{ padding: '0 16px 16px 16px' }}>
          {isOwnProfile ? (
            <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '8px' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
                Connect your public CodeChef handle to track rating, stars, rank, and solved problems.
              </p>
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
                  placeholder="CodeChef handle (e.g. tourist)"
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
              No CodeChef account connected.
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
      </div>
    );
  }

  const md = account.metadata || {};
  const easy = account.easy_solved || 0;
  const medium = account.medium_solved || 0;
  const hard = account.hard_solved || 0;
  const total = account.problems_solved || 0;
  const starsLabel = md.stars_label || account.rank || '1★ (Div 4)';

  const ratingDistribution = [
    { label: 'Easy', range: 'Div 4', value: easy, color: 'var(--neon-green)', pct: total ? (easy / total) * 100 : 0 },
    { label: 'Medium', range: 'Div 2/3', value: medium, color: 'var(--neon-yellow)', pct: total ? (medium / total) * 100 : 0 },
    { label: 'Hard', range: 'Div 1', value: hard, color: 'var(--neon-orange)', pct: total ? (hard / total) * 100 : 0 }
  ];

  return (
    <div className={`platform-profile-card codechef-card ${mounted ? 'animate-fade-in' : ''}`}>
      <div className="platform-card-accent cc-accent" style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)' }} />
      
      <div className="platform-header">
        <div className="platform-title">
          <div className="platform-icon-badge cc-icon" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
            <ChefHat size={18} />
          </div>
          <div className="platform-title-info">
            <h3>CodeChef</h3>
            <span className="platform-handle">@{account.username}</span>
          </div>
          <span className="connected-mark"><CheckCircle2 size={12} /> Connected</span>
        </div>
        
        <div className="platform-actions">
          <a href={`https://www.codechef.com/users/${account.username}`} target="_blank" rel="noopener noreferrer" className="icon-action-btn" title="Open on CodeChef">
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
        </div>
      </div>

      {(errorMsg || syncStatus === 'ERROR') && (
        <div className="sync-error-banner" style={{ margin: '8px 16px 0', fontSize: 'var(--text-xs)', color: '#f87171' }}>
          ⚠️ {errorMsg || 'Failed to sync CodeChef'}
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
          <span className="stat-label">Rating</span>
          <span className="stat-value highlight-purple" style={{ color: '#f59e0b' }}>{account.rating ?? '—'}</span>
          <span className="stat-sub" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#fbbf24' }}>
            <Star size={11} fill="#fbbf24" /> {starsLabel}
          </span>
        </div>
        <div className="stat-box">
          <span className="stat-icon-mini"><Award size={14} /></span>
          <span className="stat-label">Max Rating</span>
          <span className="stat-value">{account.max_rating ?? '—'}</span>
          <span className="stat-sub">Global: {md.global_rank ? `#${md.global_rank}` : '—'}</span>
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
    </div>
  );
}
