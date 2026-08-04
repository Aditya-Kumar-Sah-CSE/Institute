import React from 'react';
import DomainSettingsClient from './DomainSettingsClient';
import Link from 'next/link';
import { resolveTenantCache } from '@/lib/tenant/tenantCache';
import { getTenantConfig } from '@/lib/tenant/tenantResolver';
import { createClient } from '@supabase/supabase-js';

export const metadata = {
  title: 'Domain Settings | Admin Panel',
};

export default async function DomainSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ __tenant_slug?: string; __routing_mode?: string }>;
}) {
  // Try to resolve tenant from:
  // 1. Request headers (wildcard/custom domain modes)
  // 2. Hidden query param injected by middleware during dev path rewrite
  let { tenant, routingMode } = await getTenantConfig();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!tenant && resolvedSearchParams?.__tenant_slug) {
    const mode = resolvedSearchParams.__routing_mode || 'development';
    tenant = await resolveTenantCache(resolvedSearchParams.__tenant_slug, mode);
    routingMode = mode;
  }

  if (!tenant) {
    // Fallback for Super Admin: show institution selector
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: insts } = await supabaseAdmin
      .from('institutions')
      .select('id, name, slug, primary_domain, status')
      .eq('status', 'active')
      .order('name');

    return (
      <div style={{ margin: '0 auto', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <div style={{ marginBottom: 0 }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Domain Settings</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Select an institution to manage its domains.</p>
        </div>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {insts?.map(inst => (
            <Link
              key={inst.id}
              href={`/admin/domain-settings/${inst.id}`}
              style={{
                padding: '1.25rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                textDecoration: 'none',
                transition: 'border-color 0.2s ease',
              }}
            >
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 700 }}>{inst.name}</h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Slug: <code style={{ color: 'var(--neon-green)', padding: '1px 4px', background: 'rgba(0,255,128,0.1)', borderRadius: '4px' }}>{inst.slug}</code>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{inst.primary_domain}</div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '0 auto', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ marginBottom: 0 }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Domain Settings</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Manage your subdomain and attach a custom enterprise domain.</p>
      </div>
      <DomainSettingsClient tenant={tenant} />
    </div>
  );
}
