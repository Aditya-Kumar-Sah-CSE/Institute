'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  Rocket, ExternalLink, CheckCircle, XCircle, 
  Trash2, Smartphone, Loader2, User, Phone, GraduationCap 
} from 'lucide-react';
import { approveStudentApp, rejectStudentApp, deleteStudentApp } from '@/features/leaderboard/actions/showcase-actions';

interface ShowcaseReviewListClientProps {
  pendingApps: any[];
}

export default function ShowcaseReviewListClient({ pendingApps }: ShowcaseReviewListClientProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await approveStudentApp(id);
      if (res?.error) alert(res.error);
    } catch (e: any) {
      alert(e?.message || 'Failed to approve app');
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await rejectStudentApp(id);
      if (res?.error) alert(res.error);
    } catch (e: any) {
      alert(e?.message || 'Failed to reject app');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    setLoadingId(id);
    try {
      const res = await deleteStudentApp(id);
      if (res?.error) alert(res.error);
    } catch (e: any) {
      alert(e?.message || 'Failed to delete app');
    } finally {
      setLoadingId(null);
    }
  };

  if (!pendingApps || pendingApps.length === 0) {
    return (
      <Card variant="glass" style={{ padding: 'var(--space-3xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🎉</div>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>No Pending App Showcases</h3>
        <p style={{ marginTop: '6px', fontSize: '0.85rem' }}>All student app showcase submissions have been reviewed.</p>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {pendingApps.map(app => (
        <Card key={app.id} variant="glass" style={{ border: '1px solid var(--glass-border)' }}>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              {app.app_logo_url ? (
                <img 
                  src={app.app_logo_url} 
                  alt={app.app_name} 
                  style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--neon-cyan)' }} 
                />
              ) : (
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(6,182,212,0.15)', border: '1px solid var(--neon-cyan)', display: 'grid', placeItems: 'center', color: 'var(--neon-cyan)' }}>
                  <Smartphone size={24} />
                </div>
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                  {app.app_name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <User size={13} color="#818cf8" /> <strong>{app.student_name}</strong>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <GraduationCap size={13} color="#34d399" /> {app.batch}
                  </span>
                  {app.mobile_no && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={13} color="#fbbf24" /> {app.mobile_no}
                    </span>
                  )}
                  <span style={{ color: 'var(--text-muted)' }}>
                    • Submitted on {new Date(app.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions: Approve, Reject, Delete */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button 
                variant="success" 
                size="sm" 
                onClick={() => handleApprove(app.id)} 
                disabled={loadingId === app.id}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {loadingId === app.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Approve
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={() => handleReject(app.id)} 
                disabled={loadingId === app.id}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {loadingId === app.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Reject
              </Button>
              <button
                type="button"
                onClick={() => handleDelete(app.id)}
                disabled={loadingId === app.id}
                style={{
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  padding: 0
                }}
                title="Delete submission"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Problem & Solution Box */}
          <div style={{ background: 'var(--bg-primary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <strong style={{ fontSize: '12px', color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>Problem Addressed:</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {app.problem_addressing}
              </p>
            </div>
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '6px' }}>
              <strong style={{ fontSize: '12px', color: '#34d399', textTransform: 'uppercase' }}>Solution & Implementation:</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {app.solution}
              </p>
            </div>
          </div>

          {/* Working URL button */}
          {app.working_url && (
            <div>
              <a 
                href={app.working_url} 
                target="_blank" 
                rel="noreferrer" 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: 'rgba(0, 240, 255, 0.08)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  color: '#00f0ff',
                  textDecoration: 'none',
                  fontSize: '12.5px',
                  fontWeight: 600
                }}
              >
                <ExternalLink size={13} />
                <span>Visit Live App: {app.working_url}</span>
              </a>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
