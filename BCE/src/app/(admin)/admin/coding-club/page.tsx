'use client';

import React, { useState } from 'react';
import SuperAdminClubManager from '@/components/super-admin/SuperAdminClubManager';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function AdminCodingClubPage() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', marginBottom: '6px' }}>
          Coding Club Management
        </h1>
        <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem' }}>
          Manage faculty mentors, student coordinators, and club events.
        </p>
      </div>

      <SuperAdminClubManager onToast={addToast} />

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {toasts.map(t => (
            <div
              key={t.id}
              style={{
                padding: '12px 18px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.85rem',
                animation: 'fadeIn 0.3s ease',
                background: t.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : t.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(14, 165, 233, 0.2)',
                border: `1px solid ${t.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : t.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(14, 165, 233, 0.4)'}`,
                color: t.type === 'success' ? '#6ee7b7' : t.type === 'error' ? '#fca5a5' : '#7dd3fc',
              }}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

