'use client';
import React, { useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';

export default function ExploreMoreWrapper({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return <div className="animate-fade-up">{children}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem 6rem 2rem', background: 'var(--bg-default)' }}>
      <button 
        className="btn-human cta-btn-lg"
        onClick={() => setExpanded(true)}
        style={{ padding: '1rem 3rem', fontSize: '1.25rem', boxShadow: 'var(--shadow-xl)', transform: 'translateY(0)', transition: 'all 0.3s ease', display: 'inline-flex', alignItems: 'center', gap: '10px' }}
      >
        <Sparkles size={20} />
        Explore More Features
        <ChevronDown size={20} />
      </button>
      <p style={{ marginTop: '1.25rem', color: 'var(--text-muted)', fontSize: '1rem', textAlign: 'center' }}>Click to unveil the full platform capabilities</p>
    </div>
  );
}

