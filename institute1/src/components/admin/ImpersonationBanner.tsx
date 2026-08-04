'use client';

import React, { useTransition } from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { stopImpersonation } from '@/features/admin/actions/impersonate';
import { useRouter } from 'next/navigation';

export default function ImpersonationBanner({
  tenantName,
}: {
  tenantName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleExit = () => {
    startTransition(async () => {
      await stopImpersonation();
      router.push('/admin/institutions');
      router.refresh();
    });
  };

  return (
    <div
      style={{
        backgroundColor: '#7c3aed',
        color: '#ffffff',
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ShieldAlert size={18} />
        <span>
          <strong>SUPER ADMIN MODE:</strong> Impersonating institution — <u>{tenantName}</u>
        </span>
      </div>
      <button
        onClick={handleExit}
        disabled={isPending}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          color: '#ffffff',
          padding: '0.25rem 0.75rem',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.8rem',
          fontWeight: 700,
        }}
      >
        <LogOut size={14} />
        {isPending ? 'Exiting...' : 'Exit Impersonation'}
      </button>
    </div>
  );
}
