'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, BookOpen, ShieldCheck, Users, 
  ArrowRight, Menu, X, LogIn
} from 'lucide-react';
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
  routingMode = 'subpath' 
}: { 
  tenant: Tenant;
  routingMode?: 'domain' | 'subpath' | 'development';
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
          <Link href="/" className="inst-brand">
            <LogoAvatar name={tenant.name} size={36} />
            <span className="inst-brand-name">{tenant.name}</span>
          </Link>

          <div className="inst-nav-actions desktop-only">
            <a href={`${baseUrl}/login`} className="inst-nav-btn outline">
              <LogIn size={18} /> Login
            </a>
          </div>

          <button className="inst-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="inst-mobile-dropdown">
            <a href={`${baseUrl}/login`} onClick={() => setMobileMenuOpen(false)}>
              <LogIn size={18} /> Login
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

      {/* Portal Cards */}
      <section className="inst-portals">
        <h2 className="inst-section-title">Access Your Portal</h2>
        <p className="inst-section-sub">Select your role to continue to the dashboard.</p>
        <div className="inst-portal-grid">
          <a href={`${baseUrl}/login?role=student`} className="inst-portal-card">
            <div className="inst-portal-icon" style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}>
              <Users size={28} />
            </div>
            <h3>Student Portal</h3>
            <p>View courses, attendance, assignments, doubts, and results.</p>
            <span className="inst-portal-go" style={{ color: primaryColor }}>
              Open <ArrowRight size={16} />
            </span>
          </a>

          <a href={`${baseUrl}/login?role=instructor`} className="inst-portal-card">
            <div className="inst-portal-icon" style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}>
              <BookOpen size={28} />
            </div>
            <h3>Faculty Portal</h3>
            <p>Manage classes, mark attendance, grade assignments, and share content.</p>
            <span className="inst-portal-go" style={{ color: primaryColor }}>
              Open <ArrowRight size={16} />
            </span>
          </a>

          <a href={`${baseUrl}/login?role=admin`} className="inst-portal-card">
            <div className="inst-portal-icon" style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}>
              <ShieldCheck size={28} />
            </div>
            <h3>Admin Dashboard</h3>
            <p>Monitor analytics, manage users, courses, and institution settings.</p>
            <span className="inst-portal-go" style={{ color: primaryColor }}>
              Open <ArrowRight size={16} />
            </span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="inst-footer">
        <div className="inst-footer-inner">
          <div className="inst-footer-brand">
            <LogoAvatar name={tenant.name} size={28} />
            <span>{tenant.name}</span>
          </div>
          <p className="inst-footer-copy">
            &copy; {new Date().getFullYear()} {tenant.name} &middot; Powered by <strong>Smart Learn AI</strong>
          </p>
        </div>
      </footer>
    </div>
  );
}
