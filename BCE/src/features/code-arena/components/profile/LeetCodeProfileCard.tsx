'use client';

import React, { useState } from 'react';
import { ExternalLink, CheckCircle2, Shield, Lock, RefreshCw, Key, Unlink } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LeetCodeProfileCard({ account }: { account: any }) {
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
      <div className="platform-profile-card leetcode-card not-connected animate-fade-in">
        <div className="platform-card-accent lc-accent" />
        <div className="platform-header">
          <div className="platform-title">
            <div className="platform-icon-badge lc-icon">LC</div>
            <h3>LeetCode</h3>
          </div>
          <span className="not-connected-badge">Not Connected</span>
        </div>
        <div className="platform-body" style={{ padding: '0 16px 16px 16px' }}>
          <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '8px' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
              Connect your public LeetCode username to sync your stats and rank.
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
    <div className="platform-profile-card leetcode-card animate-fade-in">
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
      
      <div className="platform-footer">
        <span className="last-synced">Last synced {account.last_synced_at ? new Date(account.last_synced_at).toLocaleString() : 'Never'}</span>
      </div>
    </div>
  );
}
