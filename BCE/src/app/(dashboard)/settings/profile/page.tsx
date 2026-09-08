import React from 'react';
import { getUser } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/profile';
import { redirect } from 'next/navigation';
import Card from '@/components/ui/Card';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import BasicInfoEdit from '@/app/(dashboard)/profile/components/BasicInfoEdit';
import { User, Shield, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'Profile & Account Settings — Smart Learn',
  description: 'Manage your personal profile and account credentials.'
};

export default async function SettingsProfilePage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getOrCreateProfile(user);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* BASIC ACCOUNT INFO CARD */}
      <Card variant="glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} style={{ color: 'var(--neon-cyan)' }} />
              Account & Profile Information
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Your basic profile information visible across Smart Learn.
            </p>
          </div>
          <Link href="/profile">
            <Button variant="secondary" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              View Full Profile <ExternalLink size={14} />
            </Button>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Full Name</label>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{profile.name}</div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Email Address</label>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{profile.email}</div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Role</label>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'capitalize' }}>{profile.role}</div>
          </div>
          {profile.institute_id && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Institute ID</label>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{profile.institute_id}</div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <BasicInfoEdit 
            initialName={profile.name} 
            initialRollNo={profile.institute_id} 
            initialBatch={profile.graduation_period} 
            initialCollegeName={profile.college_name || null}
          />
        </div>
      </Card>

      {/* SECURITY & CREDENTIALS CARD */}
      <Card variant="glass">
        <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} style={{ color: 'var(--neon-cyan)' }} />
          Security & Auth Session
        </h2>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Your authentication is secured via encrypted tokens and Supabase Auth.
        </p>

        <div style={{ background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '10px', padding: '14px', fontSize: '13px', color: 'var(--text-primary)' }}>
          <strong>Session Status:</strong> Active & Authenticated ({user.email})
        </div>
      </Card>
    </div>
  );
}
