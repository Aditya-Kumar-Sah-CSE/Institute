'use client';

import React from 'react';
import { ExternalLink, CheckCircle2, Shield, Lock } from 'lucide-react';

export default function LeetCodeProfileCard({ account }: { account: any }) {
  
  if (!account) {
    return (
      <div className="platform-profile-card leetcode-card not-connected">
        <div className="platform-card-accent lc-accent" />
        <div className="platform-header">
          <div className="platform-title">
            <div className="platform-icon-badge lc-icon">LC</div>
            <h3>LeetCode</h3>
          </div>
          <span className="not-connected-badge">Unavailable</span>
        </div>
        <div className="platform-body empty-state lc-secure-state">
          <div className="secure-icon-wrapper">
            <Shield size={40} strokeWidth={1.5} />
            <Lock size={16} className="secure-lock-overlay" />
          </div>
          <h4>Secure Integration Only</h4>
          <p>
            We don&apos;t ask for LeetCode passwords or cookies to prevent unauthorized session scraping. 
            Official API integration will launch when Read-Only OAuth is available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="platform-profile-card leetcode-card">
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
        </div>
      </div>

      <div className="platform-stats-grid four-col">
        <div className="stat-box highlight-box">
          <span className="stat-label">Solved</span>
          <span className="stat-value highlight-lc">{account.problems_solved || 0}</span>
          <span className="stat-sub">Total</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Easy</span>
          <span className="stat-value easy-val">{account.easy_solved || 0}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Medium</span>
          <span className="stat-value medium-val">{account.medium_solved || 0}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Hard</span>
          <span className="stat-value hard-val">{account.hard_solved || 0}</span>
        </div>
      </div>
    </div>
  );
}
