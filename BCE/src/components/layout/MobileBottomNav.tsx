'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Trophy, 
  HelpCircle, 
  MessageSquare,
  Users,
  FileCheck,
  Code,
  GraduationCap
} from 'lucide-react';
import './MobileBottomNav.css';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const studentItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Courses', href: '/courses', icon: BookOpen },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Doubts', href: '/doubts', icon: HelpCircle },
  { label: 'Chat', href: '/dashboard/chat', icon: MessageSquare },
];

const instructorItems: NavItem[] = [
  { label: 'Overview', href: '/instructor', icon: LayoutDashboard },
  { label: 'Courses', href: '/instructor/courses', icon: BookOpen },
  { label: 'Code Arena', href: '/instructor/code-arena', icon: Code },
  { label: 'Submissions', href: '/instructor/submissions', icon: FileCheck },
  { label: 'Students', href: '/instructor/students', icon: Users },
];

const adminItems: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Courses', href: '/admin/courses', icon: BookOpen },
  { label: 'Students', href: '/admin/students', icon: Users },
  { label: 'Submissions', href: '/admin/submissions', icon: FileCheck },
  { label: 'NPTEL', href: '/admin/nptel', icon: GraduationCap },
];

interface MobileBottomNavProps {
  view?: 'student' | 'instructor' | 'admin';
}

export default function MobileBottomNav({ view }: MobileBottomNavProps) {
  const pathname = usePathname();

  // Hide on auth pages
  if (!pathname || pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password' || pathname === '/reset-password') {
    return null;
  }

  // Determine active view based on path if view prop is not explicitly passed
  let activeView = view;
  if (!activeView) {
    if (pathname.startsWith('/admin')) {
      activeView = 'admin';
    } else if (pathname.startsWith('/instructor')) {
      activeView = 'instructor';
    } else {
      activeView = 'student';
    }
  }

  let items = studentItems;
  if (activeView === 'admin') {
    items = adminItems;
  } else if (activeView === 'instructor') {
    items = instructorItems;
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      <div className="mobile-bottom-nav-container">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (
            item.href !== '/dashboard' && 
            item.href !== '/instructor' && 
            item.href !== '/admin' && 
            pathname.startsWith(item.href)
          );

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
