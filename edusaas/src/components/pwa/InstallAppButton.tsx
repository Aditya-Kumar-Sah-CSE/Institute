'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function InstallAppButton({ className, variant = 'secondary' }: { className?: string, variant?: 'success' | 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);
    const timer = setTimeout(() => setIsStandalone(standalone), 0);
    return () => clearTimeout(timer);
  }, []);

  if (isStandalone) return null;

  return (
    <Button 
      variant={variant} 
      className={className}
      onClick={() => window.dispatchEvent(new Event('show-pwa-install'))}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
      title="Install App"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    </Button>
  );
}
