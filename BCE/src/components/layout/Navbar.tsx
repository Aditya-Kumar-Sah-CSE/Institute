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
                 {(profile.email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || (profile.role as string) === 'super_admin') && (
                   <Link href="/super-admin" onClick={() => setIsMenuOpen(false)} style={{ color: '#facc15', fontWeight: 'bold' }}>
                     {getIcon('Admin', { size: 16, className: 'mobile-nav-icon' })} Super Admin Panel
                   </Link>
                 )}
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
                 {currentView !== 'admin' && (profile.role === 'admin' || profile.role === 'developer') && (
                   <Link href="/admin" onClick={() => setIsMenuOpen(false)}>
                     {getIcon('Admin', { size: 16, className: 'mobile-nav-icon' })} {profile.role === 'developer' || profile.email === SUPER_ADMIN_EMAIL ? 'Developer Panel' : 'Admin Panel'}
                   </Link>
                 )}
                 {currentView !== 'instructor' && ((profile.role === 'instructor' && profile.status === 'active') || profile.role === 'admin' || profile.role === 'developer') && (
                   <Link href="/instructor" onClick={() => setIsMenuOpen(false)}>
                     {getIcon('Instructors', { size: 16, className: 'mobile-nav-icon' })} Instructor Panel
                   </Link>
                 )}
                 {currentView === 'student' && (
                   <Link href="/notices" onClick={() => setIsMenuOpen(false)}>
                     {getIcon('Notices', { size: 16, className: 'mobile-nav-icon' })} Notices
                   </Link>
                 )}
                 <Link href="/code-arena" onClick={() => setIsMenuOpen(false)}>
                   {getIcon('Code', { size: 16, className: 'mobile-nav-icon' })} Code Arena
                 </Link>
                 <Link href="/code-arena/compiler" onClick={() => setIsMenuOpen(false)}>
                   {getIcon('Code', { size: 16, className: 'mobile-nav-icon' })} Compiler
                 </Link>
                 <Link href="/latex-editor" onClick={() => setIsMenuOpen(false)}>
                   {getIcon('LaTeX', { size: 16, className: 'mobile-nav-icon' })} LaTeX Editor
                 </Link>
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
