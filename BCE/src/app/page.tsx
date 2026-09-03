import React from 'react';

// ISR: Serve from CDN cache, revalidate every hour.
// The landing page Supabase call (company_name, tagline) runs at build/revalidation only — not per-request.
export const revalidate = 60;

import Link from 'next/link';
import Image from 'next/image';
import InstallAppButton from '@/components/pwa/InstallAppButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowRight, Star } from 'lucide-react';
import dynamic from 'next/dynamic';
import AutoScrollMarquee from '@/components/ui/AutoScrollMarquee';
import ExploreMoreWrapper from './components/ExploreMoreWrapper';
import LandingCoursePreview from './components/LandingCoursePreview';
import LandingDSAPreview from './components/LandingDSAPreview';
import './Landing.css';
import { createClient } from '@/lib/supabase/server';

const GallerySection = dynamic(() => import('./components/GallerySection'));

export default async function LandingPage() {
  const supabase = await createClient();
  const [{ data: settings }, { data: hero }, { data: coreFeatures }, { data: galleryItems }] = await Promise.all([
    supabase.from('company_settings').select('company_name, tagline, logo_url').maybeSingle(),
    supabase.from('landing_content').select('*').eq('id', 'default').maybeSingle(),
    supabase.from('landing_core_features').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('landing_gallery').select('id, image_url, title, description, sort_order').eq('is_active', true).order('sort_order', { ascending: true }),
  ]);
  const companyName = settings?.company_name || hero?.hero_heading || '';
  const tagline = settings?.tagline || '';

  const logoUrl = settings?.logo_url;
  const isRemoteLogo = !!(logoUrl && (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')));

  const heroImageUrl = hero?.hero_image_url || '/images/hero_img.png';
  const isRemoteHero = !!(heroImageUrl && (heroImageUrl.startsWith('http://') || heroImageUrl.startsWith('https://')));

  return (
    <div className="landing-container">
      {/* Navigation */}
      <header className="landing-nav">
        <div className="landing-logo" style={{ display: 'flex', alignItems: 'center', padding: '0', margin: '0', background: 'transparent' }}>
          {logoUrl && (
            <Image 
              src={logoUrl} 
              alt={`${companyName} logo`} 
              width={40} 
              height={40}
              unoptimized={isRemoteLogo}
              style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' }} 
            />
          )}
        </div>
        <div className="landing-nav-actions">
          <ThemeToggle />
          <InstallAppButton variant="ghost" className="nav-install-btn" />
          <Link href="/login" className="btn-human-ghost" style={{ textDecoration: 'none' }}>
            Login
          </Link>
          <Link href="/signup" className="btn-human" style={{ textDecoration: 'none' }}>
            Sign Up
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

              {hero?.hero_badge && (
                <div className="hero-badge animate-fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 12px', fontSize: '0.85rem' }}>
                  <Star size={14} fill="currentColor" /> {hero.hero_badge}
                </div>
              )}

              <h1 className="hero-title animate-fade-up delay-100" style={{ marginTop: '1rem', fontSize: '4rem' }}>
                <span style={{ color: 'var(--text-primary)' }}>{hero?.hero_heading || companyName}</span>
                {hero?.hero_highlight && (
                  <>
                    <br />
                    <span className="text-gradient-human" style={{ fontSize: '2.5rem' }}>{hero.hero_highlight}</span>
                  </>
                )}
              </h1>
              <p className="hero-subtitle animate-fade-up delay-200" style={{ fontSize: '1rem' }}>
                {hero?.hero_description || tagline}
              </p>

              <div className="hero-cta animate-fade-up delay-300">
                {hero?.hero_cta_text && (
                  <Link href={hero.hero_cta_link || '/signup'} className="btn-human cta-btn-lg" style={{ textDecoration: 'none' }}>
                    {hero.hero_cta_text}
                    <ArrowRight size={20} style={{ marginLeft: '8px' }} />
                  </Link>
                )}
                {hero?.hero_cta_text_2 && (
                  <Link href={hero.hero_cta_link_2 || '/courses'} className="btn-human-ghost cta-btn-secondary" style={{ textDecoration: 'none' }}>
                    {hero.hero_cta_text_2}
                  </Link>
                )}
              </div>
            </div>

            {/* Right — Hero Image */}
            {heroImageUrl && (
              <div className="hero-image animate-fade-up delay-200">
                <div className="hero-image-glow"></div>
                <Image
                  src={heroImageUrl}
                  alt={`${companyName} hero`}
                  width={800}
                  height={600}
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  unoptimized={isRemoteHero}
                  style={{ width: '135%', height: 'auto', objectFit: 'contain', pointerEvents: 'none' }}
                />
              </div>
            )}
          </div>
        </section>

        {/* Public Previews */}
        <LandingCoursePreview />
        <LandingDSAPreview />
      </main>

      <ExploreMoreWrapper>
        <main className="landing-main" style={{ minHeight: 'auto' }}>
          {/* Gallery Section — Dynamic + Manual with Show More */}
          <GallerySection items={galleryItems || []} />

          {/* Features Grid */}
          {coreFeatures && coreFeatures.length > 0 && (
            <section id="features" className="features-section">
              <AutoScrollMarquee className="features-marquee-wrapper" innerClassName="features-keyword-grid">
                {(coreFeatures?.length ? coreFeatures : [{ id: 'fallback', title: 'Approval System', description: '', icon: 'UserCheck' }]).map((feature: any) => {
                  const isRemoteFeatureImg = !!(feature.image_url && (feature.image_url.startsWith('http://') || feature.image_url.startsWith('https://')));
                  return (
                    <div className="feature-card" key={feature.id}>
                      <div className="feature-icon-wrapper">
                        {feature.image_url ? (
                          <Image 
                            src={feature.image_url} 
                            alt={feature.title || 'Feature icon'} 
                            width={32} 
                            height={32} 
                            unoptimized={isRemoteFeatureImg}
                            style={{ objectFit: 'contain' }} 
                          />
                        ) : (
                          <Star size={32} strokeWidth={1.5} />
                        )}
                      </div>
                      <h3>{feature.title}</h3>
                      {feature.description && <p>{feature.description}</p>}
                    </div>
                  );
                })}
              </AutoScrollMarquee>
            </section>
          )}
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
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" style={{ color: 'var(--text-muted)' }}>Twitter</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={{ color: 'var(--text-muted)' }}>LinkedIn</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub" style={{ color: 'var(--text-muted)' }}>GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
