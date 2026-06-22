'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function InstallAppButton({ className, variant = 'secondary' }: { className?: string, variant?: 'success' | 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const [isStandalone, setIsStandalone] = useState(true); // default true to prevent hydration mismatch flashes

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
    >
      ⬇️ Install App
    </Button>
  );
}
