'use client';
import React, { useState, useTransition } from 'react';
import { toggleDoubtLike } from '@/features/doubts/actions/doubts';

interface DoubtLikeButtonProps {
  doubtId: string;
  initialLikes: number;
  hasLiked: boolean;
}

export default function DoubtLikeButton({ doubtId, initialLikes, hasLiked }: DoubtLikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(hasLiked);
  const [isPending, startTransition] = useTransition();

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault(); // crucial to stop <Link> navigation
    e.stopPropagation();

    const previousLiked = liked;
    const previousLikes = likes;

    // Optimistic UI update
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);

    startTransition(async () => {
      const result = await toggleDoubtLike(doubtId);
      if (result.error) {
        // Revert on error
        setLiked(previousLiked);
        setLikes(previousLikes);
      }
    });
  };

  return (
    <button 
      onClick={handleLike}
      disabled={isPending}
      style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', 
        background: liked ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)', 
        border: liked ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(255,255,255,0.1)', 
        height: '32px',
        padding: '0 12px', 
        borderRadius: '16px', 
        fontSize: '13px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        color: liked ? '#22c55e' : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        opacity: isPending ? 0.7 : 1
      }}
    >
      <span style={{ fontSize: '14px', transform: 'translateY(-1px)' }}>👍</span> {likes}
    </button>
  );
}
