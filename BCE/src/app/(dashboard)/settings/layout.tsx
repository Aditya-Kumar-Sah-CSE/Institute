'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, User, Sliders, Settings } from 'lucide-react';

const SETTINGS_TABS = [
  {
    name: 'AI Agent & Storage',
    href: '/settings/ai-agent',
    icon: Sparkles,
    badge: 'BYOK'
  },
  {
    name: 'Profile & Account',
    href: '/settings/profile',
    icon: User,
  },
  {
    name: 'App Preferences',
    href: '/settings/preferences',
    icon: Sliders,
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--space-md)' }}>
      {/* HEADER & TITLE */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div style={{ fontSize: '12px', color: 'var(--neon-cyan)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span>Smart Learn</span>
          <span>→</span>
          <span style={{ color: 'var(--text-primary)' }}>Settings</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={28} style={{ color: 'var(--neon-cyan)' }} />
          Settings & Configuration
        </h1>
        <p style={{ margin: '6px 0 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Manage your AI provider keys, profile preferences, and application settings.
        </p>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--glass-border)',
        marginBottom: 'var(--space-lg)',
        paddingBottom: '2px',
        overflowX: 'auto'
      }}>
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || (tab.href === '/settings/ai-agent' && pathname === '/settings');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '10px 10px 0 0',
                fontSize: '13px',
                fontWeight: 600,
                color: isActive ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--neon-cyan)' : '2px solid transparent',
                background: isActive ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.name}</span>
              {tab.badge && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  background: 'rgba(0, 229, 255, 0.2)',
                  color: 'var(--neon-cyan)',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  border: '1px solid rgba(0, 229, 255, 0.3)'
                }}>
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <div>{children}</div>
    </div>
  );
}
