'use client';

import { useState } from 'react';
import {
  Link2, Unlink, RefreshCw, CheckCircle2, AlertCircle,
  ExternalLink, Trophy, Star, Clock, Code2,
} from 'lucide-react';

type Account = {
  platform: string;
  username: string;
  rating?: number | null;
  max_rating?: number | null;
  rank?: string | null;
  profile_url?: string;
  problems_solved?: number | null;
  last_synced_at?: string | null;
};

export default function CodingAccounts({ initial }: { initial: Account[] }) {
  const [accounts, setAccounts] = useState<Account[]>(initial);
  const [handle, setHandle] = useState('');
  const [lcHandle, setLcHandle] = useState('');
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const cf = accounts.find((x) => x.platform === 'CODEFORCES');
  const lc = accounts.find((x) => x.platform === 'LEETCODE');

  const connectPlatform = async (platform: string, username: string) => {
    if (!username.trim()) return;
    setConnecting(platform);
    setFeedback(null);
    try {
      const res = await fetch('/api/coding/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, username: username.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Connection failed.');
      setAccounts((a) => [...a.filter((x) => x.platform !== platform), json.data]);
      if (platform === 'CODEFORCES') setHandle('');
      else setLcHandle('');
      setFeedback({ type: 'success', message: `${platform === 'CODEFORCES' ? 'Codeforces' : 'LeetCode'} profile connected! Syncing data...` });
      syncPlatform(platform);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setConnecting(null);
    }
  };

  const disconnect = async (platform: string) => {
    setFeedback(null);
    await fetch(`/api/coding/accounts/${platform}`, { method: 'DELETE' });
    setAccounts((a) => a.filter((x) => x.platform !== platform));
    setFeedback({ type: 'success', message: `${platform} account disconnected.` });
  };

  const syncPlatform = async (platform: string) => {
    setSyncing(platform);
    setFeedback(null);
    try {
      const res = await fetch(`/api/coding/accounts/${platform}/sync`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Sync failed.');
      setAccounts((a) =>
        a.map((x) =>
          x.platform === platform
            ? {
                ...x,
                rating: json.data.rating,
                max_rating: json.data.maxRating,
                rank: json.data.rank,
                problems_solved: json.data.problemsSolved,
                last_synced_at: json.data.syncedAt,
              }
            : x
        )
      );
      setFeedback({ type: 'success', message: `✓ ${platform} synced — ${json.data.problemsSolved} problems solved.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSyncing(null);
    }
  };

  const timeSince = (iso: string | null | undefined) => {
    if (!iso) return null;
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Codeforces Card */}
      <div className="account-card">
        <div className="account-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="account-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
              <Code2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 700 }}>Codeforces</h3>
              <span style={{ fontSize: '11px', color: cf ? '#4ade80' : 'var(--text-muted)' }}>
                {cf ? '● Connected' : '○ Not connected'}
              </span>
            </div>
          </div>
        </div>

        {cf ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="account-stats-row">
              <div className="account-stat">
                <span className="account-stat-label"><Star size={12} /> Handle</span>
                <span className="account-stat-value" style={{ color: 'var(--neon-cyan)' }}>@{cf.username}</span>
              </div>
              {cf.rating != null && (
                <div className="account-stat">
                  <span className="account-stat-label"><Trophy size={12} /> Rating</span>
                  <span className="account-stat-value" style={{ color: 'var(--neon-gold)' }}>{cf.rating}</span>
                </div>
              )}
              {cf.max_rating != null && (
                <div className="account-stat">
                  <span className="account-stat-label">Max Rating</span>
                  <span className="account-stat-value">{cf.max_rating}</span>
                </div>
              )}
              {cf.rank && (
                <div className="account-stat">
                  <span className="account-stat-label">Rank</span>
                  <span className="account-stat-value" style={{ textTransform: 'capitalize' }}>{cf.rank}</span>
                </div>
              )}
              {cf.problems_solved != null && (
                <div className="account-stat">
                  <span className="account-stat-label"><CheckCircle2 size={12} /> Solved</span>
                  <span className="account-stat-value" style={{ color: '#4ade80' }}>{cf.problems_solved}</span>
                </div>
              )}
            </div>

            {cf.last_synced_at && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={11} /> Last synced: {timeSince(cf.last_synced_at)}
              </span>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="hub-solve-btn" onClick={() => syncPlatform('CODEFORCES')} disabled={syncing === 'CODEFORCES'}>
                <RefreshCw size={13} className={syncing === 'CODEFORCES' ? 'animate-spin' : ''} />
                {syncing === 'CODEFORCES' ? 'Syncing...' : 'Sync Now'}
              </button>
              <a href={cf.profile_url} target="_blank" rel="noreferrer" className="hub-external-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px' }}>
                <ExternalLink size={13} /> View Profile
              </a>
              <button type="button" className="hub-chip" style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => disconnect('CODEFORCES')}>
                <Unlink size={12} /> Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
              Connect your public Codeforces handle. Smart Learn never requests passwords or private data.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                className="hub-search-input"
                style={{ flex: '1 1 180px', minWidth: '150px', padding: '8px 12px', fontSize: 'var(--text-sm)', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', outline: 'none' }}
                placeholder="Codeforces handle (e.g. tourist)"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') connectPlatform('CODEFORCES', handle); }}
              />
              <button type="button" className="hub-solve-btn" onClick={() => connectPlatform('CODEFORCES', handle)} disabled={connecting === 'CODEFORCES'}>
                <Link2 size={13} /> {connecting === 'CODEFORCES' ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LeetCode Card */}
      <div className="account-card">
        <div className="account-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="account-icon" style={{ background: 'rgba(234,179,8,0.15)', color: '#facc15' }}>
              <Code2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 700 }}>LeetCode</h3>
              <span style={{ fontSize: '11px', color: lc ? '#4ade80' : 'var(--text-muted)' }}>
                {lc ? '● Connected' : '○ Not connected'}
              </span>
            </div>
          </div>
        </div>

        {lc ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="account-stats-row">
              <div className="account-stat">
                <span className="account-stat-label"><Star size={12} /> Handle</span>
                <span className="account-stat-value" style={{ color: '#facc15' }}>@{lc.username}</span>
              </div>
              {lc.rating != null && (
                <div className="account-stat">
                  <span className="account-stat-label"><Trophy size={12} /> Contest Rating</span>
                  <span className="account-stat-value" style={{ color: 'var(--neon-gold)' }}>{lc.rating}</span>
                </div>
              )}
              {lc.rank && (
                <div className="account-stat">
                  <span className="account-stat-label">Global Rank</span>
                  <span className="account-stat-value">{lc.rank}</span>
                </div>
              )}
              {lc.problems_solved != null && (
                <div className="account-stat">
                  <span className="account-stat-label"><CheckCircle2 size={12} /> Solved</span>
                  <span className="account-stat-value" style={{ color: '#4ade80' }}>{lc.problems_solved}</span>
                </div>
              )}
            </div>

            {lc.last_synced_at && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={11} /> Last synced: {timeSince(lc.last_synced_at)}
              </span>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="hub-solve-btn" onClick={() => syncPlatform('LEETCODE')} disabled={syncing === 'LEETCODE'}>
                <RefreshCw size={13} className={syncing === 'LEETCODE' ? 'animate-spin' : ''} />
                {syncing === 'LEETCODE' ? 'Syncing...' : 'Sync Now'}
              </button>
              <a href={lc.profile_url} target="_blank" rel="noreferrer" className="hub-external-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px' }}>
                <ExternalLink size={13} /> View Profile
              </a>
              <button type="button" className="hub-chip" style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => disconnect('LEETCODE')}>
                <Unlink size={12} /> Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
              Connect your public LeetCode username. Smart Learn uses LeetCode&apos;s public API — no passwords or cookies needed.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                className="hub-search-input"
                style={{ flex: '1 1 180px', minWidth: '150px', padding: '8px 12px', fontSize: 'var(--text-sm)', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', outline: 'none' }}
                placeholder="LeetCode username (e.g. neal_wu)"
                value={lcHandle}
                onChange={(e) => setLcHandle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') connectPlatform('LEETCODE', lcHandle); }}
              />
              <button type="button" className="hub-solve-btn" onClick={() => connectPlatform('LEETCODE', lcHandle)} disabled={connecting === 'LEETCODE'}>
                <Link2 size={13} /> {connecting === 'LEETCODE' ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: feedback.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${feedback.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, fontSize: 'var(--text-xs)' }}>
          {feedback.type === 'success' ? <CheckCircle2 size={14} style={{ color: '#4ade80' }} /> : <AlertCircle size={14} style={{ color: '#f87171' }} />}
          <span style={{ color: feedback.type === 'success' ? '#4ade80' : '#f87171' }}>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}
