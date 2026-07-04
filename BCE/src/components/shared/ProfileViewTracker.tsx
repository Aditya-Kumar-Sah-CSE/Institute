'use client';

import { useEffect, useRef } from 'react';
import { recordProfileView } from '@/features/feedback/actions/profile-views';

export default function ProfileViewTracker({ viewedId }: { viewedId: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!viewedId || tracked.current) return;
    
    tracked.current = true;
    
    // Fire and forget - silently record the view
    recordProfileView(viewedId).catch(() => {
      // ignore errors
    });
  }, [viewedId]);

  return null;
}
