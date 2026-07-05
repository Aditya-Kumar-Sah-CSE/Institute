"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import LevelBadge from '@/components/shared/LevelBadge';
import UserAvatar from '@/components/shared/UserAvatar';
import Button from '@/components/ui/Button';
import { User, Share2 } from 'lucide-react';

interface DashboardProfileCardProps {
  profile: any;
  appData: any;
}

export default function DashboardProfileCard({ profile, appData }: DashboardProfileCardProps) {
  const router = useRouter();

  if (!profile) return null;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = typeof window !== 'undefined' ? `${window.location.origin}/profile` : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.name}'s Profile`,
          url: url
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };
  return (
    <Card variant="glass" style={{ width: '100%', position: 'relative', padding: 0, display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
      
      <button 
        onClick={handleShare}
        style={{
          position: 'absolute',
          top: 'var(--space-md)',
          right: 'var(--space-md)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--glass-border)',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          zIndex: 10
        }}
        title="Share Profile"
      >
        <Share2 size={16} />
      </button>

      <div onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
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
          <UserAvatar url={profile.avatar_url} name={profile.name} size={100} />
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
        
        {(profile.roll_no || profile.registration_no) && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Roll No: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{profile.roll_no || profile.registration_no}</span>
          </p>
        )}
        
        {profile.cgpa && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            CGPA: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{profile.cgpa}</span>
          </p>
        )}
        
        {profile.graduation_period && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Batch: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{profile.graduation_period}</span>
          </p>
        )}
      </div>
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
