'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import './BadgeCelebrator.css';

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
       
       const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8));
       if (!blob) throw new Error("Failed to create blob");

       const formData = new FormData();
       formData.append('referenceId', currentBadge.id);
       formData.append('category', 'badge');
       formData.append('caption', `Earned the ${currentBadge.badges.name} badge!`);
       formData.append('image', blob);

       const res = await fetch('/api/hall-of-fame/story', {
           method: 'POST',
           body: formData
       });

       if (!res.ok) {
           const errData = await res.json();
           throw new Error(errData.error || 'Failed to upload story');
       }
       
       alert('Successfully added to your Story!');
     } catch (e: any) {
       console.error("Story Error:", e);
       alert(`Failed to add to story. Hint: ${e.message}`);
     } finally {
       setIsAddingToStory(false);
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

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Badge Unlocked!',
          text: `I just unlocked the "${currentBadge.badges.name}" badge on the platform! 🎉`,
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'badge-award.png';
        a.click();
        URL.revokeObjectURL(url);
        alert('Image downloaded! You can now share it.');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to construct image.');
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

  const showNextBadge = () => {
    if (unseenBadges.length === 0) return;
    
    const badgeData = unseenBadges[0];
    setCurrentBadge(badgeData);

    // After 5 seconds, auto-dismiss
    const timer = setTimeout(() => {
      dismissCurrentBadge(badgeData.id);
    }, 5000);
    
    // Store timer if we wanted to clear it on manual dismiss, but simple approach is fine
    // just let it fire, if currentBadge is already null it's safe.
  };

  const dismissCurrentBadge = async (badgeId: string) => {
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
  };

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
        <div className="badge-icon-large">{currentBadge.badges.icon}</div>
        <h3 className="badge-name">{currentBadge.badges.name}</h3>
        <p className="badge-desc">{currentBadge.badges.description}</p>
        
        <div className="no-share" style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginTop: 'var(--space-xl)', flexWrap: 'wrap' }}>
          <button 
            onClick={handleAddToStory}
            disabled={isAddingToStory || isSharing}
            style={{
              background: 'linear-gradient(135deg, var(--neon-magenta), var(--neon-purple))',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--space-sm) var(--space-lg)',
              color: 'white',
              fontWeight: 'bold',
              cursor: (isAddingToStory || isSharing) ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 15px rgba(177, 78, 255, 0.3)'
            }}
          >
            {isAddingToStory ? 'Posting...' : '🌟 Add to Story'}
          </button>

          <button 
            onClick={handleShare}
            disabled={isSharing || isAddingToStory}
            style={{
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue, #3b82f6))',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--space-sm) var(--space-lg)',
              color: 'white',
              fontWeight: 'bold',
              cursor: (isSharing || isAddingToStory) ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 15px rgba(0, 240, 255, 0.3)'
            }}
          >
            {isSharing ? 'Generating...' : '📸 Share'}
          </button>
        </div>
      </div>
    </div>
  );
}
