import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Tenant } from '@/lib/tenant';
import { GraduationCap, User, Building, ArrowRight, CheckCircle, Mail, Phone, MapPin, Globe } from 'lucide-react';
import '@/app/Landing.css';

interface InstitutionLandingProps {
  tenant: Tenant;
}

export default function InstitutionLanding({ tenant }: InstitutionLandingProps) {
  return (
    <div className="landing-container" style={{
      '--neon-purple': tenant.primaryColor || '#4F46E5',
      '--neon-cyan': tenant.secondaryColor || '#06B6D4'
    } as React.CSSProperties}>
      {/* Dynamic Header */}
      <header className="landing-nav" style={{ justifyContent: 'space-between', padding: '1rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {tenant.logo ? (
            <Image 
              src={tenant.logo} 
              alt={tenant.name} 
              width={44} 
              height={44} 
              style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '8px' }}
              unoptimized
            />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: '8px', background: tenant.primaryColor || '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>
              {tenant.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            {tenant.name}
          </span>
        </div>

        <div className="landing-nav-actions">
          <Link href="/login">
            <button className="btn-human-ghost">Student Login</button>
          </Link>
          <Link href="/login?role=instructor">
            <button className="btn-human-ghost">Faculty Login</button>
          </Link>
          <Link href="/login?role=admin">
            <button className="btn-human" style={{ background: tenant.primaryColor || '#4F46E5' }}>Admin Portal</button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="landing-main">
        <section className="hero-section" style={{ minHeight: 'auto', padding: '4rem 2rem' }}>
          <div className="hero-split">
            <div className="hero-text" style={{ flex: 1 }}>
              <div className="hero-badge" style={{ backgroundColor: 'rgba(79, 70, 229, 0.15)', color: tenant.primaryColor || '#4F46E5', padding: '6px 14px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <Building size={16} /> Official Academy Portal
              </div>
              <h1 className="hero-title" style={{ fontSize: '2.8rem', lineHeight: 1.2 }}>
                Welcome to <br />
                <span style={{ color: tenant.primaryColor || '#4F46E5' }}>{tenant.name}</span>
              </h1>
              <p className="hero-subtitle" style={{ fontSize: '1.1rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
                {tenant.description || `Explore digital learning, courses, assignments, and campus updates for ${tenant.name}.`}
              </p>

              <div className="hero-cta" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <Link href="/login">
                  <button className="btn-human cta-btn-lg" style={{ background: tenant.primaryColor || '#4F46E5' }}>
                    Access Student Dashboard <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                  </button>
                </Link>
                <Link href="/signup">
                  <button className="btn-human-ghost cta-btn-lg">New Registration</button>
                </Link>
              </div>
            </div>

            {tenant.coverImage && (
              <div className="hero-image" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <Image 
                  src={tenant.coverImage} 
                  alt={tenant.name} 
                  width={600} 
                  height={400} 
                  style={{ width: '100%', maxHeight: '350px', objectFit: 'cover', borderRadius: '16px' }}
                  unoptimized
                />
              </div>
            )}
          </div>

          {/* Quick Statistics Bar */}
          <div className="hero-bottom-bar" style={{ marginTop: '3rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="h-feature">
              <div className="h-feature-icon" style={{ background: 'rgba(79, 70, 229, 0.15)', color: tenant.primaryColor || '#4F46E5' }}>
                <GraduationCap size={24} />
              </div>
              <div className="h-feature-text">
                <h4>Digital LMS</h4>
                <p>24/7 Access to Courseware</p>
              </div>
            </div>
            <div className="h-feature">
              <div className="h-feature-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: tenant.secondaryColor || '#06B6D4' }}>
                <User size={24} />
              </div>
              <div className="h-feature-text">
                <h4>Faculty Network</h4>
                <p>Interactive Guidance & Doubts</p>
              </div>
            </div>
            <div className="h-feature">
              <div className="h-feature-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
                <CheckCircle size={24} />
              </div>
              <div className="h-feature-text">
                <h4>Verified Badges</h4>
                <p>Instant Academic Certifications</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact & Address Footer Section */}
        <footer className="landing-footer" style={{ borderTop: '1px solid var(--border-color)', marginTop: '4rem', padding: '3rem 2rem' }}>
          <div className="footer-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            <div>
              <h3>{tenant.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Powered by Smart Learn AI Enterprise SaaS Platform.
              </p>
            </div>
            <div>
              <h4>Contact Information</h4>
              {tenant.contactEmail && <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}><Mail size={14} /> {tenant.contactEmail}</p>}
              {tenant.contactPhone && <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}><Phone size={14} /> {tenant.contactPhone}</p>}
              {tenant.address && <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}><MapPin size={14} /> {tenant.address}</p>}
              {tenant.website && <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}><Globe size={14} /> <a href={tenant.website} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{tenant.website}</a></p>}
            </div>
            <div>
              <h4>Quick Links</h4>
              <p><Link href="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Student Login</Link></p>
              <p><Link href="/login?role=instructor" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Faculty Portal</Link></p>
              <p><Link href="/login?role=admin" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Admin Login</Link></p>
            </div>
          </div>
          <div className="footer-bottom" style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            &copy; {new Date().getFullYear()} {tenant.name}. All rights reserved.
          </div>
        </footer>
      </main>
    </div>
  );
}
