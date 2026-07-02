'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function PollAlerts({ alerts }: { alerts: any[] }) {
  const [visibleAlerts, setVisibleAlerts] = useState(alerts);
  const supabase = createClient();

  if (visibleAlerts.length === 0) return null;

  const markAsRead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVisibleAlerts(prev => prev.filter(a => a.id !== id));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
      {visibleAlerts.map(alert => (
        <Link key={alert.id} href={alert.link || '/dashboard'} onClick={() => {
           // Mark as read when clicking the link
           supabase.from('notifications').update({ is_read: true }).eq('id', alert.id);
        }} style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'rgba(236, 72, 153, 0.05)',
            border: '1px solid rgba(236, 72, 153, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-sm) var(--space-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            cursor: 'pointer',
            position: 'relative'
          }}>
            <span style={{ fontSize: '1.5rem' }}>📢</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
                {alert.message}
              </div>
              <div suppressHydrationWarning style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                {new Date(alert.created_at).toLocaleString()}
              </div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neon-cyan)', flexShrink: 0 }} />
            <button 
              onClick={(e) => markAsRead(alert.id, e)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                marginLeft: 'var(--space-sm)', padding: '4px', display: 'flex', alignItems: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </Link>
      ))}
    </div>
  );
}
