'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface ReapplyCourseButtonProps {
  courseTitle: string;
  formAction: (formData: FormData) => void;
  status?: string;
}

export default function ReapplyCourseButton({ courseTitle, formAction, status }: ReapplyCourseButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | undefined>(status);

  // Sync prop changes to local state just in case
  React.useEffect(() => {
    if (status) setLocalStatus(status);
  }, [status]);

  const handleAction = async () => {
    setLoading(true);
    const fd = new FormData();
    await formAction(fd);
    setLocalStatus('pending'); // Optimistically update
    setShowSuccess(true);
    setLoading(false);
  };

  const currentStatus = localStatus || status;

  return (
    <>
      {currentStatus === 'pending' ? (
        <div style={{ flex: 1, width: '100%' }}>
          <Button variant="secondary" disabled fullWidth style={{ opacity: 0.7, cursor: 'not-allowed' }}>
            ⏳ Approval Needed
          </Button>
        </div>
      ) : (
        <div style={{ flex: 1, width: '100%' }}>
          <Button 
            type="button" 
            onClick={handleAction}
            isLoading={loading}
            confirmMessage={`Are you sure you want to request enrollment again for ${courseTitle}?`}
            style={{ 
              background: 'rgba(255, 59, 48, 0.1)', 
              border: '1px solid rgba(255, 59, 48, 0.4)', 
              color: '#ff4d4f', 
              boxShadow: '0 4px 12px rgba(255, 59, 48, 0.15)',
              backdropFilter: 'blur(8px)',
              width: '100%'
            }}
          >
            Request Again
          </Button>
        </div>
      )}

      <Modal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Smart Learning App says:">
        <div style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-primary)' }}>
          <p>Your request for enroll has been sent wait for approval</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={(e: any) => { e.preventDefault(); setShowSuccess(false); }}>OK</Button>
        </div>
      </Modal>
    </>
  );
}
