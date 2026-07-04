'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import CreatePollModal from './CreatePollModal';

export default function CreatePollButton({ courseId }: { courseId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(true)}>
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
