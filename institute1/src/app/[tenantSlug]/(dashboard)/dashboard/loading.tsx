import React from 'react';
import Card from '@/components/ui/Card';

export default function DashboardLoading() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--space-2xl)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
        
        {/* Welcome Section Skeleton */}
        <div className="dashboard-welcome">
          <div style={{ height: '40px', width: '300px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: 'var(--space-xs)', animation: 'pulse 1.5s infinite ease-in-out' }} />
          <div style={{ height: '20px', width: '250px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="dashboard-stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} variant="glass" padding="lg" className="stat-card">
              <div className="stat-card-icon" style={{ background: 'rgba(255,255,255,0.05)', width: '48px', height: '48px', borderRadius: '12px', animation: 'pulse 1.5s infinite ease-in-out' }} />
              <div className="stat-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '16px' }}>
                <div style={{ height: '28px', width: '60px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '6px', animation: 'pulse 1.5s infinite ease-in-out' }} />
                <div style={{ height: '16px', width: '80px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
              </div>
            </Card>
          ))}
        </div>

        {/* Continue Learning Skeleton */}
        <div style={{ marginTop: 'var(--space-2xl)' }}>
          <div style={{ height: '28px', width: '200px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: 'var(--space-lg)', animation: 'pulse 1.5s infinite ease-in-out' }} />
          <div style={{ height: '200px', width: '100%', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite ease-in-out' }} />
        </div>

        {/* Bottom Row Skeleton */}
        <div className="dashboard-bottom-row">
          <div className="dashboard-bottom-col">
            <div style={{ height: '28px', width: '150px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: 'var(--space-lg)', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div style={{ height: '300px', width: '100%', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite ease-in-out' }} />
          </div>
          
          <div className="dashboard-bottom-col">
             <div style={{ height: '28px', width: '150px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: 'var(--space-lg)', animation: 'pulse 1.5s infinite ease-in-out', opacity: 0 }} />
             <div style={{ height: '400px', width: '100%', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite ease-in-out' }} />
          </div>
        </div>

      </div>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
