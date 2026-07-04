import React from 'react';
import Link from 'next/link';
import InstallAppButton from '@/components/pwa/InstallAppButton';
import './Landing.css';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

        {/* Features Grid */}
        <section id="features" className="features-section animate-fade-up delay-200">
          <span className="section-tag">Core Features</span>
          <h2 className="section-title">Everything You Need to Succeed</h2>
          <p className="section-desc">
            Whether you are a faculty member tracking student performance or a student catching up on lectures, our platform bridges the gap.
          </p>
          
          <div className="features-grid">
            <div className="feature-card">
              <h3 className="feature-title">Student Engagement</h3>
              <p className="feature-desc">
                Gamified learning paths motivate students to participate actively. Earn XP and unlock achievements as you progress.
              </p>
            </div>
            
            <div className="feature-card">
              <h3 className="feature-title">Real-Time Progress</h3>
              <p className="feature-desc">
                Teachers get instant insights into student performance. Identify struggling students early and provide targeted help.
              </p>
            </div>
            
            <div className="feature-card">
              <h3 className="feature-title">Smart Assignments</h3>
              <p className="feature-desc">
                Assign tasks, track submissions, and verify results with a single click. Save hours of administrative work.
              </p>
            </div>
            
            <div className="feature-card">
              <h3 className="feature-title">Instant Doubt Resolution</h3>
              <p className="feature-desc">
                Students can ask doubts 24/7. Peer-to-peer and faculty answers keep the learning flowing outside classroom hours.
              </p>
            </div>
          </div>
        </section>

        {/* Workflow Section (How it works) */}
        <section className="workflow-section">
          <div className="workflow-container">
            <div className="workflow-step animate-fade-up">
              <div className="workflow-content">
                <div className="workflow-number">01</div>
                <h3>Catch up easily, anytime</h3>
                <p>
                  Missed a class? No problem. Access learning content, video lectures, and study materials online before or after offline classes to stay ahead of the curve.
                </p>
              </div>
            </div>

            <div className="workflow-step animate-fade-up">
              <div className="workflow-content">
                <div className="workflow-number">02</div>
                <h3>Gamified Competition</h3>
                <p>
                  Learning shouldn't be boring. Compete on batch-specific and institute-wide leaderboards. Earn badges, gain XP, and establish your dominance.
                </p>
              </div>
            </div>

            <div className="workflow-step animate-fade-up">
              <div className="workflow-content">
                <div className="workflow-number">03</div>
                <h3>Seamless Faculty Control</h3>
                <p>
                  Instructors can effortlessly manage enrollments, curate courses, and review submissions. The dashboard provides a bird's-eye view of class health.
                </p>
              </div>
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
          <p>&copy; {new Date().getFullYear()} Smart Hybrid Learning platform. All rights reserved.</p>
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
