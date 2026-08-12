'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User, Flame, CheckCircle2, TerminalSquare, Swords, Sparkles } from 'lucide-react';
import type { Profile } from '@/types';

interface CodingProfileHeroProps {
  profile: Profile | null;
  codeforcesConnected: boolean;
  leetCodeConnected: boolean;
}

export default function CodingProfileHero({ profile, codeforcesConnected, leetCodeConnected }: CodingProfileHeroProps) {
  return (
    <div className="profile-hero-container">
      {/* Animated gradient orbs in background */}
      <div className="hero-bg-orb hero-bg-orb-1" />
      <div className="hero-bg-orb hero-bg-orb-2" />
      <div className="hero-bg-orb hero-bg-orb-3" />
      
      <div className="profile-hero-content">
        <div className="profile-hero-avatar">
          <div className="avatar-glow-ring" />
          {profile?.avatar_url ? (
            <Image 
              src={profile.avatar_url} 
              alt={profile.name} 
              width={100}
              height={100}
              style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '50%' }}
              unoptimized
            />
          ) : (
            <User size={48} opacity={0.5} />
          )}
        </div>
        
        <div className="profile-hero-details">
          <div className="hero-name-row">
            <h1 className="profile-hero-name">{profile?.name || 'Loading...'}</h1>
            <Sparkles size={20} className="hero-sparkle-icon" />
          </div>
          <p className="profile-hero-title">Competitive Programmer</p>
          <p className="profile-hero-college">
            <span className="college-dot" />
            BCE Bhagalpur
          </p>
          
          <div className="profile-hero-badges">
            {profile?.streak_days && profile.streak_days > 0 ? (
              <span className="profile-badge streak-badge">
                <Flame size={14} />
                {profile.streak_days} Day Streak
              </span>
            ) : null}
            {codeforcesConnected && (
              <span className="profile-badge connection-badge cf-badge">
                <CheckCircle2 size={14} />
                Codeforces
              </span>
            )}
            {leetCodeConnected && (
              <span className="profile-badge connection-badge lc-badge">
                <CheckCircle2 size={14} />
                LeetCode
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="profile-hero-actions">
        <Link href="/code-arena/problems" className="hero-action-btn primary">
          <TerminalSquare size={18} />
          Problem Hub
        </Link>
        <Link href="/code-arena" className="hero-action-btn secondary">
          <Swords size={18} />
          Coding Battles
        </Link>
      </div>
    </div>
  );
}
