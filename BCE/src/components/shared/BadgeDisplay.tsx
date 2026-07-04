'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas-pro';
import Image from 'next/image';
import './BadgeDisplay.css';
import './BadgeCelebrator.css';
import type { Badge, UserBadge } from '@/types';

interface BadgeDisplayProps {
  allBadges: Badge[];
  earnedBadges: UserBadge[];
  compact?: boolean;
  className?: string;
}

export default function BadgeDisplay({ allBadges, earnedBadges, compact = false, className = '' }: BadgeDisplayProps) {
  const earnedIds = new Set(earnedBadges.map(ub => ub.badge_id));
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleShare = async () => {
    if (!popupRef.current || !selectedBadge) return;
    setIsSharing(true);
    popupRef.current.classList.add('exporting-image');
    
    try {
      const canvas = await html2canvas(popupRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 3,
        logging: false,
        useCORS: true,
        ignoreElements: (element) => element.classList.contains('no-share'),
      });
      
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create image blob');

      const file = new File([blob], 'badge-award.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Badge Earned!',
          text: `I just earned the "${selectedBadge.name}" badge on the platform! 🎉`,
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'badge-award.png';
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

  const popupContent = selectedBadge ? (
    <div className="badge-celebrator-overlay" onClick={() => setSelectedBadge(null)}>
      <div className="falling-stars">
        {[...Array(30)].map((_, i) => (
          <div suppressHydrationWarning key={i} className="star" style={{ 
            left: `${Math.random() * 100}vw`,
            animationDuration: `${Math.random() * 2 + 2}s`,
            animationDelay: `${Math.random() * 2}s`
          }}>
            ⭐
          </div>
        ))}
      </div>
      <div className="badge-popup" ref={popupRef} onClick={e => e.stopPropagation()} style={{ paddingBottom: 'var(--space-2xl)' }}>
        <button onClick={() => setSelectedBadge(null)} className="badge-close-btn no-share">×</button>
        <h2 className="celebration-title">🎉 Badge Earned! 🎉</h2>
        <div className="badge-icon-large">
          {selectedBadge.icon.startsWith('http') ? (
            <Image src={selectedBadge.icon} alt={selectedBadge.name} width={96} height={96} style={{ objectFit: 'contain' }} />
          ) : (
            selectedBadge.icon
          )}
        </div>
        <h3 className="badge-name">{selectedBadge.name}</h3>
        <p className="badge-desc">{selectedBadge.description}</p>
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
      <div className={`badge-display ${compact ? 'badge-compact' : ''} ${className}`}>
        {allBadges.map((badge) => {
          const isEarned = earnedIds.has(badge.id);
          return (
            <div
              key={badge.id}
              onClick={() => isEarned && setSelectedBadge(badge)}
              className={`badge-item ${isEarned ? 'badge-earned' : 'badge-locked'}`}
              style={{ cursor: isEarned ? 'pointer' : 'default' }}
              title={`${badge.name}: ${badge.description || ''}`}
            >
              {badge.icon.startsWith('http') ? (
                <Image src={badge.icon} alt={badge.name} width={32} height={32} className="badge-icon" style={{ objectFit: 'contain' }} />
              ) : (
                <span className="badge-icon">{badge.icon}</span>
              )}
              {!compact && <span className="badge-name">{badge.name}</span>}
            </div>
          );
        })}
      </div>

      {mounted && popupContent && createPortal(popupContent, document.body)}
    </>
  );
}
