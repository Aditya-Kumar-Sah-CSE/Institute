'use client';
import React, { useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';

export default function ExploreMoreWrapper({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return <div className="animate-fade-up">{children}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem 5rem', background: 'var(--bg-default)' }}>
      <button 
        type="button"
        className="btn-human cta-btn-lg explore-features-trigger"
        onClick={() => setExpanded(true)}
      >
        <Sparkles size={19} />
        <span>Explore Platform Gallery &amp; Tools</span>
        <ChevronDown size={19} className="explore-chevron" />
      </button>
      <p style={{ marginTop: '0.9rem', color: 'var(--text-muted)', fontSize: '0.92rem', textAlign: 'center' }}>
        Interactive workspace preview &amp; core capabilities
      </p>
    </div>
  );
}

