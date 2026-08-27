'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import GlobalPollCard, { GlobalPoll } from './GlobalPollCard';

interface GlobalPollBoardProps {
  polls: GlobalPoll[];
  currentUserId: string;
  currentUserRole: string;
  currentUserEmail?: string;
  emptyMessage?: string;
}

type TabType = 'all' | 'active' | 'ended';

export default function GlobalPollBoard({
  polls,
  currentUserId,
  currentUserRole,
  currentUserEmail,
  emptyMessage = 'No global polls available.'
}: GlobalPollBoardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('active');

  const now = new Date();
  
  const filteredPolls = polls.filter(poll => {
    const isExpired = poll.expires_at ? new Date(poll.expires_at) < now : false;
    if (activeTab === 'active') return !isExpired;
    if (activeTab === 'ended') return isExpired;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: 'var(--space-xs)', 
          background: 'rgba(255, 255, 255, 0.02)', 
          border: '1px solid var(--border-default)', 
          borderRadius: 'var(--radius-lg)', 
          padding: '4px',
          alignSelf: 'flex-start',
          marginBottom: 'var(--space-sm)'
        }}
      >
        {(['active', 'ended', 'all'] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: isActive ? 'var(--neon-cyan)' : 'transparent',
                color: isActive ? '#000' : 'var(--text-secondary)',
                border: 'none',
                padding: 'var(--space-xs) var(--space-md)',
                borderRadius: 'var(--radius-md)',
                fontWeight: isActive ? 600 : 500,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                textTransform: 'capitalize',
                outline: 'none'
              }}
            >
              {tab === 'all' ? 'All Polls' : tab === 'active' ? 'Active' : 'Ended'}
            </button>
          );
        })}
      </div>

      {filteredPolls.length === 0 ? (
        <Card 
          variant="glass" 
          padding="lg" 
          style={{ 
            textAlign: 'center', 
            padding: 'var(--space-2xl) var(--space-lg)', 
            background: 'rgba(255, 255, 255, 0.01)', 
            border: '1px dashed var(--border-default)' 
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)', opacity: 0.8 }}>🗳️</div>
          <h4 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2xs)', color: 'var(--text-primary)' }}>
            No Polls Found
          </h4>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
            {activeTab === 'active' 
              ? 'There are no active global polls right now. Check back later!' 
              : activeTab === 'ended' 
              ? 'No ended global polls matching this category.'
              : emptyMessage}
          </p>
        </Card>
      ) : (
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', 
            gap: 'var(--space-lg)', 
            minWidth: 0 
          }}
        >
          {filteredPolls.map((poll) => (
            <GlobalPollCard 
              key={poll.id} 
              poll={poll} 
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              currentUserEmail={currentUserEmail}
            />
          ))}
        </div>
      )}
    </div>
  );
}
