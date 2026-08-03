import React from 'react';

// ISR: Serve from CDN cache, revalidate every hour.
// The landing page Supabase call (company_name, tagline) runs at build/revalidation only — not per-request.
export const revalidate = 3600;

import Link from 'next/link';
import Image from 'next/image';
import InstallAppButton from '@/components/pwa/InstallAppButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GraduationCap, User, Building, Trophy, ArrowRight, Star } from 'lucide-react';
import ExploreMoreWrapper from './components/ExploreMoreWrapper';
import './Landing.css';
import { createClient } from '@/lib/supabase/server';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from('company_settings').select('company_name, tagline').maybeSingle();
  const companyName = settings?.company_name || 'Smart Learning';
  const tagline = settings?.tagline || 'Smart Hybrid Learning & Student Engagement Platform';

  return (
    <div className="landing-container">
      {/* Navigation */}
      <header className="landing-nav">
        <div className="landing-logo" style={{ display: 'flex', alignItems: 'center', padding: '0', margin: '0', background: 'transparent' }}>
          <Image 
            src="/images/smart_learning%20logo.png" 
            alt="Company Logo" 
            width={40} 
            height={40} 
            style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' }}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        </div>
        <div className="landing-nav-actions">
          <ThemeToggle />
          <InstallAppButton variant="ghost" className="nav-install-btn" />
          <Link href="/login">
            <button className="btn-human-ghost">Login</button>
          </Link>
          <Link href="/signup">
            <button className="btn-human">Sign Up</button>
          </Link>
        </div>
      </header>

      <main className="landing-main">
        {/* Hero Section — Split Layout */}
        <section className="hero-section">
          <div className="hero-bg-glows">
            <div className="hero-bg-grid"></div>
            <div className="glow-blob-1"></div>
            <div className="glow-blob-2"></div>
          </div>

          <div className="hero-split">
            {/* Left — Text */}
            <div className="hero-text">

              <div className="hero-badge animate-fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 12px', fontSize: '0.85rem' }}>
                <Star size={14} fill="currentColor" /> A Smarter Way to Learn, Teach & Grow
              </div>

              <h1 className="hero-title animate-fade-up delay-100" style={{ marginTop: '1rem' }}>
                <span style={{ color: 'var(--text-primary)' }}>Smart Learning</span><br />
                <span className="text-gradient-human">Better Future</span>
              </h1>
              <p className="hero-subtitle animate-fade-up delay-200">
                {tagline}
              </p>

              <div className="hero-cta animate-fade-up delay-300">
                <Link href="/signup">
                  <button className="btn-human cta-btn-lg">
                    Get Started
                    <ArrowRight size={20} style={{ marginLeft: '8px' }} />
                  </button>
                </Link>
                <Link href="#features">
                  <button className="btn-human-ghost cta-btn-lg" style={{ borderRadius: '9999px', border: '1px solid var(--border-strong)' }}>Explore</button>
                </Link>
              </div>
            </div>

            {/* Right — Hero Image */}
            <div className="hero-image animate-fade-up delay-200">
              <div className="hero-image-glow"></div>
              <Image
                src="/images/hero_img.png"
                alt="Smart Learning Hero Image"
                width={800}
                height={600}
                priority
                style={{ width: '135%', height: 'auto', objectFit: 'contain', pointerEvents: 'none' }}
              />
            </div>
          </div>

          {/* Hero Bottom Bar */}
          <div className="hero-bottom-bar animate-fade-up delay-400" style={{ zIndex: 0, position: 'relative' }}>
            <div className="h-feature">
              <div className="h-feature-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                <GraduationCap size={24} />
              </div>
              <div className="h-feature-text">
                <h4>For Students</h4>
                <p>Access quality content, track progress and achieve goals.</p>
              </div>
            </div>
            <div className="h-feature">
              <div className="h-feature-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                <User size={24} />
              </div>
              <div className="h-feature-text">
                <h4>For Instructors</h4>
                <p>Create courses, manage students and stay organized.</p>
              </div>
            </div>
            <div className="h-feature">
              <div className="h-feature-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
                <Building size={24} />
              </div>
              <div className="h-feature-text">
                <h4>For Institutions</h4>
                <p>Manage entire academy and operations flawlessly.</p>
              </div>
            </div>
            <div className="h-feature">
              <div className="h-feature-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                <Trophy size={24} />
              </div>
              <div className="h-feature-text">
                <h4>Gamified Learning</h4>
                <p>Earn virtual badges and climb the leader board.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <ExploreMoreWrapper companyName={companyName} />
    </div>
  );
}
