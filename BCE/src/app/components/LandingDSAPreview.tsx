import React from 'react';
import LandingDSAClient from './LandingDSAClient';
import { getPreviewDSASheets } from './LandingPreviewActions';

export default async function LandingDSAPreview() {
  const { data: initialSheets } = await getPreviewDSASheets(0, 100);

  return (
    <section id="landing-dsa" className="landing-section" style={{ background: 'var(--bg-secondary)', position: 'relative', zIndex: 1, padding: '3rem 24px' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span style={{ color: '#06b6d4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem', display: 'inline-block', marginBottom: '0.5rem' }}>Practice Ground</span>
          <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>Premium DSA Sheets</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '550px', margin: '0 auto', lineHeight: 1.5 }}>
            Master logic building with our highly curated programming sheets used by top tech companies.
          </p>
        </div>

        <LandingDSAClient initialSheets={initialSheets || []} />
      </div>
    </section>
  );
}
