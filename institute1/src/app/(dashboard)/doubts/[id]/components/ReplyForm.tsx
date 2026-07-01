'use client';

import React, { useState } from 'react';
import { replyToDoubt } from '@/features/doubts/actions/doubts';
import Button from '@/components/ui/Button';

export default function ReplyForm({ doubtId }: { doubtId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const result = await replyToDoubt(doubtId, replyText);

    if (result.error) {
      setError(result.error);
    } else {
      setReplyText(''); // clear on success
    }
    
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {error && <div style={{ color: 'var(--neon-pink)', background: 'rgba(255, 71, 87, 0.1)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>{error}</div>}
      
      <textarea 
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        rows={4} 
        required 
        placeholder="Write your reply here..."
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

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" variant="primary" disabled={isSubmitting || !replyText.trim()}>
          {isSubmitting ? 'Posting...' : 'Post Reply'}
        </Button>
      </div>
    </form>
  );
}
