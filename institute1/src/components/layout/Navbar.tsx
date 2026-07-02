'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import NotificationBell from './NotificationBell';
import './Navbar.css';

import type { Profile } from '@/types';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { getIcon } from '@/lib/icon-mapper';

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
    if (profile.role === 'admin') {
      homeLink = '/admin';
    } else if (profile.role === 'instructor' && profile.status === 'active') {
      homeLink = '/instructor';
    } else {
      homeLink = '/dashboard';
    }
  }

  return (
    <header className="dashboard-navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">{pageTitle}</h1>
        {companyName && (
          <Link href={homeLink} className="company-branding-nav mobile-logo" style={{ padding: 'var(--space-xs)' }}>
            {companyLogo ? (
              <Image src={companyLogo} alt={companyName} width={32} height={32} className="company-nav-logo" priority />
            ) : (
              <div className="company-nav-logo-fallback">{getIcon('Building', { size: 20 })}</div>
            )}
          </Link>
        )}
      </div>

      {companyName && (
        <div className="navbar-center">
          <Link href={homeLink} className="company-branding-nav" style={{ background: 'transparent', border: 'none' }}>
            <span className="company-nav-name">{companyName}</span>
          </Link>
        </div>
      )}

      <div className="navbar-right">
        {companyName && (
          <Link href={homeLink} className="company-branding-nav desktop-logo" style={{ padding: 'var(--space-xs)' }}>
            {companyLogo ? (
              <Image src={companyLogo} alt={companyName} width={32} height={32} className="company-nav-logo" priority />
            ) : (
              <div className="company-nav-logo-fallback">{getIcon('Building', { size: 20 })}</div>
            )}
          </Link>
        )}

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
                     <Link href="/admin/notices" onClick={() => setIsMenuOpen(false)}>
                       {getIcon('Notices', { size: 16, className: 'mobile-nav-icon' })} Notices
                     </Link>
                   </>
                 )}
                 {currentView === 'instructor' && (
                   <>
                     <Link href="/doubts" onClick={() => setIsMenuOpen(false)}>
                       {getIcon('Doubts', { size: 16, className: 'mobile-nav-icon' })} Batch Doubts
                     </Link>
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
                 <form action="/api/auth/signout" method="post" style={{ margin: 0, width: '100%' }}>
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
