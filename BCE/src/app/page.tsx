import React from 'react';

// ISR: Revalidate cached landing shell & public previews every 60s without blocking on cookies()
export const revalidate = 60;

import Link from 'next/link';
import Image from 'next/image';
import InstallAppButton from '@/components/pwa/InstallAppButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowRight, BookOpen, Code2, Cpu, Layers } from 'lucide-react';
import dynamic from 'next/dynamic';
import ExploreMoreWrapper from './components/ExploreMoreWrapper';
import LandingCodingClub from './components/LandingCodingClub';
import LandingCoursePreview from './components/LandingCoursePreview';
import LandingDSAPreview from './components/LandingDSAPreview';
import LandingEventsSection from './components/LandingEventsSection';
import LandingFeaturesSection from './components/LandingFeaturesSection';
import { getClubShowcaseData, getLandingShellData, getPreviewCourses, getPreviewDSASheets } from './components/LandingPreviewActions';
import './Landing.css';

const GallerySection = dynamic(() => import('./components/GallerySection'));

export default async function LandingPage() {
  const [{ settings, hero, coreFeatures, galleryItems }, coursesRes, sheetsRes, clubData] = await Promise.all([
    getLandingShellData(),
    getPreviewCourses(0, 100, 'All Categories'),
    getPreviewDSASheets(0, 100),
    getClubShowcaseData(),
  ]);

  const companyName = settings?.company_name || hero?.hero_heading || 'Debuggerzz';
  const tagline = settings?.tagline || '';

  const logoUrl = settings?.logo_url;

  const heroImageUrl = hero?.hero_image_url || '/images/hero_img.png';

  const coursesCount = coursesRes.data?.length || 0;
  const sheetsList = sheetsRes.data || [];
  const sheetsCount = sheetsList.length;
  const totalProblemsCount = sheetsList.reduce((acc: number, sheet: any) => {
    const count =
      sheet.sheet_type === 'SQL'
        ? sheet.metadata?.total_count || 530
        : sheet.sheet_type === 'APTITUDE'
        ? sheet.metadata?.total_count || 1139
        : sheet.sheet_type === 'TCS_PREP'
        ? sheet.metadata?.total_count || 1427
        : sheet.sheet_type === 'ROADMAP'
        ? sheet.metadata?.total_count || 90
        : sheet.coding_sheet_problems?.length || 0;
    return acc + count;
  }, 0);

  return (
    <div id="top" className="landing-container">
      {/* Navigation */}
      <header className="landing-nav">
        <a href="#top" className="landing-logo">
          {logoUrl && (
            <Image 
              src={logoUrl} 
              alt={`${companyName} logo`} 
              width={38} 
              height={38}
              unoptimized
              style={{
                width: '38px',
                height: '38px',
                objectFit: 'cover',
                borderRadius: '9999px',
                border: '1.5px solid color-mix(in srgb, var(--human-primary) 35%, var(--border-default))',
              }} 
            />
          )}
          <span className="logo-text hide-on-mobile">{companyName}</span>
        </a>

        <nav className="landing-nav-links hide-on-mobile" aria-label="Primary Sections">
          <a href="#events" className="landing-nav-link">Events</a>
          <a href="#coding-club" className="landing-nav-link">Coding Club</a>
          <a href="#landing-courses" className="landing-nav-link">Courses</a>
          <a href="#landing-dsa" className="landing-nav-link">Practice Sheets</a>
          <a href="#features" className="landing-nav-link">Features</a>
        </nav>

        <div className="landing-nav-actions">
          <ThemeToggle />
          <InstallAppButton variant="ghost" className="nav-install-btn" />
          <Link href="/login" className="btn-human-ghost" style={{ textDecoration: 'none' }}>
            Login
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
                <div className="hero-badge animate-fade-up">
                  <span className="hero-badge-dot" aria-hidden="true"></span>
                  <span>{hero.hero_badge}</span>
                </div>
              )}

              <h1 className="hero-title animate-fade-up delay-100">
                <span style={{ color: 'var(--text-primary)' }}>{hero?.hero_heading || companyName}</span>
                {hero?.hero_highlight && (
                  <>
                    <br />
                    <span className="text-gradient-human" style={{ fontSize: '2.5rem' }}>{hero.hero_highlight}</span>
                  </>
                )}
              </h1>
              <p className="hero-subtitle animate-fade-up delay-200">
                {hero?.hero_description ||
                  tagline ||
                  'The official student-driven coding and tech community of Bhagalpur College of Engineering (BCE Bhagalpur) — master DSA, practice SQL & mocks, compete in coding battles, and grow together.'}
              </p>

              <div className="hero-cta animate-fade-up delay-300">
                {hero?.hero_cta_text && (
                  <Link href={hero.hero_cta_link || '/signup'} className="btn-human cta-btn-lg" style={{ textDecoration: 'none' }}>
                    <span>{hero.hero_cta_text}</span>
                    <ArrowRight size={20} style={{ marginLeft: '8px' }} />
                  </Link>
                )}
                {hero?.hero_cta_text_2 && (
                  <Link href={hero.hero_cta_link_2 || '/courses'} className="btn-human-ghost cta-btn-secondary" style={{ textDecoration: 'none' }}>
                    {hero.hero_cta_text_2}
                  </Link>
                )}
              </div>

              {/* Compact live metrics powered directly by cached data */}
              <div className="hero-metrics animate-fade-up delay-400">
                {coursesCount > 0 && (
                  <a href="#landing-courses" className="hero-metric-chip">
                    <BookOpen size={14} />
                    <strong>{coursesCount}+</strong> Courses
                  </a>
                )}
                {sheetsCount > 0 && (
                  <a href="#landing-dsa" className="hero-metric-chip">
                    <Layers size={14} />
                    <strong>{sheetsCount}+</strong> Prep Sheets
                  </a>
                )}
                {totalProblemsCount > 0 && (
                  <a href="#landing-dsa" className="hero-metric-chip">
                    <Code2 size={14} />
                    <strong>{totalProblemsCount.toLocaleString()}+</strong> Questions
                  </a>
                )}
                <span className="hero-metric-chip">
                  <Cpu size={14} /> Live Judge
                </span>
              </div>
            </div>

            {/* Right — Hero Image */}
            {heroImageUrl && (
              <div className="hero-image animate-fade-up delay-200">
                <div className="hero-image-glow"></div>
                <Image
                  src={heroImageUrl}
                  alt={`${companyName} workspace preview`}
                  width={800}
                  height={600}
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  unoptimized
                  className="hero-illustration"
                  style={{ width: '132%', height: 'auto', objectFit: 'contain' }}
                />
              </div>
            )}
          </div>
        </section>

        {/* Dynamic Club Events & Winners Showcase (just after Hero) */}
        <LandingEventsSection events={clubData.events} />

        {/* Coding Club Faculty Mentors & Student Coordinators */}
        <LandingCodingClub mentors={clubData.mentors} coordinators={clubData.coordinators} />

        {/* Public Previews */}
        <LandingCoursePreview />
        <LandingDSAPreview />

        {/* Dynamic Core Platform Features Grid & Marquee */}
        <LandingFeaturesSection features={coreFeatures || []} />
      </main>

      <div id="explore-platform">
        <ExploreMoreWrapper>
          <main className="landing-main" style={{ minHeight: 'auto' }}>
            {/* Gallery Section — Dynamic + Manual with Show More */}
            <GallerySection items={galleryItems || []} />
          </main>
        </ExploreMoreWrapper>
      </div>

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
