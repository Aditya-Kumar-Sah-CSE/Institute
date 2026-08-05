'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, BookOpen, ShieldCheck, Users, 
  ArrowRight, Menu, X, LogIn
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import InstallAppButton from '@/components/pwa/InstallAppButton';
import './InstitutionLanding.css';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  primary_domain: string | null;
  custom_domain: string | null;
  [key: string]: any;
}

function LogoAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="inst-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
      }}
    >
      {initials}
    </div>
  );
}

export default function InstitutionLanding({ 
  tenant,
  routingMode = 'subpath',
  companyName = 'Smart Learn AI'
}: { 
  tenant: Tenant;
  routingMode?: 'domain' | 'subpath' | 'development';
  companyName?: string;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const primaryColor = '#6366f1';
  const baseUrl = (routingMode === 'subpath' || routingMode === 'development') ? `/${tenant.slug}` : '';

  useEffect(() => {
    document.documentElement.style.setProperty('--tenant-primary', primaryColor);
  }, [primaryColor]);

  return (
    <div className="inst-landing">
      {/* Navbar */}
      <nav className="inst-nav">
        <div className="inst-nav-inner">
          <Link href="/" className="inst-brand" suppressHydrationWarning>
            {tenant.logo ? (
              <img src={tenant.logo} alt={tenant.name} style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px' }} suppressHydrationWarning />
            ) : (
              <LogoAvatar name={tenant.name} size={36} />
            )}
            <span className="inst-brand-name">{tenant.name}</span>
          </Link>

          <div className="inst-nav-actions desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ThemeToggle />
            <InstallAppButton variant="primary" tenantSlug={tenant.slug} />
            <a href={`${baseUrl}/login`} className="inst-nav-btn outline">
              <LogIn size={18} /> Login
            </a>
            <a href={`${baseUrl}/signup`} className="inst-nav-btn primary">
              Sign Up
            </a>
          </div>

          <button className="inst-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="inst-mobile-dropdown">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--inst-nav-border)' }}>
              <span style={{ fontWeight: 600 }}>Theme Option</span>
              <ThemeToggle />
            </div>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--inst-nav-border)', display: 'flex', justifyContent: 'center' }}>
              <InstallAppButton variant="primary" className="inst-nav-btn" tenantSlug={tenant.slug} />
            </div>
            <a href={`${baseUrl}/login`} onClick={() => setMobileMenuOpen(false)}>
              <LogIn size={18} /> Login
            </a>
            <a href={`${baseUrl}/signup`} onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--tenant-primary)', fontWeight: 'bold' }}>
              Sign Up
            </a>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="inst-hero">
        <div className="inst-hero-glow" style={{ background: `radial-gradient(ellipse at 50% 0%, ${primaryColor}18 0%, transparent 70%)` }} />
        <div className="inst-hero-inner">
          <div className="inst-hero-badge" style={{ borderColor: `${primaryColor}40`, color: primaryColor }}>
            <GraduationCap size={16} /> Your Digital Campus
          </div>
          <h1 className="inst-hero-title">
            Welcome to<br />
            <span style={{ color: primaryColor }}>{tenant.name}</span>
          </h1>
          <p className="inst-hero-sub">
            Access your courses, assignments, attendance, and results — all in one place.
          </p>
          <div className="inst-hero-ctas">
            <a href={`${baseUrl}/login`} className="inst-cta primary" style={{ backgroundColor: primaryColor }}>
              <LogIn size={20} /> Login to Portal
            </a>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="inst-footer">
        <div className="inst-footer-inner">
          <div className="inst-footer-brand" suppressHydrationWarning>
            {tenant.logo ? (
              <img src={tenant.logo} alt={tenant.name} style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '4px' }} suppressHydrationWarning />
            ) : (
              <LogoAvatar name={tenant.name} size={28} />
            )}
            <span>{tenant.name}</span>
          </div>
          <p className="inst-footer-copy">
            &copy; {new Date().getFullYear()} {tenant.name} &middot; Powered by <a href="https://institute1-seven.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}><strong>{companyName}</strong></a>
          </p>
        </div>
      </footer>
    </div>
  );
}
