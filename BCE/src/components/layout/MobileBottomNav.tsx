'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Trophy, 
  HelpCircle, 
  MessageSquare 
} from 'lucide-react';
import './MobileBottomNav.css';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Courses', href: '/courses', icon: BookOpen },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Doubts', href: '/doubts', icon: HelpCircle },
  { label: 'Chat', href: '/dashboard/chat', icon: MessageSquare },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  // Hide on auth pages
  if (!pathname || pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password' || pathname === '/reset-password') {
    return null;
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      <div className="mobile-bottom-nav-container">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="mobile-bottom-nav-icon-wrapper">
                <Icon size={20} className="mobile-bottom-nav-icon" />
              </div>
              <span className="mobile-bottom-nav-label">{item.label}</span>
              {isActive && <div className="mobile-bottom-active-pill" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
