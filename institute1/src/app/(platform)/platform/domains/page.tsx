import React from 'react';
import Card from '@/components/ui/Card';
import { Globe, CheckCircle2 } from 'lucide-react';

export default function PlatformDomainsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
          Custom Domains & SSL
        </h1>
        <p style={{ color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
          Verify and map custom domain names for enterprise tenants.
        </p>
      </div>

      <Card variant="glass" padding="md">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Globe size={20} style={{ color: '#00f2fe' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Wildcard Domain Active</h3>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Primary host: <code>*.smartlearn.in</code>
        </p>
      </Card>
    </div>
  );
}
