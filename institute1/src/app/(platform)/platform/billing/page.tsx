import React from 'react';
import Card from '@/components/ui/Card';
import { CreditCard, DollarSign, Zap } from 'lucide-react';

export default function PlatformBillingPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
          SaaS Billing & Subscriptions
        </h1>
        <p style={{ color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
          Manage global tenant pricing tiers, payment gateways, and recurring revenue.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <Card variant="glass" padding="lg">
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Monthly Recurring Revenue</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#00f2fe', marginTop: '0.25rem' }}>
            ₹4,85,000
          </div>
        </Card>

        <Card variant="glass" padding="lg">
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Active Paid Subscriptions</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#22c55e', marginTop: '0.25rem' }}>
            14 Tenants
          </div>
        </Card>
      </div>
    </div>
  );
}
