'use client';

import React, { useState, useTransition } from 'react';
import Button from '@/components/ui/Button';
import { approveInstructor, rejectInstructor } from '@/features/admin/actions/instructor-actions';

export default function ActionButtons({ applicationId, userId }: { applicationId: string, userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleApprove = () => {
    startTransition(async () => {
      try {
        setError(null);
        await approveInstructor(applicationId, userId);
      } catch (err: any) {
        setError(err.message || 'Failed to approve');
      }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      try {
        setError(null);
        await rejectInstructor(applicationId, userId);
      } catch (err: any) {
        setError(err.message || 'Failed to reject');
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {error && <div style={{ color: 'var(--text-danger)', fontSize: '0.875rem' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <Button 
          variant="primary" 
          style={{ flex: 1 }} 
          onClick={handleApprove}
          isLoading={isPending}
        >
          Approve
        </Button>
        <Button 
          variant="danger" 
          style={{ flex: 1 }} 
          onClick={handleReject}
          isLoading={isPending}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
