import React from 'react';

export default function DashboardLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl, 32px)' }}>
      <style>{`
        @keyframes pulse-dash {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        .skeleton-dash {
          background: rgba(255,255,255,0.08);
          border-radius: var(--radius-md, 12px);
          animation: pulse-dash 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* Welcome Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton-dash" style={{ height: '40px', width: '30%', minWidth: '200px' }}></div>
        <div className="skeleton-dash" style={{ height: '24px', width: '40%', minWidth: '250px' }}></div>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton-dash" style={{ height: '124px', width: '100%', borderRadius: '16px' }}></div>
        ))}
      </div>

      {/* Main Content */}
      <div className="skeleton-dash" style={{ height: '350px', width: '100%', borderRadius: '16px' }}></div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div className="skeleton-dash" style={{ height: '400px', borderRadius: '16px' }}></div>
        <div className="skeleton-dash" style={{ height: '400px', borderRadius: '16px' }}></div>
      </div>
    </div>
  );
}
