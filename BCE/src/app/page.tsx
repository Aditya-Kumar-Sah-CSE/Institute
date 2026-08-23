import React from 'react';

// ISR: Serve from CDN cache, revalidate every hour.
// The landing page Supabase call (company_name, tagline) runs at build/revalidation only — not per-request.
export const revalidate = 60;

import Link from 'next/link';
import Image from 'next/image';
import InstallAppButton from '@/components/pwa/InstallAppButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowRight, Star } from 'lucide-react';
import AutoScrollMarquee from '@/components/ui/AutoScrollMarquee';
import ExploreMoreWrapper from './components/ExploreMoreWrapper';
import GallerySection from './components/GallerySection';
import './Landing.css';
import { createClient } from '@/lib/supabase/server';

export default async function LandingPage() {
  const supabase = await createClient();
  const [{ data: settings }, { data: hero }, { data: coreFeatures }] = await Promise.all([
    supabase.from('company_settings').select('company_name, tagline, logo_url').maybeSingle(),
    supabase.from('landing_content').select('*').eq('id', 'default').maybeSingle(),
    supabase.from('landing_core_features').select('*').eq('is_active', true).order('sort_order'),
  ]);
  const companyName = settings?.company_name || hero?.hero_heading || '';
  const tagline = settings?.tagline || '';

  return (
    <div className="landing-container">
      {/* Navigation */}
      <header className="landing-nav">
        <div className="landing-logo" style={{ display: 'flex', alignItems: 'center', padding: '0', margin: '0', background: 'transparent' }}>
          {settings?.logo_url && <Image src={settings.logo_url} alt={`${companyName} logo`} width={40} height={40} style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' }} unoptimized />}
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

              {hero?.hero_badge && <div className="hero-badge animate-fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 12px', fontSize: '0.85rem' }}><Star size={14} fill="currentColor" /> {hero.hero_badge}</div>}

              <h1 className="hero-title animate-fade-up delay-100" style={{ marginTop: '1rem', fontSize: '4rem' }}>
                <span style={{ color: 'var(--text-primary)' }}>{hero?.hero_heading || companyName}</span>{hero?.hero_highlight && <><br /><span className="text-gradient-human" style={{ fontSize: '2.5rem' }}>{hero.hero_highlight}</span></>}
              </h1>
              <p className="hero-subtitle animate-fade-up delay-200" style={{ fontSize: '1rem' }}>
                {hero?.hero_description || tagline}
              </p>

              <div className="hero-cta animate-fade-up delay-300">
                {hero?.hero_cta_text && (
                  <Link href={hero.hero_cta_link || '/signup'}>
                    <button className="btn-human cta-btn-lg">
                      {hero.hero_cta_text}
                      <ArrowRight size={20} style={{ marginLeft: '8px' }} />
                    </button>
                  </Link>
                )}
                {hero?.hero_cta_text_2 && (
                  <Link href={hero.hero_cta_link_2 || '/courses'}>
                    <button className="btn-human-ghost cta-btn-secondary">
                      {hero.hero_cta_text_2}
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* Right — Hero Image */}
            {hero?.hero_image_url && <div className="hero-image animate-fade-up delay-200">
              <div className="hero-image-glow"></div>
              <Image
                src={hero?.hero_image_url || '/images/hero_img.png'}
                alt={`${companyName} hero`}
                width={800}
                height={600}
                priority
                style={{ width: '135%', height: 'auto', objectFit: 'contain', pointerEvents: 'none' }}
                unoptimized
              />
            </div>}
          </div>

          {/* Hero Bottom Bar */}
        </section>
      </main>

      <ExploreMoreWrapper>
        <main className="landing-main" style={{ minHeight: 'auto' }}>
          {/* Gallery Section — Dynamic + Manual with Show More */}
          <GallerySection />

        {/* Features Grid */}
        {coreFeatures && coreFeatures.length > 0 && <section id="features" className="features-section">
          <AutoScrollMarquee className="features-marquee-wrapper" innerClassName="features-keyword-grid">
                {(coreFeatures?.length ? coreFeatures : [{ id: 'fallback', title: 'Approval System', description: '', icon: 'UserCheck' }]).map((feature: any) => <div className="feature-card" key={feature.id}><div className="feature-icon-wrapper">{feature.image_url ? <Image src={feature.image_url} alt="" width={32} height={32} style={{ objectFit: 'contain' }} unoptimized /> : <Star size={32} strokeWidth={1.5} />}</div><h3>{feature.title}</h3>{feature.description && <p>{feature.description}</p>}</div>)}
          </AutoScrollMarquee>
        </section>}


      </main>
      </ExploreMoreWrapper>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="landing-logo">
              <span className="logo-text">{companyName}</span>
            </div>
            {tagline && <p className="footer-desc">{tagline}</p>}
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
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
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
    </div>
  );
}
