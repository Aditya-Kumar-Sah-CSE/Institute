'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const DynamicBelowTheFoldContent = dynamic(
  () => import('./BelowTheFoldContent'),
  { ssr: false }
);

export default function ExploreMoreWrapper({ companyName }: { companyName: string }) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <div className="animate-fade-up">
        <DynamicBelowTheFoldContent companyName={companyName} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem 8rem 2rem', background: 'var(--bg-default)' }}>
      <button 
        className="btn-human cta-btn-lg"
        onClick={() => setExpanded(true)}
        style={{ padding: '1rem 3rem', fontSize: '1.25rem', boxShadow: 'var(--shadow-xl)', transform: 'translateY(0)', transition: 'all 0.3s ease' }}
      >
        Explore More Features
      </button>
      <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '1rem', textAlign: 'center' }}>Click to unveil the full platform capabilities</p>
    </div>
  );
}
