'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import './Sidebar.css';
import { NAV_ITEMS, ADMIN_NAV_ITEMS, INSTRUCTOR_NAV_ITEMS, SUPER_ADMIN_EMAIL } from '@/lib/constants';
import XPBar from '@/components/shared/XPBar';
import LevelBadge from '@/components/shared/LevelBadge';
import Modal from '@/components/ui/Modal';
import type { Profile } from '@/types';

interface SidebarProps {
  profile: Profile;
  isAdmin?: boolean; // Deprecated, use roleView
  roleView?: 'admin' | 'instructor' | 'student';
}

export default function Sidebar({ profile, isAdmin = false, roleView }: SidebarProps) {
  const pathname = usePathname();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const currentView = roleView || (isAdmin ? 'admin' : 'student');
  let navItems = currentView === 'admin' ? ADMIN_NAV_ITEMS : 
                   currentView === 'instructor' ? INSTRUCTOR_NAV_ITEMS : 
                   NAV_ITEMS;

  // Filter restricted tabs for non-super-admins
  if (currentView === 'admin' && profile.email !== SUPER_ADMIN_EMAIL) {
    navItems = navItems.filter(item => item.label !== 'Instructors' && item.label !== 'Admins');
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link href={isAdmin ? '/admin' : '/dashboard'} className="sidebar-logo">
          <span className="sidebar-logo-icon">🏛️</span>
          <span className="sidebar-logo-text">Smart  Learning</span>
        </Link>
      </div>

      {currentView === 'student' && (
        <div className="sidebar-profile">
          <div 
            className="sidebar-avatar" 
            style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }} 
            onClick={() => profile.avatar_url && setIsPreviewOpen(true)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            title={profile.avatar_url ? "View Profile Picture" : ""}
          >
            {profile.avatar_url ? (
              <Image 
                src={profile.avatar_url} 
                alt={profile.name} 
                fill
                sizes="64px"
                style={{ objectFit: 'cover' }}
                unoptimized={true}
                priority={true}
              />
            ) : (
              <span className="sidebar-avatar-fallback">
                {profile.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{profile.name}</span>
            <LevelBadge level={profile.level} size="sm" />
          </div>
          <div className="sidebar-xp">
            <XPBar xp={profile.xp} size="sm" showLabel={false} />
            <span className="sidebar-xp-text">{profile.xp.toLocaleString()} XP</span>
          </div>
          {profile.streak_days > 0 && (
            <div className="sidebar-streak">
              <span className="streak-fire">🔥</span>
              <span className="streak-count">{profile.streak_days} day streak</span>
            </div>
          )}

          <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Profile Picture" size="sm">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-xl)' }}>
              {profile.avatar_url && (
                <div style={{ position: 'relative', width: '280px', height: '280px', borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--neon-cyan)', boxShadow: 'var(--glow-cyan-strong)' }}>
                  <Image 
                    src={profile.avatar_url} 
                    alt={profile.name} 
                    fill
                    sizes="280px"
                    style={{ objectFit: 'cover' }}
                    unoptimized={true}
                  />
                </div>
              )}
            </div>
          </Modal>
        </div>
      )}

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-label">{item.label}</span>
            {pathname === item.href && <span className="sidebar-nav-indicator" />}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        {currentView !== 'student' && (
          <a href="/dashboard" className="sidebar-nav-item sidebar-switch">
            <span className="sidebar-nav-icon">🎓</span>
            <span className="sidebar-nav-label">Student View</span>
          </a>
        )}
        {currentView !== 'admin' && profile.role === 'admin' && (
          <a href="/admin" className="sidebar-nav-item sidebar-switch">
            <span className="sidebar-nav-icon">🛡️</span>
            <span className="sidebar-nav-label">Admin Panel</span>
          </a>
        )}
        {currentView !== 'instructor' && ((profile.role === 'instructor' && profile.status === 'active') || profile.role === 'admin') && (
          <a href="/instructor" className="sidebar-nav-item sidebar-switch">
            <span className="sidebar-nav-icon">👨‍🏫</span>
            <span className="sidebar-nav-label">Instructor Panel</span>
          </a>
        )}
        <form action="/api/auth/signout" method="post">
          <button type="submit" className="sidebar-nav-item sidebar-logout">
            <span className="sidebar-nav-icon">🚪</span>
            <span className="sidebar-nav-label">Logout</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
