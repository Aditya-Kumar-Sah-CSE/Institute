'use client';

import React, { useState, useTransition } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { connectCustomDomain } from '@/features/admin/actions/domainActions';
import { CheckCircle2, Globe, Shield, RefreshCw } from 'lucide-react';
export default function DomainSettingsClient({ tenant }: { tenant: any }) {
  const [customDomain, setCustomDomain] = useState(tenant.custom_domain || '');
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!customDomain.includes('.')) {
      alert('Please enter a valid domain (e.g. lms.university.edu)');
      return;
    }
    startTransition(async () => {
      const res = await connectCustomDomain(tenant.id, customDomain);
      if (res.error) alert(res.error);
      else alert('Custom domain saved! Please configure your DNS settings as instructed below.');
    });
  };

  const devUrl = `http://localhost:3000/${tenant.slug}`;
  const prodUrl = `https://${tenant.primary_domain}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Card padding="lg">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe className="text-neon-cyan" size={24} /> 
          Primary Domain
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
          <div>
            <strong>Institution:</strong> <span style={{ color: 'var(--text-primary)' }}>{tenant.name}</span>
          </div>
          <div>
            <strong>Slug:</strong> <code style={{ padding: '2px 6px', background: 'var(--bg-default)', borderRadius: '4px' }}>{tenant.slug}</code>
          </div>
          <div>
            <strong>Production Route:</strong> <a href={prodUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-cyan)' }}>{prodUrl}</a>
          </div>
          <div>
            <strong>Development Route:</strong> <a href={devUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-green)' }}>{devUrl}</a>
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield className="text-neon-pink" size={24} /> 
          Enterprise Custom Domain
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Connect your own institutional domain. Once verified and SSL issued, students will log in entirely natively via your domain.
        </p>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Custom Domain (Ex: lms.college.edu)
            </label>
            <input 
              type="text" 
              value={customDomain} 
              onChange={e => setCustomDomain(e.target.value.trim().toLowerCase())}
              placeholder="lms.yourinstitution.edu"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--bg-default)', color: 'var(--text-primary)' }}
            />
          </div>
          <Button variant="primary" onClick={handleSave} disabled={isPending || !customDomain}>
            {isPending ? <RefreshCw className="animate-spin" size={20} /> : 'Save & Initiate Verification'}
          </Button>
        </div>

        {tenant.custom_domain && (
          <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: '8px', background: 'var(--bg-default)', border: '1px dashed var(--border-default)' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Verification Directions</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Please add the following CNAME record to your DNS provider (e.g. Cloudflare, Route53, GoDaddy).
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
              <span>Type: CNAME</span>
              <span>Name: {tenant.custom_domain.split('.')[0]}</span>
              <span>Value: default.smartlearn.in</span>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--neon-lime)' }}>
              <CheckCircle2 size={20} /> Domain Propagation typically requires 5-30 minutes. 
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
