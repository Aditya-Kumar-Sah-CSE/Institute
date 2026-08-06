import React from 'react';
import Card from '@/components/ui/Card';
import { Settings, Sliders } from 'lucide-react';

export default function PlatformSettingsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
          Control Plane System Settings
        </h1>
        <p style={{ color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
          Global feature flags, platform branding, and infrastructure configuration.
        </p>
      </div>

      <Card variant="glass" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Sliders size={20} style={{ color: '#00f2fe' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Feature Flags</h3>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" defaultChecked />
            <span>Enable Self-Serve Institution Onboarding</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" defaultChecked />
            <span>Enable AI Doubt Resolver for Enterprise Tiers</span>
          </label>
        </div>
      </Card>
    </div>
  );
}
