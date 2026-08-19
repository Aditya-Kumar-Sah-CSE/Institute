'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import './BadgeCelebrator.css';
import { uploadStoryMedia, createStoryItem } from '@/features/stories/actions/stories';

interface UnseenBadgeData {
  id: string;
  badges: {
    name: string;
    description: string | null;
    icon: string;
  };
}

export default function BadgeCelebrator() {
  const [unseenBadges, setUnseenBadges] = useState<UnseenBadgeData[]>([]);
  const [currentBadge, setCurrentBadge] = useState<UnseenBadgeData | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isAddingToStory, setIsAddingToStory] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
     if (!currentBadge) return;
     setIsAddingToStory(true);
     try {
       const canvas = await generateImage();
       if (!canvas) throw new Error("Failed to generate image");
       
       const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
       if (!blob) throw new Error("Failed to create blob");

       const file = new File([blob], `badge-${currentBadge.id}.png`, { type: 'image/png' });
       const formData = new FormData();
       formData.append('file', file);

       const { url } = await uploadStoryMedia(formData);
       
       await createStoryItem({
         mediaUrl: url,
         thumbnailUrl: null,
         mediaType: 'image',
         caption: `Earned the "${currentBadge.badges.name}" badge! 🎉`,
       });
       
       alert('Successfully added to your Story!');
     } catch (e: any) {
       console.error("Story Error:", e);
       alert(`Failed to add to story. Hint: ${e.message}`);
     } finally {
       setIsAddingToStory(false);
     }
  };

  const handleDownload = async () => {
     if (!currentBadge) return;
     setIsDownloading(true);
     try {
       const canvas = await generateImage();
       if (!canvas) throw new Error("Failed to generate image");
       
       const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
       if (!blob) throw new Error('Failed to create blob');
       
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `badge-${currentBadge.badges.name.replace(/\s+/g, '-').toLowerCase()}.png`;
       a.click();
       URL.revokeObjectURL(url);
     } catch (e: any) {
       alert('Download failed: ' + e.message);
     } finally {
       setIsDownloading(false);
     }
  };

  const handleShare = async () => {
    if (!currentBadge) return;
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
              title: 'Badge Unlocked!',
              text: `I just unlocked the "${currentBadge.badges.name}" badge on the platform! 🎉`,
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
              title: 'Badge Unlocked!',
              text: `I just unlocked the "${currentBadge.badges.name}" badge on the platform! 🎉`,
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
        a.download = `badge-${currentBadge.badges.name.replace(/\s+/g, '-').toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        alert('Sharing not supported on this device. The image has been downloaded to your gallery.');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share.');
    } finally {
      setIsSharing(false);
    }
  };

  useEffect(() => {
    const fetchUnseen = async () => {
      try {
        const res = await fetch('/api/gamification/badges');
        if (!res.ok) return;
        const json = await res.json();
        const unseen = json.data;
        
        if (unseen && unseen.length > 0) {
          const typedData = unseen.map((d: any) => {
             let badgeInfo = d.badges;
             if (Array.isArray(badgeInfo)) badgeInfo = badgeInfo[0];
             return {
               id: d.id,
               badges: badgeInfo
             }
          }) as unknown as UnseenBadgeData[];
          setUnseenBadges(typedData);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUnseen();
  }, []);

  useEffect(() => {
    if (unseenBadges.length > 0 && !currentBadge) {
      showNextBadge();
    }
  }, [unseenBadges, currentBadge]);

  function showNextBadge() {
    if (unseenBadges.length === 0) return;
    
    const badgeData = unseenBadges[0];
    setCurrentBadge(badgeData);

    // After 5 seconds, auto-dismiss
    setTimeout(() => {
      dismissCurrentBadge(badgeData.id);
    }, 5000);
    
    // Store timer if we wanted to clear it on manual dismiss, but simple approach is fine
    // just let it fire, if currentBadge is already null it's safe.
  }

  async function dismissCurrentBadge(badgeId: string) {
    try {
      await fetch('/api/gamification/badges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ badgeIds: [badgeId] })
      });
    } catch (err) {
      console.error(err);
    }
    
    setCurrentBadge(null);
    setUnseenBadges((prev) => prev.slice(1));
  }

  if (!currentBadge || !currentBadge.badges) return null;

  return (
    <div className="badge-celebrator-overlay">
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
      <div className="badge-popup" ref={popupRef} style={{ paddingBottom: 'var(--space-2xl)' }}>
        <button onClick={() => dismissCurrentBadge(currentBadge.id)} className="badge-close-btn no-share">×</button>
        <h2 className="celebration-title">🎉 Badge Unlocked! 🎉</h2>
        <div className="badge-icon-large">
          {currentBadge.badges.icon.startsWith('http') ? (
            <img src={currentBadge.badges.icon} alt={currentBadge.badges.name} width={96} height={96} style={{ objectFit: 'contain' }} crossOrigin="anonymous" />
          ) : (
            currentBadge.badges.icon
          )}
        </div>
        <h3 className="badge-name">{currentBadge.badges.name}</h3>
        <p className="badge-desc">{currentBadge.badges.description}</p>
        
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
  );
}
