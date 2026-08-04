'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { approveInstitution, rejectInstitution, deleteInstitution } from '@/features/admin/actions/institutionActions';

export default function AdminInstitutionsClient({ requests, institutions }: { requests: any[], institutions: any[] }) {
  const [activeTab, setActiveTab] = useState<'requests' | 'active'>('requests');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive?: boolean;
    confirmText?: string;
    hideCancel?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const showAlert = (title: string, message: string, isDestructive = false) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      hideCancel: true,
      confirmText: 'Okay',
      isDestructive,
      onConfirm: () => {
         closeModal();
         router.refresh();
      }
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const getRequestForInst = (instName: string) => requests.find(r => r.institute_name === instName);

  const handleApprove = (id: string, name: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Approve Institution',
      message: `Are you sure you want to approve "${name}" and deploy their infrastructure?`,
      confirmText: 'Approve & Setup',
      hideCancel: false,
      onConfirm: () => {
        startTransition(async () => {
          const res = await approveInstitution(id);
          if (res.error) {
            showAlert('Approval Failed', res.error, true);
          } else {
            showAlert('Approval Successful', res.message || 'Approved successfully!');
          }
        });
      }
    });
  };

  const handleReject = (id: string, name: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Reject Request',
      message: `Are you sure you want to reject "${name}"?`,
      confirmText: 'Reject',
      isDestructive: true,
      hideCancel: false,
      onConfirm: () => {
          startTransition(async () => {
              const res = await rejectInstitution(id);
              if (res.error) {
                  showAlert('Error Rejecting', res.error, true);
              } else {
                  showAlert('Success', 'Rejected successfully.');
              }
          });
      }
    });
  };

  const handleDeleteTenant = (id: string, name: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Delete Tenant',
      message: `WARNING: Are you absolutely sure you want to permanently delete the tenant "${name}"? This action cannot be undone and will destroy all associated data.`,
      confirmText: 'Delete Permanently',
      isDestructive: true,
      hideCancel: false,
      onConfirm: () => {
          startTransition(async () => {
              const res = await deleteInstitution(id);
              if (res.error) {
                  showAlert('Error Deleting', `Failed to delete tenant: ${res.error}`, true);
              } else {
                  showAlert('Success', 'Tenant deleted successfully.');
              }
          });
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <style>{`
        @media (max-width: 768px) {
          .hide-on-mobile {
            display: none !important;
          }
          .action-buttons-mobile {
             display: flex;
             flex-direction: column;
             gap: 0.5rem;
          }
        }
        @media (min-width: 769px) {
          .action-buttons-mobile {
             display: flex;
             gap: 0.5rem;
             justify-content: flex-end;
          }
        }
      `}</style>
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
                  <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', flexWrap: 'wrap' }}>
                    <span title={req.admin_email}><strong>Admin:</strong> {req.admin_name} (<span style={{ wordBreak: 'break-all' }}>{req.admin_email}</span>)</span>
                    {req.phone && <span><strong>Phone:</strong> {req.phone}</span>}
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
                    <th className="hide-on-mobile" style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Status</th>
                    <th className="hide-on-mobile" style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Created</th>
                    <th className="hide-on-mobile" style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Active Plan</th>
                    <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map(inst => {
                    const req = getRequestForInst(inst.name);
                    const isExpanded = expandedRows.has(inst.id);
                    
                    return (
                    <React.Fragment key={inst.id}>
                      <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)', background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent' }}>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{inst.name}</td>
                        <td style={{ padding: '1rem' }}>
                          <code>{inst.slug}</code> <br /> <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inst.domain}</span>
                        </td>
                        <td className="hide-on-mobile" style={{ padding: '1rem' }}>
                          <span style={{ padding: '4px 8px', background: inst.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: inst.status === 'active' ? '#10b981' : '#ef4444', borderRadius: '4px', fontSize: '0.75rem' }}>
                            {inst.status}
                          </span>
                        </td>
                        <td className="hide-on-mobile" style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(inst.created_at).toLocaleDateString()}</td>
                        <td className="hide-on-mobile" style={{ padding: '1rem', color: 'var(--text-primary)' }}>{req?.plan_selected || 'Free / Trial'}</td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                           <div className="action-buttons-mobile">
                             <Button size="sm" variant="secondary" onClick={() => toggleRow(inst.id)}>
                               {isExpanded ? 'Hide' : 'Show'}
                             </Button>
                             <Button size="sm" variant="danger" disabled={isPending} onClick={() => handleDeleteTenant(inst.id, inst.name)}>
                               Delete
                             </Button>
                           </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.02)' }}>
                          <td colSpan={6} style={{ padding: '0 1rem 1rem 1rem' }}>
                            <div style={{ padding: '1rem', background: 'var(--bg-default)', borderRadius: '8px', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div><strong style={{color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block'}}>Admin Name</strong> {req?.admin_name || 'N/A'}</div>
                                <div title={req?.admin_email} style={{ wordBreak: 'break-all' }}><strong style={{color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block'}}>Admin Email</strong> {req?.admin_email || 'N/A'}</div>
                                <div><strong style={{color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block'}}>Phone</strong> {req?.phone || 'N/A'}</div>
                                <div><strong style={{color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block'}}>Students</strong> {req?.students_count || '0'}</div>
                                <div><strong style={{color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block'}}>Faculty</strong> {req?.faculty_count || '0'}</div>
                                {req?.message && (
                                  <div style={{ gridColumn: '1 / -1' }}><strong style={{color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block'}}>Message</strong> <span style={{fontSize: '0.875rem'}}>"{req.message}"</span></div>
                                )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        isDestructive={modalConfig.isDestructive}
        isPending={isPending}
        hideCancel={modalConfig.hideCancel}
      />
    </div>
  );
}
