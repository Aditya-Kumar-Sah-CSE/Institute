import React from 'react';
import Card from '@/components/ui/Card';
import { ShieldAlert, Lock } from 'lucide-react';

export default function PlatformAuditLogsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
          Control Plane Audit Logs
        </h1>
        <p style={{ color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
          Security audit trail of Super Admin actions, impersonations, and tenant provisioning.
        </p>
      </div>

      <Card variant="glass" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Lock size={20} style={{ color: '#00f2fe' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Audit Trail Immutable Ledger</h3>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          All Control Plane administrative actions are logged with timestamp, user ID, and action metadata.
        </p>
      </Card>
    </div>
  );
}
