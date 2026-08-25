"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import LevelBadge from '@/components/shared/LevelBadge';
import UserAvatar from '@/components/shared/UserAvatar';
import Button from '@/components/ui/Button';
import { User, Share2, Trophy, Flame } from 'lucide-react';
import StorageUsageIndicator from '@/components/shared/StorageUsageIndicator';
import BadgesModal from '@/components/shared/BadgesModal';

interface DashboardProfileCardProps {
  profile: any;
  appData: any;
}

export default function DashboardProfileCard({ profile, appData }: DashboardProfileCardProps) {
  const router = useRouter();
  const [badgeCount, setBadgeCount] = React.useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/gamification/badges/list')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.earned) {
          setBadgeCount(json.data.earned.length);
        }
      })
      .catch(err => console.error('Error fetching badges count:', err));
  }, []);

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
        <div style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 'var(--space-md)',
          background: profile.role === 'admin' 
            ? (profile.email === 'iambestadi@gmail.com' ? 'rgba(255, 42, 133, 0.1)' : 'rgba(255, 215, 0, 0.1)')
            : profile.role === 'instructor' 
              ? 'rgba(176, 38, 255, 0.1)' 
              : 'rgba(0, 240, 255, 0.1)',
          color: profile.role === 'admin'
            ? (profile.email === 'iambestadi@gmail.com' ? 'var(--neon-pink)' : 'var(--neon-gold)')
            : profile.role === 'instructor'
              ? 'var(--neon-purple)'
              : 'var(--neon-cyan)',
          border: '1px solid currentColor'
        }}>
          {profile.role === 'admin' 
            ? (profile.email === 'iambestadi@gmail.com' ? 'Developer' : 'Admin')
            : profile.role === 'instructor' 
              ? 'Faculty' 
              : 'Student'}
        </div>
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
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontWeight: '600',
              fontSize: 'var(--text-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--glass-border)';
              e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
            }}
          >
            <Trophy size={14} className="text-neon-gold" />
            <span>{badgeCount !== null ? `${badgeCount} Badges` : 'Badges'}</span>
            {profile.streak_days > 0 && (
              <>
                <span style={{ color: 'var(--text-muted)', margin: '0 2px' }}>•</span>
                <Flame size={14} className="text-neon-orange" />
                <span>{profile.streak_days} Day Streak</span>
              </>
            )}
          </button>
        </div>

        <BadgesModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

        {profile.role !== 'admin' && (
          <div style={{ width: '100%' }}>
            {profile.role !== 'instructor' && appData?.status !== 'pending' && (
              <Link href={(appData?.status === 'rejected' || appData?.status === 'approved') ? '/apply-instructor?reapply=true' : '/apply-instructor'} style={{ textDecoration: 'none', width: '100%', display: 'block' }}>
                <Button variant="secondary" size="sm" style={{ width: '100%', height: '48px', backgroundColor: '#22c55e', color: 'white' }}>
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

      {/* PART 4: Database / Storage Usage Indicator */}
      <div style={{ 
        padding: '0 var(--space-xl) var(--space-xl)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <React.Suspense fallback={<div style={{ height: '60px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)' }} />}>
          <StorageUsageIndicator userId={profile.id} compact />
        </React.Suspense>
      </div>

    </Card>
  );
}
