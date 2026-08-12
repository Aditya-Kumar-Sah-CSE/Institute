'use client';
import React, { useState } from 'react';
import PollCard from '@/features/courses/components/PollCard';
import type { Poll } from '@/features/courses/components/PollCard';

interface DashboardPollsProps {
  polls: any[];
  currentUserId: string;
}

export default function DashboardPolls({ polls, currentUserId }: DashboardPollsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  
  const activePolls = React.useMemo(() => {
    if (!polls) return [];
    return polls.filter(poll => !poll.expires_at || new Date(poll.expires_at) >= new Date());
  }, [polls]);

  if (!polls || polls.length === 0) return null;
  if (activePolls.length === 0) return null;

  const displayedPolls = isExpanded ? activePolls : activePolls.slice(0, 1);
  const hasMore = activePolls.length > 1;

  return (
    <div style={{ marginBottom: 'var(--space-2xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Active Polls</h2>
      </div>
      <div className="polls-flex">
        {displayedPolls.map(poll => (
          <div key={poll.id} style={{ display: 'flex', flexDirection: 'column' }}>
             <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neon-cyan)', marginBottom: 'var(--space-xs)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
               Course: {poll.courses?.title}
             </div>
             <PollCard poll={poll} currentUserId={currentUserId} />
          </div>
        ))}
      </div>
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show Less' : `Show More (${activePolls.length - 1})`}
          </button>
        </div>
      )}
    </div>
  );
}
