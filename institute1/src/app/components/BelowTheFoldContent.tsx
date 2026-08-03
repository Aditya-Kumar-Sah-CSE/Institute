import React from 'react';
import Link from 'next/link';
import { UserCheck, MessageSquare, BarChart2, Timer, Terminal, BellRing } from 'lucide-react';
import AutoScrollMarquee from '@/components/ui/AutoScrollMarquee';
import GallerySection from './GallerySection';

interface BelowTheFoldContentProps {
  companyName: string;
}

export default function BelowTheFoldContent({ companyName }: BelowTheFoldContentProps) {
  return (
    <>
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
    </>
  );
}
