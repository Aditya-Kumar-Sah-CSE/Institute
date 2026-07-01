import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
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
      <header className="landing-nav">
        <div className="landing-logo">
          <span className="logo-icon">🏛️</span>
          <span className="logo-text">Smart Learning</span>
        </div>
        <div className="landing-nav-actions">
          <InstallAppButton variant="ghost" />
          <Link href="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="landing-main">
        <section className="hero-section">
          <div className="hero-bg-glow"></div>
          <div className="hero-content">
            <h1 className="hero-title">Student 
              <span className="text-gradient"> Engagement Platform</span>
            </h1>
            <p className="hero-subtitle">
              To transform traditional classrooms into intelligent, data-driven learning environments where every student
receives continuous guidance, every teacher gains actionable insights, and every institute can deliver a
more engaging and effective educational experience.
            </p>
            <div className="hero-cta">
              <Link href="/signup">
                <Button variant="primary" size="lg" className="cta-btn">Start Learning</Button>
              </Link>
            </div>
            {/* <div className="hero-stats stagger-children">
              <div className="stat-card">
                <span className="stat-number text-gradient">10k+</span>
                <span className="stat-label">Active Learners</span>
              </div>
              <div className="stat-card">
                <span className="stat-number text-gradient">50+</span>
                <span className="stat-label">Interactive Courses</span>
              </div>
              <div className="stat-card">
                <span className="stat-number text-gradient">Real</span>
                <span className="stat-label">Dev Workflow</span>
              </div>
            </div> */}
                      <div className="feature-card glass-card">
              <div className="feature-icon">😣</div>
              <h3 className="feature-title">Communication gap between faculty and students </h3>
              <p className="feature-desc"><br/>Helps identify struggling students early.
Creates a modern hybrid education system combining online and offline learning.
Vision</p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <h2 className="section-title">Problem & Solutions</h2>
          <div className="features-grid">
            <div className="feature-card glass-card">
              <div className="feature-icon">😒</div>
              <h3 className="feature-title">Student Engagement</h3>
              <p className="feature-desc">Lack of motivation and participation in traditional classrooms.</p>
            </div>
            <div className="feature-card glass-card">
              <div className="feature-icon">📈</div>
              <h3 className="feature-title"> individual progress.
</h3>
              <p className="feature-desc">
                Teachers struggle to track individual progress.<br></br>
                Track student participation and performance.<br></br>
</p>
            </div>
            <div className="feature-card glass-card">
              <div className="feature-icon">📒</div>
              <h3 className="feature-title"> Assignment management becomes time-consuming.

</h3>
              <p className="feature-desc">
                Assign tasks and assignments.<br></br>
                Verify student submissions with a single click<br></br>
</p>
            </div>
            <div className="feature-card glass-card">
              <div className="feature-icon">😓</div>
              <h3 className="feature-title"> Students who miss classes face learning gaps.

</h3>
              <p className="feature-desc">
               Access learning content before attending offline classes.
Prepare in advance using videos and study materials<br></br>
                Catch up easily if they miss any offline classes<br></br>
</p>
            </div>



            <div className="feature-card glass-card">
              <div className="feature-icon">🎮</div>
              <h3 className="feature-title">Gamified Learning</h3>
              <p className="feature-desc">Earn XP, unlock badges, and level up as you complete lessons and assignments.</p>
            </div>
            {/* <div className="feature-card glass-card">
              <div className="feature-icon">🐙</div>
              <h3 className="feature-title">GitHub Integration</h3>
              <p className="feature-desc">Push your code to GitHub. </p>
            </div> */}
            {/* <div className="feature-card glass-card">
              <div className="feature-icon">🚀</div>
              <h3 className="feature-title">Real Deployments</h3>
              <p className="feature-desc">Deploy your projects to Vercel or Netlify and submit the live URLs for massive XP rewards.</p>
            </div> */}
            <div className="feature-card glass-card">
              <div className="feature-icon">🏆</div>
              <h3 className="feature-title">Leaderboards</h3>
              <p className="feature-desc">Compete on institute-wide and batch-specific leaderboards</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="landing-logo">
              <span className="logo-icon">🏛️</span>
              <span className="logo-text">Smart Hybrid Learning</span>
            </div>
            <p className="footer-desc">Aditya's Hard Work !!❤️</p>
          </div>
          <div className="footer-links">
            <div className="link-group">
              <h4>Platform</h4>
              <Link href="/courses">Courses</Link>
              <Link href="/leaderboard">Leaderboard</Link>
            </div>
            <div className="link-group">
              <h4>Connect</h4>
              <Link href="https://portfolio-two-ashen-zseywond41.vercel.app/" target="_blank" rel="noopener noreferrer">Meet Developer</Link>
            </div>
            <div className="link-group">
              <h4>Legal</h4>
              <Link href="#">Terms of Service</Link>
              <Link href="#">Privacy Policy</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Smart Hybrid Learning  platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
