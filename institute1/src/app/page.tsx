import React from 'react';

// Removed ISR revalidate to prevent dynamic rewrite crash
// export const revalidate = 3600;

import Link from 'next/link';
import Image from 'next/image';
import InstallAppButton from '@/components/pwa/InstallAppButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  Building, GraduationCap, MonitorPlay, MessageSquare, 
  Settings, Users, Shield, BookOpen, Clock, 
  BarChart, FileText, ArrowRight, Star, Check, 
  Cloud, Palette, Award, Sparkles, Leaf, Server
} from 'lucide-react';
import AutoScrollMarquee from '@/components/ui/AutoScrollMarquee';
import ExploreMoreWrapper from './components/ExploreMoreWrapper';
import LandingNavbar from '@/components/landing/LandingNavbar';
import InstitutionLanding from '@/components/landing/InstitutionLanding';
import TypewriterEffect from '@/components/ui/TypewriterEffect';
import './Landing.css';
import './Pricing.css';
import '@/components/landing/InstitutionLanding.css';
import { createClient } from '@/lib/supabase/server';
import { getTenantConfig, generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';
import { redirect } from 'next/navigation';

export default async function LandingPage({
  searchParams,
}: {
  searchParams?: Promise<{ __tenant_slug?: string; __routing_mode?: string }>;
}) {
  const { tenant: headerTenant, routingMode: headerMode } = await getTenantConfig();

  // Fallback: middleware injects tenant as a hidden query param during path rewrites
  let tenant = headerTenant;
  let routingMode = headerMode;
  if (!tenant && searchParams) {
    const sp = await searchParams;
    if (sp?.__tenant_slug) {
      const { resolveTenantCache } = await import('@/lib/tenant/tenantCache');
      tenant = await resolveTenantCache(sp.__tenant_slug, sp.__routing_mode || 'development');
      routingMode = sp.__routing_mode || 'development';
    }
  }

  // If a tenant is viewing their root domain/route, render their custom landing page.
  if (tenant) {
    return <InstitutionLanding tenant={tenant} routingMode={routingMode as any} />;
  }

  const supabase = await createClient();
  const { data: settings } = await supabase.from('company_settings').select('*').single();
  const companyName = settings?.company_name || 'Smart Learning';
  const logoUrl = settings?.logo_url || '/images/smart_learning_logo.png';

  // Fetch dynamic plans for the Pricing section
  const { data: plansData } = await supabase
    .from('pricing_plans')
    .select('*')
    .eq('status', 'active')
    .order('monthly_price', { ascending: true });

  const activePlans = plansData || [];

  return (
    <div className="landing-container b2b-enterprise">
      {/* Navigation */}
      <LandingNavbar companyName={companyName} logoUrl={logoUrl} />

      <main className="landing-main">
        {/* HERO SECTION — B2B INST */}
        <section id="transform" className="hero-section" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingTop: '80px', background: 'var(--bg-default)' }}>
          <div className="hero-bg-glows">
            <div className="hero-bg-grid"></div>
            <div className="glow-blob-1" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 60%)' }}></div>
            <div className="glow-blob-2" style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 60%)' }}></div>
          </div>

          <div className="hero-split" style={{ alignItems: 'flex-start', paddingTop: '4vh' }}>
            {/* Left — Text */}
            <div className="hero-text" style={{ flex: '0 0 55%', maxWidth: '55%' }}>
              <div className="hero-badge animate-fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '6px 14px', fontSize: '0.85rem' }}>
                <Building size={14} fill="currentColor" /> Cloud Ecosystem for Educational Institutions
              </div>

              <h1 className="hero-title animate-fade-up delay-100" style={{ marginTop: '1.5rem', fontSize: 'clamp(3rem, 5vw, 4.5rem)', lineHeight: 1.1 }}>
                <span style={{ color: 'var(--text-primary)' }}>Transform Your</span><br />
                <TypewriterEffect 
                  words={['Institution Today', 'School Today', 'College Today', 'University Today', 'Coaching Center Today']} 
                  className="text-gradient-human" 
                  typingSpeed={80}
                  deletingSpeed={50}
                  delayBeforeDelete={2500}
                />
              </h1>
              
              <p className="hero-subtitle animate-fade-up delay-200" style={{ marginLeft: 0, marginTop: '2rem', maxWidth: '600px', fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
                Manage academics, assignments, attendance, AI learning, communication, analytics, and administration from a single unified cloud platform.
              </p>

              <div className="hero-cta animate-fade-up delay-300" style={{ justifyContent: 'flex-start', marginTop: '2.5rem' }}>
                <Link href="/apply-institution">
                  <button className="btn-human cta-btn-lg" style={{ padding: '1rem 2.5rem', boxShadow: '0 10px 40px -10px rgba(59, 130, 246, 0.6)' }}>
                    Register Your Institution
                    <ArrowRight size={20} style={{ marginLeft: '8px' }} />
                  </button>
                </Link>
                <Link href="/apply-institution">
                  <button className="btn-human-ghost cta-btn-lg" style={{ borderRadius: '16px', background: 'var(--bg-surface)' }}>Book a Demo</button>
                </Link>
              </div>
              {/* Trimmed obsolete UI elements */}
            </div>

            {/* Right — Dashboard Mockup */}
            <div className="hero-image animate-fade-up delay-200" style={{ flex: '0 0 45%', maxWidth: '45%' }}>
              <div className="hero-image-glow"></div>
              <div style={{ position: 'relative', width: '140%', marginLeft: '-20%', height: '450px' }}>
                <Image
                  src="/images/hero_img.png"
                  alt="Enterprise Dashboard Layout"
                  fill
                  style={{ objectFit: 'contain', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))' }}
                  unoptimized
                  priority
                />
              </div>
            </div>
          </div>
        </section>
        
        <div className="trusted-strip-wrapper" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '3rem 0', background: 'var(--bg-card)', textAlign: 'center', overflow: 'hidden' }}>
          <p className="trusted-strip-text" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '2px', fontWeight: 700, marginBottom: '2rem' }}>Built for modern</p>
          <AutoScrollMarquee className="features-marquee-wrapper" innerClassName="" style={{ display: 'flex', gap: '1.5rem', width: 'max-content', padding: '0 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <Building size={18} color="var(--text-muted)" /> <span style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>Schools</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <GraduationCap size={18} color="var(--text-muted)" /> <span style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>Colleges</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <Building size={18} color="var(--text-muted)" /> <span style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>Universities</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <Users size={18} color="var(--text-muted)" /> <span style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>Coaching Centers</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginRight: '1.5rem' }}>
              <MonitorPlay size={18} color="var(--text-muted)" /> <span style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>EdTech Orgs</span>
            </div>

          </AutoScrollMarquee>
        </div>



        {/* HOW IT WORKS */}
        <section id="how-it-works" style={{ padding: '1rem', background: 'var(--bg-card)' }}>
             <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>How It Works</span>
                  <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.75rem)', fontWeight: 800, margin: '0.5rem 0 1rem 0', color: 'var(--text-primary)' }}>Transform Your Campus</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 }}>
                    See how our platform empowers students, faculty, and administrators with powerful tools.
                  </p>
                </div>
                <input type="checkbox" id="mobile-steps-toggle" className="mobile-steps-toggle-cb" />
                <div className="steps-container-grid" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', flexWrap: 'wrap', gap: '2rem' }}>
                  <div style={{ position: 'absolute', top: '24px', left: 0, width: '100%', height: '2px', background: 'rgba(59, 130, 246, 0.2)', zIndex: 0, display: 'none' }} className="d-md-block"></div>
                  
                  {[
                    { num: 1, title: 'Register', desc: 'Secure your custom institution domain.' },
                    { num: 2, title: 'Approval', desc: 'SuperAdmin verifies your entity instantly.' },
                    { num: 3, title: 'Dashboard Ready', desc: 'Login to your white-labeled environment.' },
                    { num: 4, title: 'Invite Faculty', desc: 'Deploy staff accounts via secure links.' },
                    { num: 5, title: 'Onboard Students', desc: 'Students enroll in active classes.' },
                    { num: 6, title: 'Go Live', desc: 'Assignments, AI grading, and analytics activate.' }
                  ].map((step, idx) => (
                     <div key={step.num} className={`step-card ${idx >= 2 ? 'optional-step' : ''}`} style={{ flex: 1, minWidth: '150px', position: 'relative', zIndex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                       <div style={{ width: '48px', height: '48px', background: 'var(--bg-surface)', border: '2px solid #3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800, color: '#3b82f6', marginBottom: '1rem', boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)' }}>
                         {step.num}
                       </div>
                       <h4 style={{ fontWeight: 700, margin: '0 0 8px 0' }}>{step.title}</h4>
                       <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{step.desc}</p>
                     </div>
                  ))}
                </div>
                
                <div className="mobile-steps-toggle-wrapper">
                  <label htmlFor="mobile-steps-toggle" className="mobile-steps-toggle-label pricing-btn" style={{ width: 'auto', display: 'flex', marginTop: '2rem', padding: '0.6rem 1.5rem', height: 'auto', fontSize: '1rem', margin: '2rem auto 0', cursor: 'pointer' }}>See all steps</label>
                </div>
             </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="landing-section" style={{ background: 'var(--bg-default)', position: 'relative', zIndex: 1 }}>
           <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
               <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>Institution Pricing Plans</h2>
             </div>

            <div className="saas-pricing-grid">
              {activePlans.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', background: 'var(--bg-surface)', borderRadius: '1rem', border: '1px dashed var(--border)' }}>
                   <p style={{ color: 'var(--text-secondary)' }}>No active plans configured by the SuperAdmin yet.</p>
                </div>
              ) : activePlans.map((plan, i) => {
                const isPopular = i === 1; // Highlight the middle plan usually
                
                return (
                  <div key={plan.id} className={`premium-pricing-card ${isPopular ? 'popular' : ''}`}>
                    <div className="pricing-watermark"></div>
                    
                    <div className="pricing-header">
                      <h3 className="pricing-plan-name">{plan.name}</h3>
                      {isPopular ? (
                        <div className="pricing-plan-tag popular-tag">
                          <Sparkles size={16} /> Most Popular
                        </div>
                      ) : (
                        <div className="pricing-plan-tag">
                          <Leaf size={16} /> Base Option
                        </div>
                      )}
                    </div>

                    <div className="pricing-subtitle">Ready for institutional deployment</div>
                    
                    <div className="pricing-price-box">
                      <span className="pricing-amount">₹{plan.monthly_price}</span>
                      <span className="pricing-period">/ month</span>
                    </div>
                    
                    <Link href={`/apply-institution?plan=${plan.id}`} style={{ textDecoration: 'none' }}>
                      <button className="pricing-btn">
                        Deploy {plan.name} <ArrowRight size={18} />
                      </button>
                    </Link>
                    
                    <div className="pricing-divider">
                      <div className="pricing-divider-line"></div>
                      <Sparkles size={16} className="pricing-divider-icon" />
                      <div className="pricing-divider-line"></div>
                    </div>
                    
                    <div className="pricing-features-list">
                      <div className="p-feature">
                        <div className="p-f-icon-box blue"><Users size={20} /></div>
                        <div className="p-f-text">Up to <strong>{plan.student_limit.toLocaleString()}</strong> Students</div>
                        <div className="p-f-check"><Check size={14} strokeWidth={3} /></div>
                      </div>
                      <div className="p-feature">
                        <div className="p-f-icon-box green"><Cloud size={20} /></div>
                        <div className="p-f-text"><strong>{plan.storage_limit_gb}GB</strong> Cloud Storage</div>
                        <div className="p-f-check"><Check size={14} strokeWidth={3} /></div>
                      </div>
                      <details className="more-features-details">
                        <summary className="more-features-summary">
                          View all features
                        </summary>
                        <div className="more-features-content">
                          <div className="p-feature">
                            <div className="p-f-icon-box purple"><BookOpen size={20} /></div>
                            <div className="p-f-text"><strong>{plan.courses_limit}</strong> Active Courses</div>
                            <div className="p-f-check"><Check size={14} strokeWidth={3} /></div>
                          </div>
                          <div className="p-feature">
                            <div className="p-f-icon-box orange"><Server size={20} /></div>
                            <div className="p-f-text">Isolated <strong>Cloud Tenant DB</strong></div>
                            <div className="p-f-check"><Check size={14} strokeWidth={3} /></div>
                          </div>
                          {plan.custom_branding && (
                            <div className="p-feature">
                              <div className="p-f-icon-box purple"><Palette size={20} /></div>
                              <div className="p-f-text">White-Label Custom Branding</div>
                              <div className="p-f-check"><Check size={14} strokeWidth={3} /></div>
                            </div>
                          )}
                          {plan.certificate_module && (
                            <div className="p-feature">
                              <div className="p-f-icon-box orange"><Award size={20} /></div>
                              <div className="p-f-text">Automated Certificates API</div>
                              <div className="p-f-check"><Check size={14} strokeWidth={3} /></div>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>

                    <div className="pricing-footer-box">
                      <div className="pricing-footer-icon"><Sparkles size={20} /></div>
                      <div className="pricing-footer-text">
                        <h4>Zero risk setup</h4>
                        <p>No credit card required • Cancel anytime</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>


        <span id="explore">
          <ExploreMoreWrapper companyName={companyName} />
        </span>
      </main>

      <footer style={{ background: 'var(--bg-default)', borderTop: '1px solid var(--border)', padding: '4rem 2rem 2rem 2rem', color: 'var(--text-secondary)' }}>
        <div className="footer-wrapper" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '0', justifyContent: 'space-between' }}>
          
          <div className="footer-brand-col" style={{ flex: '1 1 300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Image src={logoUrl} alt="Company Logo" width={32} height={32} style={{ borderRadius: '6px' }} />
              <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)' }}>{companyName}</span>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.3 }}>
              Enterprise grade infrastructure powering modern learning environments.
            </p>
          </div>

          <div className="footer-links-wrapper">
            <div className="footer-link-col">
              <h4>Platform</h4>
              <a href="#how-it-works">How It Works</a>
              <a href="#pricing">Pricing Plans</a>
              <a href="/auth/portal">Student Login</a>
              <a href="/apply-institution">Register Institution</a>
            </div>
            <div className="footer-link-col">
              <h4>Connect</h4>
              <a href="#">Book a Demo</a>
              <a href="/contact">Contact Support</a>
            </div>
            <div className="footer-link-col">
              <h4>Legal</h4>
              <a href="#">Terms of Service</a>
              <a href="#">Privacy Policy</a>
            </div>
          </div>
        </div>
        
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '4rem auto 0 auto', maxWidth: '1200px', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
          <p>© {new Date().getFullYear()} {companyName} Systems. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
