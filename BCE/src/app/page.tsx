import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import InstallAppButton from '@/components/pwa/InstallAppButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserCheck, MessageSquare, BarChart2, Timer, Terminal, BellRing, CheckCircle2, GraduationCap, User, Building, Trophy, ArrowRight, Star } from 'lucide-react';
import AutoScrollMarquee from '@/components/ui/AutoScrollMarquee';
import ExploreMoreWrapper from './components/ExploreMoreWrapper';
import GallerySection from './components/GallerySection';
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
            style={{ objectFit: 'contain', borderRadius: '8px', width: 'auto', height: 'auto' }}
            unoptimized
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
                Smart Learning is an all-in-one platform for students, instructors, and institutions to learn, collaborate, and achieve more together.
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
                unoptimized
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

      <ExploreMoreWrapper>
        <main className="landing-main" style={{ minHeight: 'auto' }}>
          {/* Gallery Section — Dynamic + Manual with Show More */}
          <GallerySection />

        {/* Features Grid */}
        <section id="features" className="features-section">
          <span className="section-tag">Core Features</span>
          <h2 className="section-title">Everything You Need to Succeed</h2>

          <AutoScrollMarquee className="features-marquee-wrapper" innerClassName="features-keyword-grid">
                {/* 1. Approval System */}
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <UserCheck size={32} strokeWidth={1.5} />
                  </div>
                  <h3>Approval System</h3>
                </div>

                {/* 2. Batch Specific Doubt System */}
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <MessageSquare size={32} strokeWidth={1.5} />
                  </div>
                  <h3>Batch Doubts</h3>
                </div>

                {/* 3. Poll System */}
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <BarChart2 size={32} strokeWidth={1.5} />
                  </div>
                  <h3>Live Poll System</h3>
                </div>

                {/* 4. One Click Assessment */}
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <Timer size={32} strokeWidth={1.5} />
                  </div>
                  <h3>1-Click Assessment</h3>
                </div>

                {/* 5. Coding Profile */}
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <Terminal size={32} strokeWidth={1.5} />
                  </div>
                  <h3>Coding Profile</h3>
                </div>

                {/* 6. Emergency Alert System */}
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <BellRing size={32} strokeWidth={1.5} />
                  </div>
                  <h3>Emergency Alerts</h3>
                </div>

                {/* Duplicated for smooth infinite scroll on mobile */}
                <div className="feature-card mobile-dup">
                  <div className="feature-icon-wrapper">
                    <UserCheck size={32} strokeWidth={1.5} />
                  </div>
                  <h3>Approval System</h3>
                </div>
                <div className="feature-card mobile-dup">
                  <div className="feature-icon-wrapper">
                    <MessageSquare size={32} strokeWidth={1.5} />
                  </div>
                  <h3>Batch Doubts</h3>
                </div>
                <div className="feature-card mobile-dup">
                  <div className="feature-icon-wrapper">
                    <BarChart2 size={32} strokeWidth={1.5} />
                  </div>
                  <h3>Live Poll System</h3>
                </div>
                <div className="feature-card mobile-dup">
                  <div className="feature-icon-wrapper">
                    <Timer size={32} strokeWidth={1.5} />
                  </div>
                  <h3>1-Click Assessment</h3>
                </div>
                <div className="feature-card mobile-dup">
                  <div className="feature-icon-wrapper">
                    <Terminal size={32} strokeWidth={1.5} />
                  </div>
                  <h3>Coding Profile</h3>
                </div>
                <div className="feature-card mobile-dup">
                  <div className="feature-icon-wrapper">
                    <BellRing size={32} strokeWidth={1.5} />
                  </div>
                  <h3>Emergency Alerts</h3>
                </div>
          </AutoScrollMarquee>
        </section>


      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="landing-logo">
              <span className="logo-text">{companyName}</span>
            </div>
            <p className="footer-desc">
              Bridging the gap between online and offline education. Created by Aditya.
            </p>
          </div>
          <div className="footer-links">
            <div className="link-group">
              <h4>Platform</h4>
              <Link href="/courses">Courses</Link>
              <Link href="/leaderboard">Leaderboard</Link>
              <Link href="/login">Student Login</Link>
              <Link href="/apply-instructor">Faculty Apply</Link>
            </div>
            <div className="link-group">
              <h4>Connect</h4>
              <a href="https://portfolio-two-ashen-zseywond41.vercel.app/" target="_blank" rel="noopener noreferrer">Meet Developer</a>
              <a href="mailto:iambestadi@gmail.com">Contact Support</a>
            </div>
            <div className="link-group">
              <h4>Legal</h4>
              <Link href="#">Terms of Service</Link>
              <Link href="#">Privacy Policy</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} {companyName}. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <a href="#" style={{ color: 'var(--text-muted)' }}>Twitter</a>
            <a href="#" style={{ color: 'var(--text-muted)' }}>LinkedIn</a>
            <a href="#" style={{ color: 'var(--text-muted)' }}>GitHub</a>
          </div>
        </div>
      </footer>
      </ExploreMoreWrapper>
    </div>
  );
}
