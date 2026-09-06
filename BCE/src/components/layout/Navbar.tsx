'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import NotificationBell from './NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import './Navbar.css';

import type { Profile } from '@/types';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { getIcon } from '@/lib/icon-mapper';
import { signOut } from '@/features/auth/actions/auth';
import { isAdminRole, isInstructorRole } from '@/lib/role-utils';
import dynamic from 'next/dynamic';
import { MoreVertical, ArrowLeft, Smartphone, Monitor, Sparkles } from 'lucide-react';

const SmartMentorDrawer = dynamic(() => import('@/features/analytics/components/SmartMentorDrawer'), { ssr: false });
const SmartAgentDrawer = dynamic(() => import('@/features/analytics/components/SmartAgentDrawer'), { ssr: false });

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
  'Feedback': 'General',
  'Profile': 'General',
  'Super Admin': 'General',
};

const GROUP_ORDER = ['Overview', 'Study', 'Coding', 'Games', 'General'];

interface NavbarProps {
  title?: string;
  companyName?: string;
  companyLogo?: string;
  profile?: Profile;
  currentView?: 'student' | 'admin' | 'instructor';
}

export default function Navbar({ title, companyName, companyLogo, profile, currentView = 'student' }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMentorDrawerOpen, setIsMentorDrawerOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = React.useState(false);
  const [canGoBack, setCanGoBack] = React.useState(false);
  const [currentUrl, setCurrentUrl] = React.useState('');

  const [isLandscape, setIsLandscape] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
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
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          try {
            await document.documentElement.requestFullscreen();
          } catch (fsErr) {
            console.warn('Fullscreen request failed:', fsErr);
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
        if (window.screen && window.screen.orientation && 'unlock' in window.screen.orientation) {
          try {
            (window.screen.orientation as any).unlock();
          } catch (unlockErr) {
            console.warn('Orientation unlock failed:', unlockErr);
          }
        }
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

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.pathname + window.location.search);
    }
  }, [pathname]);

  React.useEffect(() => {
    if (!mounted || !currentUrl) return;

    const sessionStack = sessionStorage.getItem('bce:nav-stack');
    let stack: string[] = sessionStack ? JSON.parse(sessionStack) : [];

    const isBack = sessionStorage.getItem('bce:nav-is-back') === 'true';
    sessionStorage.removeItem('bce:nav-is-back');

    if (isBack) {
      setCanGoBack(stack.length > 1);
    } else {
      if (stack.length === 0 || stack[stack.length - 1] !== currentUrl) {
        stack.push(currentUrl);
        if (stack.length > 50) stack.shift();
        sessionStorage.setItem('bce:nav-stack', JSON.stringify(stack));
      }
      setCanGoBack(stack.length > 1);
    }
  }, [currentUrl, mounted]);

  const handleBack = () => {
    if (typeof window === 'undefined') return;

    const sessionStack = sessionStorage.getItem('bce:nav-stack');
    let stack: string[] = sessionStack ? JSON.parse(sessionStack) : [];

    if (stack.length > 1) {
      stack.pop();
      const prevUrl = stack[stack.length - 1];
      
      sessionStorage.setItem('bce:nav-stack', JSON.stringify(stack));
      sessionStorage.setItem('bce:nav-is-back', 'true');
      
      router.push(prevUrl);
    }
  };
  const pageTitle = title || (pathname === '/dashboard' ? 'Dashboard' : 
                    pathname.startsWith('/admin') ? 'Admin Panel' :
                    pathname.startsWith('/courses') ? 'Courses' : 
                    pathname.startsWith('/leaderboard') ? 'Leaderboard' :
                    pathname.startsWith('/profile') ? 'Profile' : '');

  let homeLink = '/';
  if (profile) {
    if (isAdminRole(profile.role)) {
      homeLink = '/admin';
    } else if (isInstructorRole(profile.role) && profile.status === 'active') {
      homeLink = '/instructor';
    } else {
      homeLink = '/dashboard';
    }
  }

  // Build role switchers (Panels)
  const panelItems: { href: string; label: string; icon: string; style?: React.CSSProperties }[] = [];
  const isPlatformOwner = profile?.email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || (profile?.role as string) === 'super_admin';
  if (profile) {
    if (isPlatformOwner) {
      panelItems.push({ href: '/super-admin', label: 'Super Admin Panel', icon: 'Admin', style: { color: '#facc15', fontWeight: 'bold' } });
    }
    if (currentView !== 'student') {
      panelItems.push({ href: '/dashboard', label: 'Student View', icon: 'Dashboard' });
    }
    if (currentView !== 'admin' && (profile.role === 'admin' || profile.role === 'developer')) {
      const label = profile.role === 'developer' || profile.email === SUPER_ADMIN_EMAIL ? 'Developer Panel' : 'Admin Panel';
      panelItems.push({ href: '/admin', label, icon: 'Admin' });
    }
    if (currentView !== 'instructor' && ((profile.role === 'instructor' && profile.status === 'active') || profile.role === 'admin' || profile.role === 'developer')) {
      panelItems.push({ href: '/instructor', label: 'Instructor Panel', icon: 'Instructors' });
    }
  }

  // Build normal menu items
  const menuItems: { href: string; label: string; icon: string }[] = [];
  if (profile) {
    if (currentView === 'admin') {
      menuItems.push({ href: '/admin/nptel', label: 'NPTEL Management', icon: 'Courses' });
      if (profile.email === SUPER_ADMIN_EMAIL) {
        menuItems.push({ href: '/admin/feedback', label: 'Feedback', icon: 'Feedback' });
      }
      menuItems.push({ href: '/leaderboard', label: 'Leaderboard', icon: 'Leaderboard' });
      menuItems.push({ href: '/doubts', label: 'Batch Doubts', icon: 'Doubts' });
      menuItems.push({ href: '/admin/notices', label: 'Notices', icon: 'Notices' });
    } else if (currentView === 'instructor') {
      menuItems.push({ href: '/leaderboard', label: 'Leaderboard', icon: 'Leaderboard' });
      menuItems.push({ href: '/instructor/notices', label: 'Notices', icon: 'Notices' });
    } else {
      // Student View
      menuItems.push({ href: '/notices', label: 'Notices', icon: 'Notices' });
    }

    // Common items (always present in mobile menu)
    menuItems.push({ href: '/code-arena', label: 'Code Arena', icon: 'Code' });
    menuItems.push({ href: '/code-arena/sheets', label: 'Coding Sheets', icon: 'Submissions' });
    menuItems.push({ href: '/code-arena/game', label: 'Brick Breaker', icon: 'Game' });
    menuItems.push({ href: '/games', label: 'Multiplayer Games', icon: 'Game' });
    menuItems.push({ href: '/dashboard/sql-editor', label: 'SQL Editor', icon: 'Database' });
    menuItems.push({ href: '/code-arena/compiler', label: 'Compiler', icon: 'Code' });
    menuItems.push({ href: '/latex-editor', label: 'LaTeX Editor', icon: 'LaTeX' });
    menuItems.push({ href: '/student/nptel', label: 'My NPTEL Courses', icon: 'Courses' });
    menuItems.push({ href: '/profile', label: 'Profile', icon: 'Profile' });
  }

  return (
    <header className="dashboard-navbar" style={{ padding: '0 var(--space-md)' }} suppressHydrationWarning>
      <div className="navbar-left" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {mounted && canGoBack && (
          <button
            onClick={handleBack}
            className="navbar-back-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginRight: '8px',
              userSelect: 'none',
              boxSizing: 'border-box',
              height: '32px'
            }}
            title="Go to previous page"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
              e.currentTarget.style.color = 'var(--neon-cyan)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(6, 182, 212, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'var(--glass-border)';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}

        {companyName && (
          <Link href={homeLink} className="company-branding-nav" style={{ padding: '0', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {companyLogo ? (
              <Image unoptimized src={companyLogo} alt={companyName} width={32} height={32} className="company-nav-logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} priority />
            ) : (
              <Image unoptimized src="/icon-192x192.png" alt={companyName} width={32} height={32} className="company-nav-logo" priority />
            )}
            {/* Desktop only company name */}
            <span className="company-nav-name desktop-only hidden md:block" style={{ fontWeight: 'bold' }}>{companyName}</span>
          </Link>
        )}
        <h1 className="navbar-title desktop-only hidden md:block" style={{ marginLeft: 'var(--space-2)' }}>{pageTitle}</h1>
      </div>

      <div className="navbar-center mobile-only md:hidden">
        {companyName && (
          <span className="company-nav-name-mobile" style={{ fontWeight: 'bold', fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>
            {companyName}
          </span>
        )}
      </div>

      <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {mounted && profile && currentView === 'student' && (
          <div className="desktop-agent-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              type="button" 
              className="nav-agent-btn"
              onClick={() => window.dispatchEvent(new Event('toggleSmartAgentDrawer'))}
              title="Open Smart Agent"
            >
              <Sparkles size={14} style={{ color: 'var(--neon-cyan)' }} />
              <span>✦ Smart Agent</span>
            </button>

            <button 
              type="button"
              onClick={() => window.dispatchEvent(new Event('toggleSidebar'))}
              className="nav-toggle-sidebar-btn desktop-only-btn"
              style={{ padding: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Toggle Menu Sidebar"
            >
              <MoreVertical size={18} />
            </button>

            <button 
              type="button" 
              className="nav-mentor-btn"
              onClick={() => setIsMentorDrawerOpen(true)}
              title="Open Personal AI Mentor"
            >
              <Sparkles size={14} style={{ color: 'var(--neon-lime)' }} />
              <span>✦ Mentor</span>
            </button>
          </div>
        )}

        <div className="desktop-theme-toggle">
          <ThemeToggle />
        </div>

        {/* Notification Bell */}
        {profile && (
          <NotificationBell userId={profile.id} />
        )}

        {/* Hamburger Menu (Mobile Only) */}
        {profile && (
          <div className="mobile-menu-container">
            <button type="button" className="hamburger-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              ☰
            </button>
            {isMenuOpen && (
              <div className="mobile-dropdown">
                {/* Panels Switchers */}
                {panelItems.length > 0 && (
                  <>
                    <div className="mobile-group-title" style={{ marginTop: 0 }}>Panels</div>
                    {panelItems.map((item) => (
                      <Link 
                        key={item.href} 
                        href={item.href} 
                        onClick={() => setIsMenuOpen(false)} 
                        style={item.style}
                      >
                        {getIcon(item.icon, { size: 16, className: 'mobile-nav-icon' })} {item.label}
                      </Link>
                    ))}
                  </>
                )}

                {/* Grouped menu items */}
                {GROUP_ORDER.map((groupName, idx) => {
                  const itemsInGroup = menuItems.filter(item => (ITEM_GROUPS[item.label] || 'General') === groupName);
                  if (itemsInGroup.length === 0) return null;

                  return (
                    <React.Fragment key={groupName}>
                      {(idx > 0 || panelItems.length > 0) && <div className="mobile-divider" />}
                      <div className="mobile-group-title">{groupName}</div>
                      {itemsInGroup.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {getIcon(item.icon, { size: 16, className: 'mobile-nav-icon' })} {item.label}
                        </Link>
                      ))}
                    </React.Fragment>
                  );
                })}
                
                {/* Mobile Theme Toggle Section */}
                <div
                  className="mobile-theme-toggle"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderTop: '1px solid var(--border-divider)',
                    borderBottom: '1px solid var(--border-divider)',
                    marginTop: 'var(--space-xs)',
                    marginBottom: 'var(--space-xs)'
                  }}
                >
                  <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)', fontWeight: 'bold' }}>Theme</span>
                  <ThemeToggle />
                </div>

                {isStandalone && (
                  <>
                    <div className="mobile-divider" style={{ borderTop: '1px solid var(--border-divider)', margin: '4px 0' }} />
                    <button type="button" onClick={toggleOrientation} className="mobile-logout-btn" style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>
                      {isLandscape ? <Monitor size={16} className="mobile-nav-icon" /> : <Smartphone size={16} className="mobile-nav-icon" />} Rotate Display
                    </button>
                  </>
                )}

                <form action={signOut} style={{ margin: 0, width: '100%' }}>
                  <button type="submit" className="mobile-logout-btn">
                    {getIcon('Logout', { size: 16, className: 'mobile-nav-icon' })} Logout
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {profile && currentView === 'student' && (
        <>
          <SmartAgentDrawer />
          <SmartMentorDrawer isOpen={isMentorDrawerOpen} onClose={() => setIsMentorDrawerOpen(false)} />
        </>
      )}
    </header>
  );
}
