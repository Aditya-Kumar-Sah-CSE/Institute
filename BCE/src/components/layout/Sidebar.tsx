'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import './Sidebar.css';
import { NAV_ITEMS, ADMIN_NAV_ITEMS, INSTRUCTOR_NAV_ITEMS } from '@/lib/constants';
import { getIcon } from '@/lib/icon-mapper';
import { isAdminRole, isInstructorRole } from '@/lib/role-utils';
import XPBar from '@/components/shared/XPBar';
import LevelBadge from '@/components/shared/LevelBadge';
import Modal from '@/components/ui/Modal';
import type { Profile } from '@/types';
import { LogOut, User, Download, X, MoreVertical, ChevronRight, ChevronDown, ChevronLeft, Crown, Smartphone, Monitor } from 'lucide-react';
import { signOut } from '@/features/auth/actions/auth';

const ITEM_GROUPS: Record<string, string> = {
  'Dashboard': 'Overview',
  'Overview': 'Overview',
  
  'Courses': 'Study',
  'My Courses': 'Study',
  'My NPTEL Courses': 'Study',
  'NPTEL Management': 'Study',
  'Leaderboard': 'Study',
  'Batch Doubts': 'Study',
  'Chat': 'Study',
  'Enrollments': 'Study',
  'Administration': 'Study',
  'Submissions': 'Study',
  'Review Submissions': 'Study',
  
  'Code Arena': 'Coding',
  'Coding Sheets': 'Coding',
  'Compiler': 'Coding',
  'SQL Editor': 'Coding',
  'LaTeX Editor': 'Coding',
  
  'Brick Breaker': 'Games',
  'Multiplayer Games': 'Games',
  
  'Notices': 'General',
  'Polls': 'General',
  'Feedback': 'General',
  'Profile': 'General',
  'Super Admin': 'General',
};

const GROUP_ORDER = ['Overview', 'Study', 'Coding', 'Games', 'General'];

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

  const [isLandscape, setIsLandscape] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      setIsStandalone(isStandaloneMode);

      if (window.screen?.orientation) {
        setIsLandscape(window.screen.orientation.type.includes('landscape'));
        const handleOrientationChange = () => {
          setIsLandscape(window.screen.orientation.type.includes('landscape'));
        };
        window.screen.orientation.addEventListener('change', handleOrientationChange);
        return () => window.screen.orientation.removeEventListener('change', handleOrientationChange);
      }
    }
  }, []);

  const toggleOrientation = async () => {
    try {
      if (!isLandscape) {
        // Attempt fullscreen first (required by many browsers for orientation lock)
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          try {
            await document.documentElement.requestFullscreen();
          } catch (fsErr) {
            console.warn('Fullscreen request failed:', fsErr);
            // Non-fatal, might still work in PWA mode
          }
        }
        
        if (window.screen && window.screen.orientation && 'lock' in window.screen.orientation) {
          try {
            await (window.screen.orientation as any).lock('landscape');
            setIsLandscape(true);
          } catch (lockErr: any) {
            console.warn('Orientation lock failed:', lockErr);
            if (lockErr.name === 'NotSupportedError' || lockErr.name === 'SecurityError') {
              alert('Rotate Display is not supported on this device/browser in this mode.');
            } else {
              alert(`Could not rotate display: ${lockErr.message}`);
            }
          }
        } else {
          alert('Display rotation is not supported by your browser.');
        }
      } else {
        // Unlock Orientation
        if (window.screen && window.screen.orientation && 'unlock' in window.screen.orientation) {
          try {
            (window.screen.orientation as any).unlock();
          } catch (unlockErr) {
            console.warn('Orientation unlock failed:', unlockErr);
          }
        }
        
        // Exit Fullscreen
        if (document.fullscreenElement && document.exitFullscreen) {
          try {
            await document.exitFullscreen();
          } catch (fsErr) {
            console.warn('Exit fullscreen failed:', fsErr);
          }
        }
        setIsLandscape(false);
      }
    } catch (e: any) {
      console.error('Unexpected error in toggleOrientation:', e);
      alert(`Unexpected error: ${e.message}`);
    }
  };

  useEffect(() => {
    const toggleHandler = () => setIsCollapsed(prev => !prev);
    const expandHandler = () => setIsCollapsed(false);
    window.addEventListener('toggleSidebar', toggleHandler);
    window.addEventListener('expandSidebar', expandHandler);
    return () => {
      window.removeEventListener('toggleSidebar', toggleHandler);
      window.removeEventListener('expandSidebar', expandHandler);
    };
  }, []);

  const handleNavClick = () => {
    // Keep sidebar open on desktop (>768px) for continuous navigation, matching Instructor Panel
  };

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

  }, []);

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
  let baseNavItems = currentView === 'admin' ? ADMIN_NAV_ITEMS : 
                     currentView === 'instructor' ? INSTRUCTOR_NAV_ITEMS : 
                     NAV_ITEMS;

  // Filter restricted tabs for non-super-admins
  if (currentView === 'admin' && !isSuperAdmin) {
    baseNavItems = baseNavItems.filter(item => item.label !== 'Instructors' && item.label !== 'Admins' && item.label !== 'Feedback');
  }
  if (currentView === 'instructor' && !isSuperAdmin) {
    baseNavItems = baseNavItems.filter(item => item.label !== 'Feedback');
  }

  // Removed dynamic role-based extra nav items as they clutter the student mobile view.
  // Administrative switching is handled in the sidebar footer natively instead.
  const isInstructorUser = isInstructorRole(profile.role);
  const isAdminUser = isAdminRole(profile.role);
  const isPlatformOwner = profile?.email?.trim().toLowerCase() === 'iambestadi@gmail.com';

  const showSuperAdminSwitch = isPlatformOwner;
  const showStudentSwitch = currentView !== 'student';
  const showAdminSwitch = currentView !== 'admin' && isAdminUser;
  const showInstructorSwitch = currentView !== 'instructor' && isInstructorUser;
  const hasSwitcherPanels = showSuperAdminSwitch || showStudentSwitch || showAdminSwitch || showInstructorSwitch;

  const navItems = [...baseNavItems];
  // Add Multiplayer Games directly here (not in constants.ts) to avoid SSR/client hydration mismatch
  if (!navItems.some(i => i.href === '/games')) {
    const brickIdx = navItems.findIndex(i => i.href === '/code-arena/game');
    navItems.splice(brickIdx + 1, 0, { label: 'Multiplayer Games', href: '/games', icon: 'Game' });
  }
  if (isPlatformOwner && !navItems.some(i => i.href === '/super-admin')) {
    navItems.push({ label: 'Super Admin', href: '/super-admin', icon: 'Admin' });
  }

  const isChatRoute = pathname ? pathname.includes('/chat') : false;
  const logoHref = currentView === 'admin' ? '/admin' : currentView === 'instructor' ? '/instructor' : '/dashboard';

  const sidebarClasses = [
    'sidebar',
    `view-${currentView}`,
    isChatRoute ? 'chat-active' : null,
    isNavWrapped ? 'mobile-collapsed' : null,
    isCollapsed ? 'is-collapsed' : null,
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

  return (
    <aside className={sidebarClasses} suppressHydrationWarning>
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }} suppressHydrationWarning>
        <Link href={logoHref} className="sidebar-logo">
          <span className="sidebar-logo-icon text-neon-cyan">{getIcon('Building', { className: 'w-6 h-6' })}</span>
          <span className="sidebar-logo-text">Smart Learning</span>
        </Link>
        <button 
          suppressHydrationWarning
          onClick={() => setIsCollapsed(true)} 
          className="desktop-only-btn"
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Collapse Sidebar"
        >
          <X size={18} />
        </button>
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

      <nav className="sidebar-nav" suppressHydrationWarning>
        <button 
          suppressHydrationWarning
          className="wrap-toggle-btn"
          onClick={() => setIsNavWrapped(!isNavWrapped)}
          style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', padding: 0, margin: 0, cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}
        >
          {isNavWrapped ? <ChevronRight size={18} /> : <ChevronLeft size={24} />}
        </button>
        {GROUP_ORDER.map((groupName) => {
          const itemsInGroup = navItems.filter(item => ITEM_GROUPS[item.label] === groupName);
          if (itemsInGroup.length === 0) return null;

          return (
            <React.Fragment key={groupName}>
              {groupName !== 'Overview' && (
                <>
                  <hr className="sidebar-divider" />
                  <div className="sidebar-group-title">{groupName}</div>
                </>
              )}
              {itemsInGroup.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item ${pathname === item.href ? 'active' : ''}`}
                  onClick={handleNavClick}
                  suppressHydrationWarning
                >
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }} suppressHydrationWarning>
                    <span className="sidebar-nav-icon" suppressHydrationWarning>{getIcon(item.icon, { className: 'w-5 h-5' })}</span>
                  </div>
                  <span className="sidebar-nav-label" suppressHydrationWarning>{item.label}</span>
                  {pathname === item.href && <span className="sidebar-nav-indicator" suppressHydrationWarning />}
                </Link>
              ))}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {hasSwitcherPanels && (
          <div className="sidebar-group-title" style={{ marginTop: 0, paddingLeft: 'var(--space-md)', paddingBottom: 'var(--space-2xs)' }}>
            Panels
          </div>
        )}
        {showSuperAdminSwitch && (
          <Link
            href="/super-admin"
            className="sidebar-nav-item sidebar-switch"
            onClick={handleNavClick}
            suppressHydrationWarning
            style={{
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(245, 158, 11, 0.1))',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              color: '#facc15',
              fontWeight: 700,
              marginBottom: '6px',
            }}
          >
            <span className="sidebar-nav-icon">
              <Crown className="w-5 h-5" style={{ color: '#facc15' }} />
            </span>
            <span className="sidebar-nav-label">👑 Super Admin Panel</span>
          </Link>
        )}
        {showStudentSwitch && (
          <a href="/dashboard" className="sidebar-nav-item sidebar-switch" onClick={handleNavClick}>
            <span className="sidebar-nav-icon">{getIcon('Instructors', { className: 'w-5 h-5' })}</span>
            <span className="sidebar-nav-label">Student View</span>
          </a>
        )}
        {showAdminSwitch && (
          <a href="/admin" className="sidebar-nav-item sidebar-switch" onClick={handleNavClick}>
            <span className="sidebar-nav-icon">{getIcon('Admin', { className: 'w-5 h-5' })}</span>
            <span className="sidebar-nav-label">{isAdminUser && profile.role?.toLowerCase().includes('developer') ? 'Developer Panel' : 'Administration Panel'}</span>
          </a>
        )}
        {showInstructorSwitch && (
          <a href="/instructor" className="sidebar-nav-item sidebar-switch" onClick={handleNavClick}>
            <span className="sidebar-nav-icon">{getIcon('Instructors', { className: 'w-5 h-5' })}</span>
            <span className="sidebar-nav-label">Instructor Panel</span>
          </a>
        )}
        {isInstallable && (
          <button suppressHydrationWarning type="button" onClick={handleInstallClick} className="sidebar-nav-item" style={{ color: 'var(--neon-lime)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
            <span className="sidebar-nav-icon"><Download className="w-5 h-5" /></span>
            <span className="sidebar-nav-label">Install App</span>
          </button>
        )}
        {isStandalone && (
          <button suppressHydrationWarning type="button" onClick={toggleOrientation} className="sidebar-nav-item" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
            <span className="sidebar-nav-icon">{isLandscape ? <Monitor className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}</span>
            <span className="sidebar-nav-label">Rotate Display</span>
          </button>
        )}
        <form action={signOut}>
          <button suppressHydrationWarning type="submit" className="sidebar-nav-item sidebar-logout">
            <span className="sidebar-nav-icon"><LogOut className="w-5 h-5" /></span>
            <span className="sidebar-nav-label">Logout</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
