import React from 'react';
import LandingDSAClient from './LandingDSAClient';
import { getPreviewDSASheets } from './LandingPreviewActions';

export default async function LandingDSAPreview() {
  const { data: initialSheets } = await getPreviewDSASheets(0, 100);
  const sheets = initialSheets || [];

  return (
    <section id="landing-dsa" className="landing-section" style={{ background: 'var(--bg-secondary)', position: 'relative', zIndex: 1, padding: '3rem 24px' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span className="landing-eyebrow" style={{ color: '#06b6d4' }}>Practice Ground · {sheets.length} Live Sheets</span>
          <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 800, margin: '0 0 0.65rem 0', color: 'var(--text-primary)' }}>DSA, Aptitude &amp; SQL Sheets</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto', lineHeight: 1.5 }}>
            Interview-focused problem sheets, TCS NQT mocks, and instant test feedback.
          </p>
        </div>

        <LandingDSAClient initialSheets={sheets} />
      </div>
    </section>
  );
}
