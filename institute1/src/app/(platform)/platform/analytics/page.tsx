import React from 'react';
import Card from '@/components/ui/Card';
import { BarChart3, TrendingUp } from 'lucide-react';

export default function PlatformAnalyticsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
          Global Platform Analytics
        </h1>
        <p style={{ color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
          Cross-tenant system performance, active users, and platform usage metrics.
        </p>
      </div>

      <Card variant="glass" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BarChart3 size={20} style={{ color: '#00f2fe' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Active Tenants & Throughput</h3>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Real-time telemetry across all 15 customer tenants and demo instance.
        </p>
      </Card>
    </div>
  );
}
