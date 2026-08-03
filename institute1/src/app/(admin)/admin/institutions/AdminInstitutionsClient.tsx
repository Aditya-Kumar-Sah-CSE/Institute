'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { approveInstitution, rejectInstitution } from '@/features/admin/actions/institutionActions';

export default function AdminInstitutionsClient({ requests, institutions }: { requests: any[], institutions: any[] }) {
  const [activeTab, setActiveTab] = useState<'requests' | 'active'>('requests');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  
  const pendingRequests = requests.filter(r => r.status === 'pending');

  const handleApprove = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to approve "${name}" and deploy their infrastructure?`)) return;
    
    startTransition(async () => {
      const res = await approveInstitution(id);
      if (res.error) {
        alert(res.error);
      } else {
        alert(res.message || 'Approved successfully!');
        router.refresh();
      }
    });
  };

  const handleReject = (id: string, name: string) => {
      if (!window.confirm(`Are you sure you want to reject "${name}"?`)) return;
      
      startTransition(async () => {
          const res = await rejectInstitution(id);
          if (res.error) {
              alert(res.error);
          } else {
              alert('Rejected successfully.');
              router.refresh();
          }
      });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
           <h1 className="text-gradient">Institution Management</h1>
           <p className="text-secondary">Review pending applications and manage active multi-tenant instances (Super Admin Only).</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)' }}>
        <button 
          onClick={() => setActiveTab('requests')}
          style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: activeTab === 'requests' ? 'var(--neon-cyan)' : 'var(--text-secondary)', borderBottom: activeTab === 'requests' ? '2px solid var(--neon-cyan)' : '2px solid transparent', fontWeight: 600, cursor: 'pointer' }}
        >
          Registration Requests ({pendingRequests.length})
        </button>
        <button 
          onClick={() => setActiveTab('active')}
          style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: activeTab === 'active' ? 'var(--neon-cyan)' : 'var(--text-secondary)', borderBottom: activeTab === 'active' ? '2px solid var(--neon-cyan)' : '2px solid transparent', fontWeight: 600, cursor: 'pointer' }}
        >
          Active Tenants ({institutions.length})
        </button>
      </div>

      {activeTab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pendingRequests.length === 0 ? (
            <Card padding="md"><p>No requests found.</p></Card>
          ) : (
            pendingRequests.map(req => (
              <Card key={req.id} padding="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: req.status === 'pending' ? '4px solid var(--neon-orange)' : req.status === 'approved' ? '4px solid var(--neon-lime)' : '4px solid var(--neon-pink)' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{req.institute_name}</h3>
                  <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <span><strong>Admin:</strong> {req.admin_name} ({req.admin_email})</span>
                    <span><strong>Plan:</strong> {req.plan_selected || 'Not decided'}</span>
                    <span><strong>Est. Users:</strong> {req.students_count} students, {req.faculty_count} faculty</span>
                  </div>
                  {req.message && <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--bg-default)', borderRadius: '4px', fontSize: '0.875rem' }}><em>"{req.message}"</em></div>}
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg-default)', marginRight: '1rem', textTransform: 'uppercase' }}>
                     {req.status}
                  </div>
                  {req.status === 'pending' && (
                    <>
                      <Button size="sm" variant="danger" disabled={isPending} onClick={() => handleReject(req.id, req.institute_name)}>Reject</Button>
                      <Button size="sm" variant="primary" disabled={isPending} onClick={() => handleApprove(req.id, req.institute_name)}>Approve & Setup</Button>
                    </>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {institutions.length === 0 ? (
            <Card padding="md"><p>No active tenants running on the platform.</p></Card>
          ) : (
            <div className="table-responsive">
              <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'var(--bg-surface)' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Institute Name</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Tenant Slug / Domain</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map(inst => (
                    <tr key={inst.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{inst.name}</td>
                      <td style={{ padding: '1rem' }}>
                        <code>{inst.slug}</code> <br /> <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inst.domain}</span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '4px 8px', background: inst.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: inst.status === 'active' ? '#10b981' : '#ef4444', borderRadius: '4px', fontSize: '0.75rem' }}>
                          {inst.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(inst.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
