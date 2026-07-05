'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';

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
    <Button variant="secondary" onClick={handleShare}>
      {copied ? '✓ Copied!' : '🔗 Share Profile'}
    </Button>
  );
}
