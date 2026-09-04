'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Clock3, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface RecentCodingActivityProps {
  bceRecent?: any[];
  cfRecent?: any[];
  lcRecent?: any[];
  ccRecent?: any[];
  gfgRecent?: any[];
}

type PlatformFilter = 'ALL' | 'SL' | 'CF' | 'LC' | 'CC' | 'GFG';

export default function RecentCodingActivity({
  bceRecent = [],
  cfRecent = [],
  lcRecent = [],
  ccRecent = [],
  gfgRecent = [],
}: RecentCodingActivityProps) {
  const [filter, setFilter] = useState<PlatformFilter>('ALL');
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    setVisibleCount(6);
  }, [filter]);

  const normalizedBCE = useMemo(() => {
    return (bceRecent || []).map((r: any) => ({
      id: `bce-${r.id}`,
      platform: 'SL' as const,
      platformFull: 'Smart Learn',
      problemName: r.coding_problems?.title || r.problem_id || 'Practice Problem',
      verdict: r.status === 'ACCEPTED' ? 'OK' : r.status,
      language: r.language || 'Code',
      time: new Date(r.created_at).getTime(),
    }));
  }, [bceRecent]);

  const normalizedCF = useMemo(() => {
    return (cfRecent || []).map((r: any, idx: number) => ({
      id: `cf-${r.id || idx}`,
      platform: 'CF' as const,
      platformFull: 'Codeforces',
      problemName: r.problem || 'Codeforces Problem',
      verdict: r.verdict === 'OK' ? 'OK' : r.verdict || 'OK',
      language: r.language || 'C++',
      time: typeof r.time === 'number' ? r.time : Date.now(),
    }));
  }, [cfRecent]);

  const normalizedLC = useMemo(() => {
    return (lcRecent || []).map((r: any, idx: number) => ({
      id: `lc-${r.id || idx}`,
      platform: 'LC' as const,
      platformFull: 'LeetCode',
      problemName: r.problem || r.title || 'LeetCode Problem',
      verdict: r.verdict === 'OK' || r.verdict === 'ACCEPTED' ? 'OK' : r.verdict || 'OK',
      language: r.language || 'Python',
      time: typeof r.time === 'number' ? r.time : (r.timestamp ? Number(r.timestamp) * 1000 : Date.now()),
    }));
  }, [lcRecent]);

  const normalizedCC = useMemo(() => {
    return (ccRecent || []).map((r: any, idx: number) => ({
      id: `cc-${r.id || idx}`,
      platform: 'CC' as const,
      platformFull: 'CodeChef',
      problemName: r.problem || r.title || 'CodeChef Problem',
      verdict: r.verdict === 'OK' || r.verdict === 'ACCEPTED' ? 'OK' : r.verdict || 'OK',
      language: r.language || 'C++',
      time: typeof r.time === 'number' ? r.time : Date.now(),
    }));
  }, [ccRecent]);

  const normalizedGFG = useMemo(() => {
    return (gfgRecent || []).map((r: any, idx: number) => ({
      id: `gfg-${r.id || idx}`,
      platform: 'GFG' as const,
      platformFull: 'GeeksforGeeks',
      problemName: r.problem || r.title || 'GFG Problem',
      verdict: r.verdict === 'OK' || r.verdict === 'ACCEPTED' ? 'OK' : r.verdict || 'OK',
      language: r.language || 'Java',
      time: typeof r.time === 'number' ? r.time : Date.now(),
    }));
  }, [gfgRecent]);

  const allActivity = useMemo(() => {
    return [
      ...normalizedBCE,
      ...normalizedCF,
      ...normalizedLC,
      ...normalizedCC,
      ...normalizedGFG,
    ].sort((a, b) => b.time - a.time);
  }, [normalizedBCE, normalizedCF, normalizedLC, normalizedCC, normalizedGFG]);

  const filteredActivity = useMemo(() => {
    if (filter === 'ALL') return allActivity;
    return allActivity.filter((a) => a.platform === filter);
  }, [allActivity, filter]);

  const formatVerdict = (verdict: string) => {
    switch (verdict) {
      case 'OK':
      case 'ACCEPTED':
        return { label: 'Accepted', icon: <CheckCircle2 size={14} />, className: 'verdict-ok' };
      case 'WRONG_ANSWER':
        return { label: 'Wrong Answer', icon: <XCircle size={14} />, className: 'verdict-err' };
      case 'TIME_LIMIT_EXCEEDED':
        return { label: 'TLE', icon: <Clock3 size={14} />, className: 'verdict-tle' };
      case 'COMPILATION_ERROR':
        return { label: 'CE', icon: <AlertTriangle size={14} />, className: 'verdict-ce' };
      default:
        return { label: verdict.replace(/_/g, ' '), icon: <XCircle size={14} />, className: 'verdict-other' };
    }
  };

  const now = useMemo(() => Date.now(), []);

  const timeAgo = (timestamp: number) => {
    const diff = Math.floor((now - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const filters: { key: PlatformFilter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'SL', label: 'SL' },
    { key: 'CF', label: 'CF' },
    { key: 'LC', label: 'LC' },
    { key: 'CC', label: 'CC' },
    { key: 'GFG', label: 'GFG' },
  ];

  const getPlatformBadgeStyle = (platform: string) => {
    switch (platform) {
      case 'SL':
        return { background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)' };
      case 'CF':
        return { background: 'rgba(238, 91, 91, 0.15)', color: '#ee5b5b', border: '1px solid rgba(238, 91, 91, 0.3)' };
      case 'LC':
        return { background: 'rgba(255, 161, 22, 0.15)', color: '#ffa116', border: '1px solid rgba(255, 161, 22, 0.3)' };
      case 'CC':
        return { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' };
      case 'GFG':
        return { background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' };
      default:
        return { background: 'rgba(255, 255, 255, 0.1)', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.2)' };
    }
  };

  return (
    <div className="recent-activity-section">
      <div className="recent-activity-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h3>
          <Activity size={18} />
          <span>Recent Activity</span>
        </h3>
        <div className="activity-tabs" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {filters.map((f) => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                className={isActive ? 'active' : ''}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  border: isActive ? '1px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isActive ? '#00f0ff' : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? '#090d16' : '#94a3b8',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="recent-activity-list" style={{ marginTop: '14px' }}>
        {filteredActivity.length === 0 ? (
          <div className="empty-activity">
            <Activity size={28} strokeWidth={1.5} />
            <p>No recent coding activity found for {filter === 'ALL' ? 'any platform' : filter}.</p>
          </div>
        ) : (
          <>
            {filteredActivity.slice(0, visibleCount).map((activity, idx) => {
              const v = formatVerdict(activity.verdict);
              const badgeStyle = getPlatformBadgeStyle(activity.platform);
              return (
                <div
                  key={activity.id}
                  className="activity-row"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className={`activity-verdict-indicator ${v.className}`} />
                  <div className={`activity-verdict-icon ${v.className}`} title={v.label}>
                    {v.icon}
                  </div>
                  <div className="activity-details">
                    <span className="activity-problem">{activity.problemName}</span>
                    <div className="activity-meta" style={{ gap: '6px', alignItems: 'center' }}>
                      <span
                        className="activity-platform"
                        style={{
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '9px',
                          fontWeight: 800,
                          ...badgeStyle,
                        }}
                      >
                        {activity.platformFull}
                      </span>
                      <span className="activity-lang">{activity.language}</span>
                      <span className="activity-time">{timeAgo(activity.time)}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredActivity.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 6)}
                className="activity-show-more-btn"
                style={{
                  width: '100%',
                  marginTop: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px dashed var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--neon-cyan)',
                  padding: '10px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'var(--weight-bold)',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(6, 182, 212, 0.08)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--neon-cyan)';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.03)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)';
                }}
              >
                Show More Submissions
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
