'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import CreatePollModal from './CreatePollModal';

export default function CreatePollButton({ courseId }: { courseId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button 
        variant="danger" 
        size="md" 
        onClick={() => setIsModalOpen(true)}
        style={{ padding: '12px 24px', fontSize: 'var(--text-md)', fontWeight: 'var(--weight-bold)' }}
      >
        + Create Poll
      </Button>
      <CreatePollModal 
        courseId={courseId} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
