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
  const [isExpanded, setIsExpanded] = useState(false);
  const displayedPolls = isExpanded ? polls : polls.slice(0, 1);

  return (
    <>
      <div className="polls-flex">
        {displayedPolls.map((poll) => (
          <PollCard key={poll.id} poll={poll} currentUserId={currentUserId} isFaculty={isFaculty} />
        ))}
      </div>
      {polls.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
          <Button variant="ghost" onClick={() => setIsExpanded(!isExpanded)} style={{ color: 'var(--neon-cyan)', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
            {isExpanded ? 'Show Less' : `Show More (${polls.length - 1} more)`}
          </Button>
        </div>
      )}
    </>
  );
}
