'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

export default function PwaUpdateToast() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ registration: ServiceWorkerRegistration }>;
      if (customEvent.detail && customEvent.detail.registration) {
        setRegistration(customEvent.detail.registration);
        setShowToast(true);
      }
    };

    window.addEventListener('pwa-update-available', handleUpdate);
    return () => window.removeEventListener('pwa-update-available', handleUpdate);
  }, []);

  const handleUpdateClick = () => {
    if (!registration || !registration.waiting) {
      window.location.reload();
      return;
    }
    setIsUpdating(true);
    // Send skip waiting message to waiting worker
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  };

  const handleDismiss = () => {
    setShowToast(false);
  };

  if (!showToast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '16px',
        padding: '12px 18px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(12px)',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#fff', flexShrink: 0 }}>
        <Sparkles size={20} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>
          New Version Available!
        </span>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
          An update for Smart Learning is ready to install.
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        <button
          onClick={handleUpdateClick}
          disabled={isUpdating}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: isUpdating ? 'wait' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <RefreshCw size={14} className={isUpdating ? 'animate-spin' : ''} />
          {isUpdating ? 'Updating...' : 'Update Now'}
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Close update toast"
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
