'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { leaveCourseFormAction } from '@/features/courses/actions/enroll';

interface LeaveCourseButtonProps {
  courseId: string;
}

export default function LeaveCourseButton({ courseId }: LeaveCourseButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button 
        variant="danger" 
        size="sm" 
        style={{ padding: '4px 10px', fontSize: '12px' }} 
        onClick={() => setIsModalOpen(true)}
      >
        Leave
      </Button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Leave Course"
        size="sm"
      >
        <div style={{ padding: 'var(--space-md) 0', textAlign: 'center' }}>
          <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
            Are you sure you want to leave this course? You will lose access to its lessons and your progress.
          </p>
          <form action={leaveCourseFormAction.bind(null, courseId)} style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit">
              Yes, Leave Course
            </Button>
          </form>
        </div>
      </Modal>
    </>
  );
}
