'use client';

import React, { useState } from 'react';
import { createDoubt } from '@/features/doubts/actions/doubts';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface AskDoubtModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId?: string;
  lessonId?: string;
}

export default function AskDoubtModal({ isOpen, onClose, courseId, lessonId }: AskDoubtModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const result = await createDoubt(formData);

    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ask a Doubt">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {error && <div style={{ color: 'var(--neon-pink)', background: 'rgba(255, 71, 87, 0.1)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>{error}</div>}
        
        {courseId && <input type="hidden" name="course_id" value={courseId} />}
        {lessonId && <input type="hidden" name="lesson_id" value={lessonId} />}

        <Input 
          name="title" 
          label="Doubt Title" 
          placeholder="e.g. How does React useEffect work?" 
          required 
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}>
            Description (Markdown Supported)
          </label>
          <textarea 
            name="description" 
            rows={5} 
            required 
            placeholder="Explain your doubt in detail. You can use markdown and code blocks..."
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-sm)',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <Input 
          name="tags" 
          label="Tags (Comma separated)" 
          placeholder="e.g. react, hooks, frontend" 
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Posting...' : 'Post Doubt'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
