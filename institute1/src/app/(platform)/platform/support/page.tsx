import React from 'react';
import Card from '@/components/ui/Card';
import { HelpCircle, UserCheck, ShieldAlert, X } from 'lucide-react';
import { PlatformService } from '@/services/platform/platformService';
import { cookies } from 'next/headers';
import { impersonateTenant, stopImpersonating } from './actions';

export default async function PlatformSupportPage() {
  const cookieStore = await cookies();
  const impersonatedSlug = cookieStore.get('impersonated_tenant_slug')?.value || null;
  const impersonatedName = cookieStore.get('impersonated_tenant_name')?.value || null;

  let institutions: any[] = [];
  let errorMsg = '';
  try {
    institutions = await PlatformService.listInstitutions();
  } catch (err: any) {
    errorMsg = err.message || 'Failed to load institutions';
  }

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

      {impersonatedSlug ? (
        <Card variant="default" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', border: '1px dashed #f43f5e', padding: '1rem', borderRadius: '8px', backgroundColor: 'rgba(244,63,94,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldAlert size={24} style={{ color: '#f43f5e' }} />
              <div>
                <h4 style={{ margin: 0, fontWeight: 700, color: '#f43f5e' }}>Impersonation Session Active</h4>
                <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
                  Currently viewing: <strong>{impersonatedName || impersonatedSlug}</strong> ({impersonatedSlug})
                </p>
              </div>
            </div>
            <form action={stopImpersonating}>
              <button
                type="submit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#f43f5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <X size={16} /> Exit Impersonation
              </button>
            </form>
          </div>
        </Card>
      ) : null}

      <Card variant="glass" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <UserCheck size={20} style={{ color: '#00f2fe' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Initiate Tenant Impersonation</h3>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Select an institution to inspect its dashboard in read-only support mode. 
          Each impersonation requires an audit reason and is recorded in the platform security logs.
        </p>

        {errorMsg ? (
          <div style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {errorMsg}
          </div>
        ) : (
          <form action={impersonateTenant} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="tenantId" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>Select Institution</label>
              <select
                id="tenantId"
                name="tenantId"
                required
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '0.6rem 0.75rem',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              >
                <option value="">-- Choose Tenant --</option>
                {institutions.filter(inst => !inst.is_platform).map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.slug})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="reason" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>Audited Reason</label>
              <textarea
                id="reason"
                name="reason"
                required
                placeholder="Describe why you need to impersonate this tenant (e.g., ticket resolution #3829)"
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '0.6rem 0.75rem',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  minHeight: '80px',
                  resize: 'vertical',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                color: '#0f172a',
                border: 'none',
                borderRadius: '6px',
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
                marginTop: '0.5rem',
              }}
            >
              Start Impersonation
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
