'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import NotificationBell from './NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import './Navbar.css';

import type { Profile } from '@/types';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { getIcon } from '@/lib/icon-mapper';
import { signOut } from '@/features/auth/actions/auth';
import { isAdminRole, isInstructorRole } from '@/lib/role-utils';
import { MoreVertical } from 'lucide-react';

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
  const pathname = usePathname();
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
    menuItems.push({ href: '/dashboard/sql-editor', label: 'SQL Editor', icon: 'Database' });
    menuItems.push({ href: '/code-arena/compiler', label: 'Compiler', icon: 'Code' });
    menuItems.push({ href: '/latex-editor', label: 'LaTeX Editor', icon: 'LaTeX' });
    menuItems.push({ href: '/student/nptel', label: 'My NPTEL Courses', icon: 'Courses' });
    menuItems.push({ href: '/profile', label: 'Profile', icon: 'Profile' });
  }

  return (
    <header className="dashboard-navbar" style={{ padding: '0 var(--space-md)' }}>
      <div className="navbar-left" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
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
        <button 
          onClick={() => window.dispatchEvent(new Event('expandSidebar'))}
          className="open-sidebar-btn desktop-only-btn"
          style={{ padding: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}
          title="Open Sidebar"
        >
          <MoreVertical size={24} />
        </button>

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
            <button className="hamburger-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
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
    </header>
  );
}
