'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function GlobalLoading() {
  const [logoUrl, setLogoUrl] = useState('/icon-192x192.png');
  const [companyName, setCompanyName] = useState('Smart Learn');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('company_settings').select('company_name, logo_url').single();
        if (data) {
          if (data.logo_url) setLogoUrl(data.logo_url);
          if (data.company_name) setCompanyName(data.company_name);
        }
      } catch (err) {
        console.error('Failed to load company settings for splash screen:', err);
      }
    };
    fetchSettings();
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      width: '100vw', 
      background: 'radial-gradient(circle at center, #0a0a0a 0%, #000000 100%)', 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      zIndex: 9999,
      gap: '24px'
    }}>
      <div className="splash-logo-container" style={{
        position: 'relative',
        width: '120px',
        height: '120px',
        animation: 'pulse-scale 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }}>
        {/* Glow behind the logo */}
        <div style={{
          position: 'absolute',
          inset: '-20px',
          background: 'var(--neon-cyan, #00f2fe)',
          filter: 'blur(30px)',
          opacity: 0.3,
          borderRadius: '50%',
          animation: 'glow-pulse 2s ease-in-out infinite'
        }} />
        <Image 
          src={logoUrl} 
          alt={`${companyName} Logo`} 
          fill
          sizes="120px"
          priority
          style={{ objectFit: 'contain', zIndex: 2 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '24px', 
          fontWeight: 700, 
          background: 'linear-gradient(to right, #00f2fe, #4facfe)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '1px'
        }}>
          {companyName}
        </h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--neon-cyan, #00f2fe)',
              animation: `bounce-dot 1.4s ease-in-out infinite`,
              animationDelay: `${i * 0.16}s`
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
