'use client';

import { useState } from 'react';
import {
  Link2, Unlink, RefreshCw, CheckCircle2, AlertCircle,
  ExternalLink, Trophy, Star, Clock, Code2, ChevronDown, ChevronUp, Zap,
} from 'lucide-react';

type Account = {
  platform: string;
  username: string;
  rating?: number | null;
  max_rating?: number | null;
  rank?: string | null;
  profile_url?: string;
  problems_solved?: number | null;
  easy_solved?: number | null;
  medium_solved?: number | null;
  hard_solved?: number | null;
  last_synced_at?: string | null;
};

type PlatformConfig = {
  key: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  placeholder: string;
  logo: string;
  description: string;
};

const PLATFORMS: PlatformConfig[] = [
  {
    key: 'CODEFORCES',
    label: 'Codeforces',
    color: '#60a5fa',
    bgColor: 'rgba(59,130,246,0.1)',
    borderColor: 'rgba(59,130,246,0.25)',
    glowColor: 'rgba(59,130,246,0.4)',
    placeholder: 'Handle (e.g. tourist)',
    logo: 'CF',
    description: 'Connect your public Codeforces handle to track rating, contest history, and submissions.',
  },
  {
    key: 'LEETCODE',
    label: 'LeetCode',
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.25)',
    glowColor: 'rgba(245,158,11,0.4)',
    placeholder: 'Username (e.g. neal_wu)',
    logo: 'LC',
    description: 'Connect your LeetCode profile to track problems solved and contest ranking.',
  },
  {
    key: 'CODECHEF',
    label: 'CodeChef',
    color: '#f97316',
    bgColor: 'rgba(249,115,22,0.1)',
    borderColor: 'rgba(249,115,22,0.25)',
    glowColor: 'rgba(249,115,22,0.4)',
    placeholder: 'Handle (e.g. admin)',
    logo: 'CC',
    description: 'Connect your CodeChef handle to track your star rating and competitive progress.',
  },
  {
    key: 'GEEKSFORGEEKS',
    label: 'GeeksforGeeks',
    color: '#22c55e',
    bgColor: 'rgba(34,197,94,0.1)',
    borderColor: 'rgba(34,197,94,0.25)',
    glowColor: 'rgba(34,197,94,0.4)',
    placeholder: 'Username (e.g. geek123)',
    logo: 'GFG',
    description: 'Connect your GFG profile to track your coding score, rank, and problems solved.',
  },
];

function timeSince(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function LogoBadge({ text, color, bgColor }: { text: string; color: string; bgColor: string }) {
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '12px',
      background: bgColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 900, fontSize: text.length > 2 ? '11px' : '14px',
      color, letterSpacing: '-0.5px', flexShrink: 0,
    }}>
      {text}
    </div>
  );
}

function ProblemBar({ easy, medium, hard }: { easy: number; medium: number; hard: number }) {
  const total = easy + medium + hard;
  if (total === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', gap: '2px', height: '5px', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ flex: easy, background: '#4ade80', transition: 'flex 0.6s ease' }} />
        <div style={{ flex: medium, background: '#fb923c', transition: 'flex 0.6s ease' }} />
        <div style={{ flex: hard, background: '#f87171', transition: 'flex 0.6s ease' }} />
      </div>
      <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: 'var(--text-muted)' }}>
        <span style={{ color: '#4ade80' }}>E: {easy}</span>
        <span style={{ color: '#fb923c' }}>M: {medium}</span>
        <span style={{ color: '#f87171' }}>H: {hard}</span>
      </div>
    </div>
  );
}

export default function CodingAccounts({ initial }: { initial: Account[] }) {
  const [accounts, setAccounts] = useState<Account[]>(initial);
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const getAccount = (platform: string) => accounts.find((x) => x.platform === platform);

  const connectPlatform = async (platform: string) => {
    const username = (handles[platform] || '').trim();
    if (!username) return;
    setConnecting(platform);
    setFeedback(null);
    try {
      const res = await fetch('/api/coding/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, username }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Connection failed.');
      setAccounts((a) => [...a.filter((x) => x.platform !== platform), json.data]);
      setHandles((h) => ({ ...h, [platform]: '' }));
      setFeedback({ type: 'success', message: `${platform} profile connected! Syncing data...` });
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
                easy_solved: json.data.easySolved,
                medium_solved: json.data.mediumSolved,
                hard_solved: json.data.hardSolved,
                last_synced_at: json.data.syncedAt,
              }
            : x
        )
      );
      setFeedback({ type: 'success', message: `✓ ${platform} synced — ${json.data.problemsSolved ?? 0} problems solved.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <style>{`
        .ca-card {
          background: var(--bg-card, rgba(15,23,42,0.8));
          border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
          border-radius: 16px;
          padding: 18px;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
          position: relative;
          overflow: hidden;
        }
        .ca-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }
        .ca-card:hover { transform: translateY(-1px); }
        .ca-card-connected { border-color: var(--ca-border); box-shadow: 0 0 20px var(--ca-glow); }
        .ca-card-connected::before { opacity: 1; background: linear-gradient(135deg, var(--ca-bg), transparent 70%); }
        .ca-stat-chip {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 6px 10px;
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 60px;
        }
        .ca-stat-chip-label { font-size: 9px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .ca-stat-chip-value { font-size: 14px; font-weight: 800; }
        .ca-input {
          flex: 1 1 160px;
          min-width: 140px;
          padding: 9px 13px;
          font-size: 13px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: var(--text-main);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .ca-input:focus { border-color: var(--ca-color); box-shadow: 0 0 0 2px var(--ca-glow); }
        .ca-btn-connect {
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 10px;
          border: none;
          background: var(--ca-color);
          color: #0a0f1e;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: opacity 0.2s, box-shadow 0.2s;
          white-space: nowrap;
        }
        .ca-btn-connect:hover:not(:disabled) { opacity: 0.9; box-shadow: 0 4px 16px var(--ca-glow); }
        .ca-btn-connect:disabled { opacity: 0.5; cursor: not-allowed; }
        .ca-btn-sync {
          padding: 7px 13px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 9px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-main);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: background 0.2s, border-color 0.2s;
          white-space: nowrap;
        }
        .ca-btn-sync:hover:not(:disabled) { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
        .ca-btn-sync:disabled { opacity: 0.5; cursor: not-allowed; }
        .ca-btn-disconnect {
          padding: 7px 13px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 9px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #f87171;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .ca-btn-disconnect:hover { background: rgba(239,68,68,0.15); }
        .ca-view-btn {
          padding: 7px 13px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 9px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-secondary);
          display: inline-flex;
          align-items: center;
          gap: 5px;
          text-decoration: none;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .ca-view-btn:hover { background: rgba(255,255,255,0.08); color: var(--text-main); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ca-spin { animation: spin 1s linear infinite; }
        .ca-connected-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; display: inline-block; box-shadow: 0 0 6px rgba(34,197,94,0.6); }
        .ca-disconnected-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.2); display: inline-block; }
      `}</style>

      {PLATFORMS.map((plat) => {
        const acc = getAccount(plat.key);
        const isConnected = !!acc;
        const isExpanded = expanded === plat.key || !isConnected;

        return (
          <div
            key={plat.key}
            className={`ca-card${isConnected ? ' ca-card-connected' : ''}`}
            style={{
              '--ca-color': plat.color,
              '--ca-bg': plat.bgColor,
              '--ca-border': plat.borderColor,
              '--ca-glow': plat.glowColor,
            } as React.CSSProperties}
          >
            {/* Header Row */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: isConnected ? 'pointer' : 'default' }}
              onClick={() => isConnected && setExpanded(expanded === plat.key ? null : plat.key)}
            >
              <LogoBadge text={plat.logo} color={plat.color} bgColor={plat.bgColor} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-main)' }}>{plat.label}</span>
                  {isConnected ? (
                    <>
                      <span className="ca-connected-dot" />
                      <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>Connected</span>
                      {acc.username && (
                        <span style={{ fontSize: '11px', color: plat.color, fontWeight: 700, marginLeft: 2 }}>@{acc.username}</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="ca-disconnected-dot" />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Not connected</span>
                    </>
                  )}
                </div>
                {isConnected && acc.last_synced_at && (
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={9} /> {timeSince(acc.last_synced_at)}
                  </div>
                )}
              </div>
              {/* Stats summary chips (collapsed view) */}
              {isConnected && !isExpanded && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {acc.rating != null && (
                    <span style={{ fontSize: '12px', fontWeight: 800, color: plat.color, background: plat.bgColor, padding: '3px 8px', borderRadius: '6px' }}>
                      ★ {acc.rating}
                    </span>
                  )}
                  {acc.problems_solved != null && (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80', background: 'rgba(34,197,94,0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                      {acc.problems_solved} solved
                    </span>
                  )}
                </div>
              )}
              {isConnected && (
                <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              )}
            </div>

            {/* Expanded body */}
            {isExpanded && (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isConnected ? (
                  <>
                    {/* Stats Row */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {acc.rating != null && (
                        <div className="ca-stat-chip">
                          <span className="ca-stat-chip-label"><Trophy size={8} style={{ display: 'inline' }} /> Rating</span>
                          <span className="ca-stat-chip-value" style={{ color: plat.color }}>{acc.rating}</span>
                        </div>
                      )}
                      {acc.max_rating != null && (
                        <div className="ca-stat-chip">
                          <span className="ca-stat-chip-label">Peak</span>
                          <span className="ca-stat-chip-value" style={{ color: 'var(--neon-gold)' }}>{acc.max_rating}</span>
                        </div>
                      )}
                      {acc.rank && (
                        <div className="ca-stat-chip">
                          <span className="ca-stat-chip-label"><Star size={8} style={{ display: 'inline' }} /> Rank</span>
                          <span className="ca-stat-chip-value" style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'capitalize' }}>{acc.rank}</span>
                        </div>
                      )}
                      {acc.problems_solved != null && (
                        <div className="ca-stat-chip">
                          <span className="ca-stat-chip-label"><CheckCircle2 size={8} style={{ display: 'inline' }} /> Solved</span>
                          <span className="ca-stat-chip-value" style={{ color: '#4ade80' }}>{acc.problems_solved}</span>
                        </div>
                      )}
                    </div>

                    {/* Problem difficulty bar */}
                    {(acc.easy_solved || acc.medium_solved || acc.hard_solved) ? (
                      <ProblemBar
                        easy={acc.easy_solved ?? 0}
                        medium={acc.medium_solved ?? 0}
                        hard={acc.hard_solved ?? 0}
                      />
                    ) : null}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="ca-btn-sync"
                        onClick={() => syncPlatform(plat.key)}
                        disabled={syncing === plat.key}
                      >
                        <RefreshCw size={12} className={syncing === plat.key ? 'ca-spin' : ''} />
                        {syncing === plat.key ? 'Syncing...' : 'Sync'}
                      </button>
                      {acc.profile_url && (
                        <a href={acc.profile_url} target="_blank" rel="noreferrer" className="ca-view-btn">
                          <ExternalLink size={12} /> Profile
                        </a>
                      )}
                      <button
                        type="button"
                        className="ca-btn-disconnect"
                        onClick={() => disconnect(plat.key)}
                      >
                        <Unlink size={12} /> Disconnect
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {plat.description}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        className="ca-input"
                        placeholder={plat.placeholder}
                        value={handles[plat.key] || ''}
                        onChange={(e) => setHandles((h) => ({ ...h, [plat.key]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') connectPlatform(plat.key); }}
                      />
                      <button
                        type="button"
                        className="ca-btn-connect"
                        onClick={() => connectPlatform(plat.key)}
                        disabled={connecting === plat.key || !(handles[plat.key] || '').trim()}
                      >
                        {connecting === plat.key ? (
                          <><RefreshCw size={12} className="ca-spin" /> Connecting...</>
                        ) : (
                          <><Zap size={12} /> Connect</>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Feedback Toast */}
      {feedback && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px',
            borderRadius: '12px',
            background: feedback.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            fontSize: '13px',
            animation: 'slideInUp 0.2s ease',
          }}
        >
          {feedback.type === 'success'
            ? <CheckCircle2 size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
            : <AlertCircle size={16} style={{ color: '#f87171', flexShrink: 0 }} />
          }
          <span style={{ color: feedback.type === 'success' ? '#4ade80' : '#f87171' }}>
            {feedback.message}
          </span>
          <button
            onClick={() => setFeedback(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
          >×</button>
        </div>
      )}
      <style>{`@keyframes slideInUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }`}</style>
    </div>
  );
}
