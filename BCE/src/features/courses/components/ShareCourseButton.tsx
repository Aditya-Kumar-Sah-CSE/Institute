'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';

export default function ShareCourseButton({ courseId }: { courseId: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Construct the URL using window.location to ensure it has the correct domain
    const url = `${window.location.origin}/courses/${courseId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
      // Fallback
      prompt('Copy this link to share:', url);
    }
  };

  return (
    <Button variant="secondary" onClick={handleShare}>
      {copied ? '✓ Copied!' : '🔗 Share Link'}
    </Button>
  );
}
