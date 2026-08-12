'use client';

import React, { useState, useMemo } from 'react';
import { Activity, Clock3, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface RecentCodingActivityProps {
  bceRecent: any[];
  cfRecent: any[];
}

export default function RecentCodingActivity({ bceRecent, cfRecent }: RecentCodingActivityProps) {
  const [filter, setFilter] = useState<'ALL' | 'BCE' | 'CODEFORCES'>('ALL');

  const normalizedBCE = bceRecent.map(r => ({
    id: `bce-${r.id}`,
    platform: 'BCE',
    problemName: r.coding_problems?.title || r.problem_id,
    verdict: r.status === 'ACCEPTED' ? 'OK' : r.status,
    language: r.language,
    time: new Date(r.created_at).getTime(),
  }));

  const normalizedCF = cfRecent.map((r: any) => ({
    id: `cf-${r.id}`,
    platform: 'Codeforces',
    problemName: r.problem,
    verdict: r.verdict === 'OK' ? 'OK' : r.verdict,
    language: r.language,
    time: r.time,
  }));

  const allActivity = [...normalizedBCE, ...normalizedCF]
    .sort((a, b) => b.time - a.time);

  const filteredActivity = allActivity.filter(a => filter === 'ALL' || a.platform.toUpperCase() === filter);

  const formatVerdict = (verdict: string) => {
    switch(verdict) {
      case 'OK': return { label: 'Accepted', icon: <CheckCircle2 size={14} />, className: 'verdict-ok' };
      case 'WRONG_ANSWER': return { label: 'Wrong Answer', icon: <XCircle size={14} />, className: 'verdict-err' };
      case 'TIME_LIMIT_EXCEEDED': return { label: 'TLE', icon: <Clock3 size={14} />, className: 'verdict-tle' };
      case 'COMPILATION_ERROR': return { label: 'CE', icon: <AlertTriangle size={14} />, className: 'verdict-ce' };
      default: return { label: verdict.replace(/_/g, ' '), icon: <XCircle size={14} />, className: 'verdict-other' };
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

  const filters: { key: 'ALL' | 'BCE' | 'CODEFORCES'; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'BCE', label: 'BCE' },
    { key: 'CODEFORCES', label: 'CF' },
  ];

  return (
    <div className="recent-activity-section">
      <div className="recent-activity-header">
        <h3>
          <Activity size={18} />
          <span>Recent Activity</span>
        </h3>
        <div className="activity-tabs">
          {filters.map(f => (
            <button
              key={f.key}
              className={filter === f.key ? 'active' : ''}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="recent-activity-list">
        {filteredActivity.length === 0 ? (
          <div className="empty-activity">
            <Activity size={28} strokeWidth={1.5} />
            <p>No recent coding activity found.</p>
          </div>
        ) : (
          filteredActivity.slice(0, 10).map((activity, idx) => {
            const v = formatVerdict(activity.verdict);
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
                  <div className="activity-meta">
                    <span className={`activity-platform ${activity.platform.toLowerCase()}`}>{activity.platform}</span>
                    <span className="activity-lang">{activity.language}</span>
                    <span className="activity-time">{timeAgo(activity.time)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
