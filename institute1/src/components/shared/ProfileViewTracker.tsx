'use client';

import { useEffect } from 'react';
import { recordProfileView } from '@/features/feedback/actions/profile-views';

export default function ProfileViewTracker({ viewedId }: { viewedId: string }) {
  useEffect(() => {
    if (!viewedId) return;
    
    // Fire and forget - silently record the view
    recordProfileView(viewedId).catch(() => {
      // ignore errors
    });
  }, [viewedId]);

  return null;
}
