import React from 'react';
import Link from 'next/link';
import InstallAppButton from '@/components/pwa/InstallAppButton';
import './Landing.css';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const supabase = await createClient();
  const [
    { data: { user } },
    { data: settings }
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('company_settings').select('company_name').maybeSingle()
  ]);
  const companyName = settings?.company_name || 'Smart Learning';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'instructor' && profile?.status !== 'active') {
      redirect('/apply-instructor');
    } else if (profile?.role === 'instructor') {
      redirect('/instructor');
    } else if (profile?.role === 'admin') {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  }

  return (
    <div className="landing-container">
      {/* Navigation */}
      <header className="landing-nav animate-fade-up">
        <div className="landing-logo">
          <span className="logo-text">Smart Learning</span>
        </div>
        <div className="landing-nav-actions">
          <InstallAppButton variant="ghost" className="nav-install-btn" />
          <Link href="/login">
            <button className="btn-human-ghost">Login</button>
          </Link>
          <Link href="/signup">
            <button className="btn-human">Start</button>
          </Link>
        </div>
      </header>

      <main className="landing-main">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-bg-glows">
            <div className="glow-blob-1"></div>
            <div className="glow-blob-2"></div>
          </div>
          <div className="hero-content animate-fade-up delay-100">
            <span className="hero-college-name">{companyName}</span>
            <span className="hero-badge">New: Real-Time Doubt Resolution</span>
            <h1 className="hero-title">
              Engage Students with <br/>
              <span className="text-gradient-human">Hybrid Classrooms</span>
            </h1>
            <p className="hero-subtitle">
              Transform traditional classrooms into intelligent, data-driven learning environments. Track progress, resolve doubts in real-time, and make learning an engaging experience for everyone.
            </p>
            <div className="hero-cta">
              <Link href="/signup">
                <button className="btn-human cta-btn-lg">Start Learning</button>
              </Link>
              <Link href="#features">
                <button className="btn-human-ghost cta-btn-lg">See How It Works</button>
              </Link>
            </div>
          </div>
        </section>

        {/* Workflow Section (How it works) */}
        <section className="workflow-section" style={{ padding: 'var(--space-4xl) var(--space-lg)', position: 'relative' }}>
          <h2 className="section-title">How It Transforms Your Campus</h2>
          <div className="infographics-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4xl)', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
            <div className="infographic-wrapper animate-fade-up delay-100">
              <img src="/student%20benifit.png" alt="Student Benefits" style={{ width: '100%', height: 'auto', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)' }} />
            </div>
            
            <div className="infographic-wrapper animate-fade-up delay-200">
              <img src="/faculty%20and%20hod.png" alt="Faculty and HOD Benefits" style={{ width: '100%', height: 'auto', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)' }} />
            </div>
          </div>
        </section>
        
        {/* Features Grid */}
        <section id="features" className="features-section animate-fade-up delay-200">
          <span className="section-tag">Core Features</span>
          <h2 className="section-title">Everything You Need to Succeed</h2>
          
          <div className="features-keyword-grid">
            <div className="keyword-card">
              <span className="keyword-icon">🎮</span> Gamified Learning
            </div>
            
            <div className="keyword-card">
              <span className="keyword-icon">📈</span> Real-Time Analytics
            </div>
            
            <div className="keyword-card">
              <span className="keyword-icon">📝</span> Smart Assignments
            </div>
            
            <div className="keyword-card">
              <span className="keyword-icon">💬</span> 24/7 Doubt Resolution
            </div>

            <div className="keyword-card">
              <span className="keyword-icon">🏆</span> Global Leaderboards
            </div>

            <div className="keyword-card">
              <span className="keyword-icon">🎓</span> Hybrid Classrooms
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="cta-section animate-fade-up">
          <div className="cta-box">
            <h2>Ready to transform your learning experience?</h2>
            <p>Join thousands of students and educators already using Smart Learning to bridge the gap in education.</p>
            <Link href="/signup">
              <button className="btn-human cta-btn-lg" style={{ marginTop: '1rem' }}>Get Started Today</button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="landing-logo">
              <span className="logo-text">Smart Learning</span>
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
    </div>
  );
}
