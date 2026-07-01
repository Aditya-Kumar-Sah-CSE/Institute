'use client';

import React, { useState } from 'react';
import { markReplyAsAccepted } from '@/features/doubts/actions/doubts';
import Button from '@/components/ui/Button';

export default function AcceptReplyButton({ doubtId, replyId }: { doubtId: string, replyId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    setIsSubmitting(true);
    await markReplyAsAccepted(doubtId, replyId);
    setIsSubmitting(false);
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleAccept} 
      disabled={isSubmitting}
      style={{ 
        color: '#22c55e', 
        border: '1px solid #22c55e', 
        background: 'transparent' 
      }}
    >
      {isSubmitting ? 'Accepting...' : 'Accept Answer'}
    </Button>
  );
}
