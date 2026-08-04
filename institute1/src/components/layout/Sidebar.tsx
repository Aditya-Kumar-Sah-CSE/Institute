'use client';

import React, { useState, useEffect } from 'react';
import { TenantLink as Link } from '@/lib/tenant/TenantProvider';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import './Sidebar.css';
import { NAV_ITEMS, ADMIN_NAV_ITEMS, INSTRUCTOR_NAV_ITEMS } from '@/lib/constants';
import { getIcon } from '@/lib/icon-mapper';
import XPBar from '@/components/shared/XPBar';
import LevelBadge from '@/components/shared/LevelBadge';
import Modal from '@/components/ui/Modal';
import type { Profile } from '@/types';
import { LogOut, User, Download, X, MoreVertical, ChevronRight, ChevronDown, ChevronLeft } from 'lucide-react';
import { signOut } from '@/features/auth/actions/auth';

interface SidebarProps {
  profile: Profile;
  isAdmin?: boolean; // Deprecated, use roleView
  roleView?: 'admin' | 'instructor' | 'student';
  isSuperAdmin?: boolean;
}

export default function Sidebar({ profile, isAdmin = false, roleView, isSuperAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isNavWrapped, setIsNavWrapped] = useState(false);

  useEffect(() => {
    if (isCollapsed) {
      document.documentElement.style.setProperty('--sidebar-width', '0px');
      document.body.classList.add('sidebar-is-collapsed');
    } else {
      document.documentElement.style.removeProperty('--sidebar-width');
      document.body.classList.remove('sidebar-is-collapsed');
    }
  }, [isCollapsed]);

  useEffect(() => {
    const expandHandler = () => setIsCollapsed(false);
    window.addEventListener('expandSidebar', expandHandler);
    return () => window.removeEventListener('expandSidebar', expandHandler);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleNavClick = () => {
    // Only auto-collapse on tablet drawer viewports (between 768px and 1024px)
    if (typeof window !== 'undefined' && window.innerWidth > 768 && window.innerWidth < 1024) {
      setIsCollapsed(true);
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };
  
  const currentView = roleView || (isAdmin ? 'admin' : 'student');
  let navItems = currentView === 'admin' ? ADMIN_NAV_ITEMS : 
                   currentView === 'instructor' ? INSTRUCTOR_NAV_ITEMS : 
                   NAV_ITEMS;

  // Filter restricted tabs for non-super-admins
  if (currentView === 'admin' && !isSuperAdmin) {
    navItems = navItems.filter(item => 
      item.label !== 'Instructors' && 
      item.label !== 'Admins' && 
      item.label !== 'Feedback' &&
      item.label !== 'Institutions' &&
      item.label !== 'Domain Settings' &&
      item.label !== 'Payment'
    );
  }
  if (currentView === 'instructor' && !isSuperAdmin) {
    navItems = navItems.filter(item => item.label !== 'Feedback');
  }

  if (isCollapsed) {
    return null; // The toggle button is now in Navbar.tsx
  }

  const isChatRoute = pathname.includes('/chat');

  return (
    <aside className={`sidebar view-${currentView} ${isChatRoute ? 'chat-active' : ''} ${isNavWrapped ? 'mobile-collapsed' : ''}`}>
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button 
          onClick={() => setIsCollapsed(true)} 
          className="desktop-only-btn"
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginLeft: '-8px' }}
          title="Collapse Sidebar"
        >
          <X size={20} />
        </button>
        <Link href={isAdmin ? '/admin' : '/dashboard'} className="sidebar-logo">
          <span className="sidebar-logo-icon text-neon-cyan">{getIcon('Building', { className: 'w-6 h-6' })}</span>
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
                <User size={32} opacity={0.5} />
              </span>
            )}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{profile.name}</span>
            <LevelBadge level={profile.level} size="sm" />
          </div>
          <div className="sidebar-xp">
            <XPBar xp={profile.xp} size="sm" showLabel={false} />
            <span suppressHydrationWarning className="sidebar-xp-text">{profile.xp.toLocaleString('en-US')} XP</span>
          </div>
          {profile.streak_days > 0 && (
            <div className="sidebar-streak">
              <span className="streak-fire text-neon-orange">🔥</span>
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
        <button 
          className="wrap-toggle-btn"
          onClick={() => setIsNavWrapped(!isNavWrapped)}
          style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', padding: 0, margin: 0, cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}
        >
          {isNavWrapped ? <ChevronRight size={18} /> : <ChevronLeft size={24} />}
        </button>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.endsWith(item.href));
          return (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            onClick={handleNavClick}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="sidebar-nav-icon">{getIcon(item.icon, { className: 'w-5 h-5' })}</span>
            </div>
            <span className="sidebar-nav-label">{item.label}</span>
            {isActive && <span className="sidebar-nav-indicator" />}
          </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {currentView !== 'student' && (
          <Link href="/dashboard" className="sidebar-nav-item sidebar-switch" onClick={handleNavClick}>
            <span className="sidebar-nav-icon">{getIcon('Instructors', { className: 'w-5 h-5' })}</span>
            <span className="sidebar-nav-label">Student View</span>
          </Link>
        )}
        {currentView !== 'admin' && profile.role === 'admin' && (
          <Link href="/admin" className="sidebar-nav-item sidebar-switch" onClick={handleNavClick}>
            <span className="sidebar-nav-icon">{getIcon('Admin', { className: 'w-5 h-5' })}</span>
            <span className="sidebar-nav-label">{isSuperAdmin ? 'Developer Panel' : 'Administration Panel'}</span>
          </Link>
        )}
        {currentView !== 'instructor' && ((profile.role === 'instructor' && profile.status === 'active') || profile.role === 'admin') && (
          <Link href="/instructor" className="sidebar-nav-item sidebar-switch" onClick={handleNavClick}>
            <span className="sidebar-nav-icon">{getIcon('Instructors', { className: 'w-5 h-5' })}</span>
            <span className="sidebar-nav-label">Instructor Panel</span>
          </Link>
        )}
        {isInstallable && (
          <button type="button" onClick={handleInstallClick} className="sidebar-nav-item" style={{ color: 'var(--neon-lime)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
            <span className="sidebar-nav-icon"><Download className="w-5 h-5" /></span>
            <span className="sidebar-nav-label">Install App</span>
          </button>
        )}
        <form action={signOut}>
          <button type="submit" className="sidebar-nav-item sidebar-logout">
            <span className="sidebar-nav-icon"><LogOut className="w-5 h-5" /></span>
            <span className="sidebar-nav-label">Logout</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
