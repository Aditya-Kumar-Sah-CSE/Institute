'use client';
// cache-buster to reset Next.js turbopack stale module graph

import React from 'react';
import { TenantLink as Link, useTenant } from '@/lib/tenant/TenantProvider';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import NotificationBell from './NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import './Navbar.css';

import type { Profile } from '@/types';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { getIcon } from '@/lib/icon-mapper';
import { signOut } from '@/features/auth/actions/auth';
import { MoreVertical } from 'lucide-react';

interface NavbarProps {
  title?: string;
  companyName?: string;
  companyLogo?: string;
  profile?: Profile;
  currentView?: 'student' | 'admin' | 'instructor';
}

export default function Navbar({ title, companyName, companyLogo, profile, currentView = 'student' }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { tenant } = useTenant();
  const pathname = usePathname();
  const pageTitle = title || (pathname === '/dashboard' ? 'Dashboard' : 
                    pathname.startsWith('/admin') ? 'Admin Panel' :
                    pathname.startsWith('/courses') ? 'Courses' : 
                    pathname.startsWith('/leaderboard') ? 'Leaderboard' :
                    pathname.startsWith('/profile') ? 'Profile' : '');

  let homeLink = '/';
  if (profile) {
    if (profile.role === 'admin') {
      homeLink = '/admin';
    } else if (profile.role === 'instructor' && profile.status === 'active') {
      homeLink = '/instructor';
    } else {
      homeLink = '/dashboard';
    }
  }

  const navName = tenant?.name || companyName;
  const navLogo = tenant?.logo || companyLogo;

  return (
    <header className="dashboard-navbar" style={{ padding: '0 var(--space-md)' }}>
      <div className="navbar-left" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {navName && (
          <Link href={homeLink} className="company-branding-nav" style={{ padding: '0', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {navLogo ? (
              <Image unoptimized src={navLogo} alt={navName} width={32} height={32} className="company-nav-logo" style={{ width: 'auto', height: '32px', objectFit: 'contain' }} priority />
            ) : (
              <Image unoptimized src="/icon-192x192.png" alt={navName} width={32} height={32} className="company-nav-logo" style={{ width: 'auto', height: '32px', objectFit: 'contain' }} priority />
            )}
            {/* Desktop only company name */}
            <span className="company-nav-name desktop-only hidden md:block" style={{ fontWeight: 'bold' }}>{navName}</span>
          </Link>
        )}
        <h1 className="navbar-title desktop-only hidden md:block" style={{ marginLeft: 'var(--space-2)' }}>{pageTitle}</h1>
      </div>

      <div className="navbar-center mobile-only md:hidden">
        {navName && (
          <span className="company-nav-name-mobile" style={{ fontWeight: 'bold', fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>
            {navName}
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
                 {/* Removed Instructors link */}
                 {currentView === 'admin' && (
                   <>
                     {profile.email === SUPER_ADMIN_EMAIL && (
                       <Link href="/admin/feedback" onClick={() => setIsMenuOpen(false)}>
                         {getIcon('Feedback', { size: 16, className: 'mobile-nav-icon' })} Feedback
                       </Link>
                     )}
                     <Link href="/leaderboard" onClick={() => setIsMenuOpen(false)}>
                       {getIcon('Leaderboard', { size: 16, className: 'mobile-nav-icon' })} Leaderboard
                     </Link>
                     <Link href="/doubts" onClick={() => setIsMenuOpen(false)}>
                       {getIcon('Doubts', { size: 16, className: 'mobile-nav-icon' })} Batch Doubts
                     </Link>
                     <Link href="/admin/submissions" onClick={() => setIsMenuOpen(false)}>
                       {getIcon('Submissions', { size: 16, className: 'mobile-nav-icon' })} Submissions
                     </Link>
                     <Link href="/admin/notices" onClick={() => setIsMenuOpen(false)}>
                       {getIcon('Notices', { size: 16, className: 'mobile-nav-icon' })} Notices
                     </Link>
                   </>
                 )}
                 {currentView === 'instructor' && (
                   <>
                     <Link href="/leaderboard" onClick={() => setIsMenuOpen(false)}>
                       {getIcon('Leaderboard', { size: 16, className: 'mobile-nav-icon' })} Leaderboard
                     </Link>
                     <Link href="/instructor/submissions" onClick={() => setIsMenuOpen(false)}>
                       {getIcon('Submissions', { size: 16, className: 'mobile-nav-icon' })} Submissions
                     </Link>
                     <Link href="/instructor/notices" onClick={() => setIsMenuOpen(false)}>
                       {getIcon('Notices', { size: 16, className: 'mobile-nav-icon' })} Notices
                     </Link>
                   </>
                 )}
                 {currentView !== 'student' && (
                   <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                     {getIcon('Dashboard', { size: 16, className: 'mobile-nav-icon' })} Student View
                   </Link>
                 )}
                 {currentView !== 'admin' && profile.role === 'admin' && (
                   <Link href="/admin" onClick={() => setIsMenuOpen(false)}>
                     {getIcon('Admin', { size: 16, className: 'mobile-nav-icon' })} Admin Panel
                   </Link>
                 )}
                 {currentView !== 'instructor' && ((profile.role === 'instructor' && profile.status === 'active') || profile.role === 'admin') && (
                   <Link href="/instructor" onClick={() => setIsMenuOpen(false)}>
                     {getIcon('Instructors', { size: 16, className: 'mobile-nav-icon' })} Instructor Panel
                   </Link>
                 )}
                 {currentView === 'student' && (
                   <Link href="/notices" onClick={() => setIsMenuOpen(false)}>
                     {getIcon('Notices', { size: 16, className: 'mobile-nav-icon' })} Notices
                   </Link>
                 )}
                 <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                   {getIcon('Profile', { size: 16, className: 'mobile-nav-icon' })} Profile
                 </Link>
                 
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
