import React from 'react';
import { getDashboardAlerts } from '@/features/courses/actions/alerts';

interface DashboardAlertsProps {
  courseIds: string[];
}

export default async function DashboardAlerts({ courseIds }: DashboardAlertsProps) {
  if (!courseIds || courseIds.length === 0) return null;

  const { data: alerts, error } = await getDashboardAlerts(courseIds);

  if (error || !alerts || alerts.length === 0) return null;

  return (
    <div style={{ marginBottom: 'var(--space-xl)' }}>
      {alerts.map(alert => (
        <div 
          key={alert.id} 
          style={{ 
            background: 'var(--neon-crimson, rgba(237, 20, 61, 0.15))', 
            border: '2px solid rgba(237, 20, 61, 0.6)', 
            padding: 'var(--space-lg)', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: 'var(--space-md)',
            boxShadow: '0 0 15px rgba(237, 20, 61, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{alert.type === 'cancel' ? '❌' : (alert.type === 'asap' ? '⚠️' : '🚨')}</span>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {alert.type === 'cancel' ? 'Class Cancelled' : (alert.type === 'asap' ? 'Come Class ASAP' : 'Emergency Alert')}
            </h3>
          </div>
          
          <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-sm)' }}>
            <strong>Course:</strong> {alert.courses?.title} | <strong>Posted by:</strong> {alert.profiles?.name}
          </div>
          
          {alert.description && (
            <div style={{ 
              background: 'rgba(0,0,0,0.2)', 
              padding: 'var(--space-md)', 
              borderRadius: 'var(--radius-sm)',
              borderLeft: '4px solid rgba(237, 20, 61, 0.8)',
              color: 'var(--text-primary)'
            }}>
              {alert.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
