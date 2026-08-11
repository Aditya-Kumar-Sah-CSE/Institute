'use client';

import React, { useState } from 'react';
import PollCard, { Poll } from './PollCard';
import Button from '@/components/ui/Button';

interface CoursePollsClientProps {
  polls: Poll[];
  currentUserId: string;
  isFaculty: boolean;
}

export default function CoursePollsClient({ polls, currentUserId, isFaculty }: CoursePollsClientProps) {
  const [view, setView] = useState<'active' | 'ended'>('active');
  const [isActiveExpanded, setIsActiveExpanded] = useState(false);
  const [isEndedExpanded, setIsEndedExpanded] = useState(false);

  const activePolls = polls.filter(p => !p.expires_at || new Date(p.expires_at) >= new Date());
  const endedPolls = polls.filter(p => p.expires_at && new Date(p.expires_at) < new Date());

  const displayedActive = isActiveExpanded ? activePolls : activePolls.slice(0, 1);
  const displayedEnded = isEndedExpanded ? endedPolls : endedPolls.slice(0, 1);

  return (
    <div style={{ marginBottom: 'var(--space-xl)', width: '100%', maxWidth: 'min(100%, 600px)', boxSizing: 'border-box' }}>
      {/* Toggle Controls */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-body)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 240, 255, 0.2)', marginBottom: 'var(--space-lg)' }}>
        <button
          onClick={() => setView('active')}
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            padding: '6px 12px',
            borderRadius: '4px',
            border: 'none',
            background: view === 'active' ? 'var(--neon-cyan)' : 'transparent',
            color: view === 'active' ? '#000' : 'var(--text-muted)',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          Active Polls ({activePolls.length})
        </button>
        <button
          onClick={() => setView('ended')}
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            padding: '6px 12px',
            borderRadius: '4px',
            border: 'none',
            background: view === 'ended' ? 'var(--neon-cyan)' : 'transparent',
            color: view === 'ended' ? '#000' : 'var(--text-muted)',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          Ended Polls ({endedPolls.length})
        </button>
      </div>

      {view === 'active' && (
        <div className="tab-pane active fade-in">
          {activePolls.length > 0 ? (
            <>
              <div className="polls-flex">
                {displayedActive.map((poll) => (
                  <PollCard key={poll.id} poll={poll} currentUserId={currentUserId} isFaculty={isFaculty} />
                ))}
              </div>
              {activePolls.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
                  <Button variant="ghost" onClick={() => setIsActiveExpanded(!isActiveExpanded)} style={{ color: 'var(--neon-cyan)', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
                    {isActiveExpanded ? 'Show Less' : `Show More (${activePolls.length - 1} more)`}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: 'var(--space-xl)', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>No active polls available.</p>
            </div>
          )}
        </div>
      )}

      {view === 'ended' && (
        <div className="tab-pane active fade-in">
          {endedPolls.length > 0 ? (
            <>
              <div className="polls-flex" style={{ opacity: 0.8 }}>
                {displayedEnded.map((poll) => (
                  <PollCard key={poll.id} poll={poll} currentUserId={currentUserId} isFaculty={isFaculty} />
                ))}
              </div>
              {endedPolls.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
                  <Button variant="ghost" onClick={() => setIsEndedExpanded(!isEndedExpanded)} style={{ color: 'var(--text-muted)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {isEndedExpanded ? 'Show Less' : `Show More (${endedPolls.length - 1} more)`}
                  </Button>
                </div>
              )}
            </>
          ) : (
             <div style={{ padding: 'var(--space-xl)', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>No ended polls found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
