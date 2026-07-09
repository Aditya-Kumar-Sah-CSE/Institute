'use client';

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

export default function ShareProfileButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/users/${userId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
      prompt('Copy this link to share:', url);
    }
  };

  return (
    <button 
      onClick={handleShare} 
      title="Share Profile"
      style={{ 
        background: 'transparent', 
        border: 'none', 
        color: copied ? '#22c55e' : 'var(--text-secondary)', 
        cursor: 'pointer',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'color 0.2s',
        outline: 'none'
      }}
      onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
      onMouseOut={(e) => { e.currentTarget.style.color = copied ? '#22c55e' : 'var(--text-secondary)'; }}
    >
      {copied ? <Check size={24} /> : <Share2 size={24} />}
    </button>
  );
}
