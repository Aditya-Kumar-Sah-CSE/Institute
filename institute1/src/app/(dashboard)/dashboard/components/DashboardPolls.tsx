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
  
  if (!polls || polls.length === 0) return null;
  
  const displayedPolls = isExpanded ? polls : polls.slice(0, 3);
  const hasMore = polls.length > 3;

  return (
    <div style={{ marginBottom: 'var(--space-2xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Active Polls</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {displayedPolls.map(poll => (
          <div key={poll.id} style={{ marginBottom: 'var(--space-md)' }}>
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
            {isExpanded ? 'Show Less' : `Show More (${polls.length - 3})`}
          </button>
        </div>
      )}
    </div>
  );
}
