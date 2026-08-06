import React from 'react';
import Card from '@/components/ui/Card';
import { HelpCircle, UserCheck } from 'lucide-react';

export default function PlatformSupportPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
          Super Admin Support & Impersonation
        </h1>
        <p style={{ color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
          Cross-tenant support console and secure read-only tenant impersonation.
        </p>
      </div>

      <Card variant="glass" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <UserCheck size={20} style={{ color: '#00f2fe' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Tenant Admin Impersonation</h3>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Select an institution to inspect its dashboard in read-only support mode. 
          Impersonation sets the <code>impersonated_tenant_slug</code> cookie and is audited in <code>public.audit_logs</code>.
        </p>
      </Card>
    </div>
  );
}
