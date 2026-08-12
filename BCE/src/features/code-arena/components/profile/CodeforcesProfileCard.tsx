'use client';

import React, { useState } from 'react';
import { RefreshCw, ExternalLink, CheckCircle2, TrendingUp, Target, Award } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CodeforcesProfileCard({ account }: { account: any }) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');

  if (!account) {
    return (
      <div className="platform-profile-card codeforces-card not-connected">
        <div className="platform-card-accent cf-accent" />
        <div className="platform-header">
          <div className="platform-title">
            <div className="platform-icon-badge cf-icon">CF</div>
            <h3>Codeforces</h3>
          </div>
          <span className="not-connected-badge">Not Connected</span>
        </div>
        <div className="platform-body empty-state">
          <div className="empty-state-graphic">
            <Target size={36} strokeWidth={1.5} />
          </div>
          <p>Connect your Codeforces account in <strong>Settings</strong> to track your competitive progress.</p>
        </div>
      </div>
    );
  }

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus('IDLE');
    setErrorMsg('');

    try {
      const res = await fetch('/api/coding/accounts/codeforces/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to sync Codeforces');
      setSyncStatus('SUCCESS');
      router.refresh();
      setTimeout(() => setSyncStatus('IDLE'), 3000);
    } catch (e: any) {
      setSyncStatus('ERROR');
      setErrorMsg(e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const md = account.metadata || {};
  const easy = account.easy_solved || 0;
  const medium = account.medium_solved || 0;
  const hard = account.hard_solved || 0;
  const total = account.problems_solved || 0;
  
  const ratingDistribution = [
    { label: 'Easy', range: '<1200', value: easy, color: 'var(--neon-green)', pct: total ? (easy / total) * 100 : 0 },
    { label: 'Medium', range: '1200–1600', value: medium, color: 'var(--neon-yellow)', pct: total ? (medium / total) * 100 : 0 },
    { label: 'Hard', range: '>1600', value: hard, color: 'var(--neon-orange)', pct: total ? (hard / total) * 100 : 0 }
  ];

  return (
    <div className="platform-profile-card codeforces-card">
      <div className="platform-card-accent cf-accent" />
      
      <div className="platform-header">
        <div className="platform-title">
          <div className="platform-icon-badge cf-icon">CF</div>
          <div className="platform-title-info">
            <h3>Codeforces</h3>
            <span className="platform-handle">@{account.username}</span>
          </div>
          <span className="connected-mark"><CheckCircle2 size={12} /> Connected</span>
        </div>
        
        <div className="platform-actions">
          <a href={`https://codeforces.com/profile/${account.username}`} target="_blank" rel="noopener noreferrer" className="icon-action-btn" title="Open on Codeforces">
            <ExternalLink size={15} />
          </a>
          <button 
            className={`sync-btn ${isSyncing ? 'syncing' : ''} ${syncStatus === 'SUCCESS' ? 'success' : ''} ${syncStatus === 'ERROR' ? 'error' : ''}`}
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
            {isSyncing ? 'Syncing…' : syncStatus === 'SUCCESS' ? 'Synced!' : syncStatus === 'ERROR' ? 'Failed' : 'Sync'}
          </button>
        </div>
      </div>

      {syncStatus === 'ERROR' && (
        <div className="sync-error-banner">
          {errorMsg}
        </div>
      )}

      <div className="platform-stats-grid three-col">
        <div className="stat-box">
          <span className="stat-icon-mini"><TrendingUp size={14} /></span>
          <span className="stat-label">Rating</span>
          <span className="stat-value highlight-purple">{account.rating || '—'}</span>
          <span className="stat-sub">{account.rank || 'Unrated'}</span>
        </div>
        <div className="stat-box">
          <span className="stat-icon-mini"><Award size={14} /></span>
          <span className="stat-label">Max Rating</span>
          <span className="stat-value">{account.max_rating || '—'}</span>
          <span className="stat-sub">{md.max_rank || '—'}</span>
        </div>
        <div className="stat-box">
          <span className="stat-icon-mini"><Target size={14} /></span>
          <span className="stat-label">Solved</span>
          <span className="stat-value">{total}</span>
          <span className="stat-sub">Total</span>
        </div>
      </div>

      <div className="difficulty-breakdown">
        <h4>Difficulty Distribution</h4>
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
        <span className="last-synced">Last synced {account.last_synced_at ? new Date(account.last_synced_at).toLocaleString() : 'Never'}</span>
      </div>
    </div>
  );
}
