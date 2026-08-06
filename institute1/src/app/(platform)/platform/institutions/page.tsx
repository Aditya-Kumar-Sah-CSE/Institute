import React from 'react';
import { PlatformService } from '@/services/platform/platformService';
import Card from '@/components/ui/Card';
import Link from 'next/link';
import { Building2, ExternalLink, Plus } from 'lucide-react';

export default async function PlatformInstitutionsPage() {
  // Consumes PlatformService boundary
  const institutions = await PlatformService.listInstitutions();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            Tenant Institutions
          </h1>
          <p style={{ color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
            Onboard, suspend, and configure customer SaaS tenants.
          </p>
        </div>

        <Link href="/apply-institution" className="btn btn-primary" target="_blank">
          <Plus size={18} />
          <span>Provision New Tenant</span>
        </Link>
      </div>

      <Card variant="glass" padding="md">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }}>
              <th style={{ padding: '0.75rem' }}>INSTITUTION</th>
              <th style={{ padding: '0.75rem' }}>SLUG</th>
              <th style={{ padding: '0.75rem' }}>TYPE</th>
              <th style={{ padding: '0.75rem' }}>STATUS</th>
              <th style={{ padding: '0.75rem' }}>TENANT URL</th>
            </tr>
          </thead>
          <tbody>
            {institutions?.map((inst) => (
              <tr key={inst.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building2 size={18} style={{ color: '#00f2fe' }} />
                    <span>{inst.name}</span>
                  </div>
                </td>
                <td style={{ padding: '1rem 0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {inst.slug}
                </td>
                <td style={{ padding: '1rem 0.75rem' }}>
                  {inst.is_platform ? (
                    <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(234,179,8,0.15)', color: '#eab308', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                      DEMO TENANT
                    </span>
                  ) : (
                    <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(0,242,254,0.15)', color: '#00f2fe', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                      CUSTOMER
                    </span>
                  )}
                </td>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {inst.subscription_status?.toUpperCase() || 'ACTIVE'}
                  </span>
                </td>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <Link
                    href={`/${inst.slug}/admin`}
                    target="_blank"
                    style={{ color: '#00f2fe', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <span>/{inst.slug}/admin</span>
                    <ExternalLink size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
