import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import LevelBadge from '@/components/shared/LevelBadge';
import Button from '@/components/ui/Button';

interface DashboardProfileCardProps {
  profile: any;
  appData: any;
}

export default function DashboardProfileCard({ profile, appData }: DashboardProfileCardProps) {
  return (
    <Card variant="glass" style={{ padding: 0, display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
      
      {/* PART 1: Profile Image */}
      <div style={{ 
        padding: 'var(--space-xl)', 
        display: 'flex', 
        justifyContent: 'center',
        borderBottom: '1px solid var(--glass-border)'
      }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          border: '3px solid var(--bg-elevated)',
          boxShadow: 'var(--shadow-elevated)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {profile.avatar_url ? (
            <Image 
              src={profile.avatar_url}
              alt={profile.name}
              fill
              sizes="100px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-elevated)', color: 'var(--neon-cyan)', fontSize: '2.5rem', fontWeight: 'bold'
            }}>
              {profile.name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* PART 2: Profile Info */}
      <div style={{ 
        padding: 'var(--space-xl)',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: '4px' }}>{profile.name}</h2>
        {profile.email && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            {profile.email}
          </p>
        )}
        
        {profile.institute_id && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Institute ID: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{profile.institute_id}</span>
          </p>
        )}
        
        {profile.graduation_period && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Batch: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{profile.graduation_period}</span>
          </p>
        )}
      </div>

      {/* PART 3: Badges & Action */}
      <div style={{ 
        padding: 'var(--space-xl)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-lg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <LevelBadge level={profile.level} size="md" />
          {profile.streak_days > 0 && (
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              fontWeight: '600',
              fontSize: 'var(--text-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span className="text-neon-orange">🔥</span> {profile.streak_days} Day Streak
            </div>
          )}
        </div>

        {profile.role !== 'admin' && (
          <div style={{ width: '100%' }}>
            {profile.role !== 'instructor' && appData?.status !== 'pending' && (
              <Link href={(appData?.status === 'rejected' || appData?.status === 'approved') ? '/apply-instructor?reapply=true' : '/apply-instructor'} style={{ textDecoration: 'none', width: '100%', display: 'block' }}>
                <Button variant="secondary" size="sm" style={{ width: '100%' }}>
                  Apply as Instructor or Faculty
                </Button>
              </Link>
            )}
            {(appData?.status === 'pending' || profile.role === 'instructor') && (
              <div style={{ 
                fontSize: 'var(--text-sm)', 
                fontWeight: 'var(--weight-bold)', 
                color: (appData?.status === 'pending' && profile.role !== 'instructor') ? '#eab308' : '#22c55e',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: (appData?.status === 'pending' && profile.role !== 'instructor') ? 'rgba(234, 179, 8, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                textAlign: 'center',
                width: '100%'
              }}>
                Status: {(appData?.status === 'pending' && profile.role !== 'instructor') ? 'Pending' : 'Approved as faculty'}
              </div>
            )}
          </div>
        )}
      </div>

    </Card>
  );
}
