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
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams?: Promise<{ __tenant_slug?: string; __routing_mode?: string }>;
}) {
  const { tenantSlug } = await params;
  let tenant = await resolveTenantCache(tenantSlug, 'development');
  let routingMode = 'development';

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!tenant && resolvedSearchParams?.__tenant_slug) {
    const mode = resolvedSearchParams.__routing_mode || 'development';
    tenant = await resolveTenantCache(resolvedSearchParams.__tenant_slug, mode);
    routingMode = mode;
  }

  let insts = null;

  if (tenant && tenant.slug === '__platform__') {
    const sbAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: settings } = await sbAdmin.from('company_settings').select('company_name').single();
    if (settings?.company_name) {
      tenant.name = settings.company_name;
    }

    // Fetch institutions for Super Admin to manage
    const { data: institutions } = await sbAdmin
      .from('institutions')
      .select('id, name, slug, primary_domain, status')
      .eq('status', 'active')
      .order('name');
    
    insts = institutions;
  }

  if (!tenant) {
    // Fallback if tenant is entirely null (safeguard)
    return (
      <div style={{ margin: '0 auto', maxWidth: '1200px', padding: '2rem' }}>
        <h1 style={{ color: 'var(--accent-red)' }}>Tenant not found</h1>
        <p>No valid institution or platform context could be resolved.</p>
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

      {insts && insts.length > 0 && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-default)', margin: 'var(--space-xl) 0' }} />
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>Manage Institution Domains</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>Select an institution below to securely manage its routing and custom domains.</p>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {insts.map(inst => (
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
                  className="hover-lift"
                >
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 700 }}>{inst.name}</h3>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Slug: <code style={{ color: 'var(--neon-green)', padding: '1px 4px', background: 'rgba(0,255,128,0.1)', borderRadius: '4px' }}>{inst.slug}</code>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{inst.primary_domain || 'No Primary Domain'}</div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
