'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import './BadgeDisplay.css';
import './BadgeCelebrator.css';
import type { Badge, UserBadge } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { uploadStoryMedia, createStoryItem } from '@/features/stories/actions/stories';

interface BadgeDisplayProps {
  allBadges: Badge[];
  earnedBadges: UserBadge[];
  compact?: boolean;
  className?: string;
}

export default function BadgeDisplay({ allBadges, earnedBadges, compact = false, className = '' }: BadgeDisplayProps) {
  const earnedIds = new Set(earnedBadges.map(ub => ub.badge_id));
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [mounted, setMounted] = useState(() => typeof window !== 'undefined');
  const [isSharing, setIsSharing] = useState(false);
  const [isAddingToStory, setIsAddingToStory] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mounted) {
       setMounted(true);
    }
  }, [mounted]);

  const generateImage = async () => {
    if (!popupRef.current) return null;
    popupRef.current.classList.add('exporting-image');
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const canvas = await html2canvas(popupRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 3,
        logging: false,
        useCORS: true,
        ignoreElements: (element) => element.classList.contains('no-share'),
      });
      return canvas;
    } finally {
      popupRef.current.classList.remove('exporting-image');
    }
  };

  const handleAddToStory = async () => {
     if (!selectedBadge) return;
     setIsAddingToStory(true);
     try {
       const canvas = await generateImage();
       if (!canvas) throw new Error("Failed to generate image");
       
       const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
       if (!blob) throw new Error("Failed to create blob");

       const file = new File([blob], `badge-${selectedBadge.id}.png`, { type: 'image/png' });
       const formData = new FormData();
       formData.append('file', file);

       const { url } = await uploadStoryMedia(formData);
       
       await createStoryItem({
         mediaUrl: url,
         thumbnailUrl: null,
         mediaType: 'image',
         caption: `Earned the "${selectedBadge.name}" badge! 🎉`,
       });
       
       alert('Successfully added to your Story!');
       window.dispatchEvent(new CustomEvent('story-added'));
     } catch (e: any) {
       console.error("Story Error:", e);
       alert(`Failed to add to story. Hint: ${e.message}`);
     } finally {
       setIsAddingToStory(false);
     }
  };

  const handleDownload = async () => {
     if (!selectedBadge) return;
     setIsDownloading(true);
     try {
       const canvas = await generateImage();
       if (!canvas) throw new Error("Failed to generate image");
       
       const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
       if (!blob) throw new Error('Failed to create blob');
       
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `badge-${selectedBadge.name.replace(/\s+/g, '-').toLowerCase()}.png`;
       a.click();
       URL.revokeObjectURL(url);
     } catch (e: any) {
       alert('Download failed: ' + e.message);
     } finally {
       setIsDownloading(false);
     }
  };

  const handleShare = async () => {
    if (!selectedBadge) return;
    setIsSharing(true);
    
    try {
      const canvas = await generateImage();
      if (!canvas) throw new Error("Failed to generate canvas");

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create image blob');

      const file = new File([blob], 'badge-award.png', { type: 'image/png' });
      let sharedSuccess = false;

      if (navigator.share) {
        // Try file sharing if supported
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'Badge Earned!',
              text: `I just earned the "${selectedBadge.name}" badge on the platform! 🎉`,
              files: [file]
            });
            sharedSuccess = true;
          } catch (shareErr) {
            console.warn("Native file sharing failed, trying text-only sharing...", shareErr);
          }
        }
        
        // If file sharing wasn't supported or failed, try text/url sharing
        if (!sharedSuccess) {
          try {
            await navigator.share({
              title: 'Badge Earned!',
              text: `I just earned the "${selectedBadge.name}" badge on the platform! 🎉`,
              url: window.location.origin
            });
            sharedSuccess = true;
          } catch (textShareErr) {
            console.warn("Native text sharing failed, downloading instead...", textShareErr);
          }
        }
      }

      // Fallback: If native share didn't succeed or isn't supported, download the image
      if (!sharedSuccess) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `badge-${selectedBadge.name.replace(/\s+/g, '-').toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        alert('Sharing not supported on this device. The image has been downloaded.');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share.');
    } finally {
      setIsSharing(false);
    }
  };

  const popupContent = selectedBadge ? (
    <div className="badge-celebrator-overlay" onClick={() => setSelectedBadge(null)}>
      <div className="falling-stars">
        {[...Array(30)].map((_, i) => (
          <div suppressHydrationWarning key={i} className="star" style={{ 
            left: `${(i * 17) % 100}vw`,
            animationDuration: `${2 + ((i * 11) % 3)}s`,
            animationDelay: `${((i * 7) % 20) / 10}s`
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
        <p style={{ marginTop: 'var(--space-md)', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          {selectedBadge.description}
        </p>

        <div className="no-share" style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginTop: 'var(--space-xl)', flexWrap: 'wrap' }}>
          <button 
            onClick={handleAddToStory}
            disabled={isAddingToStory || isSharing || isDownloading}
            style={{
              background: 'linear-gradient(135deg, var(--neon-magenta), var(--neon-purple))',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--space-sm) var(--space-lg)',
              color: 'white',
              fontWeight: 'bold',
              cursor: (isAddingToStory || isSharing || isDownloading) ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 15px rgba(177, 78, 255, 0.3)'
            }}
          >
            {isAddingToStory ? 'Posting...' : '🌟 Add to Story'}
          </button>

          <button 
            onClick={handleDownload}
            disabled={isDownloading || isAddingToStory || isSharing}
            style={{
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue, #3b82f6))',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--space-sm) var(--space-lg)',
              color: 'white',
              fontWeight: 'bold',
              cursor: (isDownloading || isAddingToStory || isSharing) ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 15px rgba(0, 240, 255, 0.3)'
            }}
          >
            {isDownloading ? 'Downloading...' : '📥 Download'}
          </button>

          <button 
            onClick={handleShare}
            disabled={isSharing || isAddingToStory || isDownloading}
            style={{
              background: 'linear-gradient(135deg, var(--neon-green, #10b981), var(--neon-emerald, #059669))',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--space-sm) var(--space-lg)',
              color: 'white',
              fontWeight: 'bold',
              cursor: (isSharing || isAddingToStory || isDownloading) ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
            }}
          >
            {isSharing ? 'Generating...' : '📸 Share'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const badgesToShow = isExpanded ? allBadges : allBadges.slice(0, 6);

  return (
    <>
      <div className={`badge-display ${compact ? 'badge-compact' : ''} ${className}`}>
        {badgesToShow.map((badge) => {
          const isEarned = earnedIds.has(badge.id);
          const displayName = badge.name.length > 18 ? badge.name.substring(0, 18) + '...' : badge.name;
          return (
            <div
              key={badge.id}
              onClick={() => isEarned && setSelectedBadge(badge)}
              className={`badge-item ${isEarned ? 'badge-earned' : 'badge-locked'}`}
              style={{ cursor: isEarned ? 'pointer' : 'default' }}
              title={`${badge.name}: ${badge.description || ''}`}
            >
              {badge.icon.startsWith('http') ? (
                <Image src={badge.icon} alt={badge.name} width={56} height={56} className="badge-icon" style={{ objectFit: 'contain' }} />
              ) : (
                <span className="badge-icon">{badge.icon}</span>
              )}
              {!compact && <span className="badge-name">{displayName}</span>}
            </div>
          );
        })}
      </div>

      {allBadges.length > 6 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'transparent',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginTop: '4px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
          >
            {isExpanded ? 'Show Less' : `Show More (${allBadges.length - 6} Locked)`}
          </button>
        </div>
      )}

      {mounted && popupContent && createPortal(popupContent, document.body)}
    </>
  );
}
