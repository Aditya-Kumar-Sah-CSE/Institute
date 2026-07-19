"use client";

import React from 'react';

export default function HeroIllustration() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg 
        viewBox="0 0 400 300" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', animation: 'float 6s ease-in-out infinite' }}
      >
        <style>
          {`
            @keyframes float {
              0% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-15px) rotate(1deg); }
              100% { transform: translateY(0px) rotate(0deg); }
            }
            @keyframes pulse-glow {
              0% { opacity: 0.5; transform: scale(1); }
              50% { opacity: 0.8; transform: scale(1.05); }
              100% { opacity: 0.5; transform: scale(1); }
            }
            .book-base { stroke-dasharray: 1000; stroke-dashoffset: 0; animation: draw 3s ease-in-out; }
          `}
        </style>
        
        {/* Background glow elements */}
        <circle cx="200" cy="150" r="120" fill="var(--human-primary)" opacity="0.1" style={{ animation: 'pulse-glow 8s infinite' }} />
        <circle cx="280" cy="80" r="60" fill="var(--accent-secondary)" opacity="0.08" style={{ animation: 'pulse-glow 6s infinite reverse' }} />

        {/* Big Dashboard/Book shape 1 (back) */}
        <rect x="60" y="80" width="180" height="150" rx="16" fill="var(--bg-card)" stroke="var(--border-default)" strokeWidth="4" />
        <rect x="80" y="100" width="140" height="20" rx="4" fill="color-mix(in srgb, var(--human-primary) 20%, transparent)" />
        <rect x="80" y="130" width="80" height="12" rx="4" fill="var(--text-disabled)" />
        <rect x="80" y="150" width="120" height="12" rx="4" fill="var(--text-disabled)" />
        <rect x="80" y="170" width="100" height="12" rx="4" fill="var(--text-disabled)" />
        
        {/* Abstract Student/User Vector */}
        <g transform="translate(200, 140)">
          {/* Main overlapping card */}
          <rect x="0" y="0" width="160" height="120" rx="16" fill="var(--bg-elevated)" stroke="var(--human-primary)" strokeWidth="3" />
          <circle cx="80" cy="40" r="24" fill="var(--human-primary)" />
          {/* Graph bars */}
          <rect x="25" y="80" width="25" height="40" rx="4" fill="var(--accent-info)" />
          <rect x="65" y="60" width="25" height="60" rx="4" fill="var(--accent-success)" />
          <rect x="105" y="30" width="25" height="90" rx="4" fill="var(--accent-warning)" />
        </g>

        {/* Small UI floating elements */}
        <g transform="translate(40, 220)">
           <rect width="100" height="40" rx="20" fill="var(--bg-surface)" stroke="var(--border-default)" strokeWidth="2" style={{ animation: 'float 5s infinite 1s' }}/>
           <circle cx="20" cy="20" r="10" fill="var(--accent-success)" />
           <rect x="40" y="17" width="40" height="6" rx="3" fill="var(--text-muted)" />
        </g>
        
        <g transform="translate(260, 50)">
           <rect width="100" height="40" rx="20" fill="var(--bg-surface)" stroke="var(--border-default)" strokeWidth="2" style={{ animation: 'float 7s infinite reverse' }}/>
           <path d="M15 20 l5 5 l10 -10" stroke="var(--accent-primary)" strokeWidth="4" strokeLinecap="round" fill="none" />
           <rect x="40" y="17" width="40" height="6" rx="3" fill="var(--text-muted)" />
        </g>

        {/* Stars / Decor */}
        <path d="M350 150 l5 -15 l5 15 l15 5 l-15 5 l-5 15 l-5 -15 l-15 -5 z" fill="var(--accent-warning)" opacity="0.6" style={{ animation: 'pulse-glow 4s infinite' }}/>
        <path d="M50 70 l3 -10 l3 10 l10 3 l-10 3 l-3 10 l-3 -10 l-10 -3 z" fill="var(--human-primary)" opacity="0.8" style={{ animation: 'pulse-glow 5s infinite 2s' }}/>

      </svg>
    </div>
  );
}
