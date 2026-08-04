'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import '@/components/shared/MonthlyCelebrator.css';

export default function CrownBanner({ rank, companyName = 'Institute', monthDate }: { rank: number; companyName?: string; monthDate: string }) {
  const [showPopup, setShowPopup] = useState(false);
  const [mounted, setMounted] = useState(() => typeof window !== 'undefined');
  const [isSharing, setIsSharing] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mounted) {
      setMounted(true);
    }
  }, [mounted]);

  const dateObj = new Date(monthDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthNameStr = monthNames[dateObj.getUTCMonth()];
  const year = dateObj.getUTCFullYear();
  const formattedDate = `${monthNameStr} ${year}`;

  const handleShare = async () => {
    if (!popupRef.current) return;
    setIsSharing(true);
    popupRef.current.classList.add('exporting-image');
    
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const canvas = await html2canvas(popupRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 3, // higher res
        logging: false,
        useCORS: true,
        ignoreElements: (element) => element.classList.contains('no-share'),
      });
      
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create image blob');

      const file = new File([blob], 'topper-award.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${companyName} Topper Award`,
          text: `I just ranked #${rank} at ${companyName}! 👑🎉`,
          files: [file]
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'topper-award.png';
        a.click();
        URL.revokeObjectURL(url);
        alert('Image downloaded! You can now share it on LinkedIn, Instagram, or WhatsApp.');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share image.');
    } finally {
      popupRef.current?.classList.remove('exporting-image');
      setIsSharing(false);
    }
  };

  const popupContent = showPopup ? (
    <div className="monthly-celebrator-overlay" onClick={() => setShowPopup(false)}>
      <div className="confetti-container">
        {[...Array(50)].map((_, i) => (
          <div suppressHydrationWarning key={i} className={`confetti ${i % 2 === 0 ? 'confetti-gold' : 'confetti-silver'}`} style={{ 
            left: `${(i * 37) % 100}vw`,
            animationDuration: `${2 + ((i * 13) % 3)}s`,
            animationDelay: `${((i * 17) % 20) / 10}s`
          }} />
        ))}
      </div>
      <div className="monthly-popup" ref={popupRef} onClick={e => e.stopPropagation()} style={{ paddingBottom: 'var(--space-2xl)' }}>
        <button onClick={() => setShowPopup(false)} className="monthly-close-btn no-share">×</button>
        <div className="crown-icon">👑</div>
        <h2 className="monthly-celebration-title">{companyName} Topper!</h2>
        <p className="monthly-desc">
          Congratulations! You ranked <strong>#{rank}</strong> out of all students at {companyName} for <strong>{formattedDate}</strong>!
        </p>
        <div className="glow-effect"></div>
        <button 
          className="no-share"
          onClick={handleShare}
          disabled={isSharing}
          style={{
            marginTop: 'var(--space-lg)',
            background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: 'var(--space-sm) var(--space-xl)',
            color: 'white',
            fontWeight: 'bold',
            cursor: isSharing ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            margin: 'var(--space-xl) auto 0 auto',
            boxShadow: '0 4px 15px rgba(0, 240, 255, 0.3)'
          }}
        >
          {isSharing ? 'Generating...' : '📸 Share on Socials'}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div 
        onClick={() => setShowPopup(true)}
        title={`${companyName} Topper - Click to celebrate!`}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: 'var(--space-md)',
          transition: 'all 0.3s ease-in-out'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.15) translateY(-5px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
        }}
      >
        <span style={{ 
          fontSize: '4rem', 
          filter: 'drop-shadow(0 0 15px rgba(255,215,0,0.8))',
        }}>👑</span>
      </div>
      {mounted && popupContent && createPortal(popupContent, document.body)}
    </>
  );
}
