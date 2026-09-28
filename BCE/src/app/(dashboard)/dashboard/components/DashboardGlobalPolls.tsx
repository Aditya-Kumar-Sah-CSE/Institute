'use client';

import { useState } from 'react';
import Link from 'next/link';
import GlobalPollCard from '@/features/polls/components/GlobalPollCard';

export default function DashboardGlobalPolls({ polls, currentUserId, currentUserRole, currentUserEmail }: {
  polls: any[];
  currentUserId: string;
  currentUserRole: string;
  currentUserEmail?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const visiblePolls = showAll ? polls : polls.slice(0, 1);

  if (polls.length === 0) return null;

  return (
    <section style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Active Global Polls</h2>
        <Link href="/polls" style={{ color: 'var(--neon-cyan)', fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}>View all →</Link>
      </div>
      <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
        {visiblePolls.map(poll => <GlobalPollCard key={poll.id} poll={poll} currentUserId={currentUserId} currentUserRole={currentUserRole} currentUserEmail={currentUserEmail} />)}
      </div>
      {polls.length > 1 && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAll(value => !value)} style={{ display: 'block', margin: 'var(--space-md) auto 0' }}>
          {showAll ? 'Show Less' : `Show More (${polls.length - 1})`}
        </button>
      )}
    </section>
  );
}
