'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { fetchMoreActivityLogs } from '../actions';

interface ActivityLog {
  id: string;
  action: string;
  xp_amount: number;
  created_at?: string;
}

interface RecentActivityProps {
  logs: ActivityLog[];
  userId: string;
}

export default function RecentActivity({ logs: initialLogs, userId }: RecentActivityProps) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialLogs.length === 5);

  const handleShowMore = async () => {
    setIsLoading(true);
    try {
      const moreLogs = await fetchMoreActivityLogs(userId, logs.length, 5);
      if (moreLogs.length > 0) {
        setLogs(prev => [...prev, ...moreLogs]);
      }
      if (moreLogs.length < 5) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to fetch more logs', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!logs || logs.length === 0) {
    return <p className="text-muted">No recent activity.</p>;
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <ul className="activity-list" style={{ margin: 0 }}>
        {logs.map((log, idx) => (
          <li key={`${log.id}-${idx}`} className="activity-item">
            <span className="activity-action">{log.action}</span>
            <span className="activity-xp text-gradient">+{log.xp_amount} XP</span>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleShowMore} 
          style={{ width: '100%' }}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Show More'}
        </Button>
      ) : (
        logs.length > 5 && (
          <p className="text-muted" style={{ textAlign: 'center', fontSize: '0.875rem' }}>No more activity</p>
        )
      )}
    </div>
  );
}
