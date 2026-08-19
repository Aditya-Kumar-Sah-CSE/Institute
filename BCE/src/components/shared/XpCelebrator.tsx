'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import './BadgeCelebrator.css';

interface XpEvent {
  id: string;
  xp_amount: number;
  action: string;
}

export default function XpCelebrator() {
  const [xpEvents, setXpEvents] = useState<XpEvent[]>([]);
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

  const handleAddToStory = async (eventObj: XpEvent) => {
    setIsAddingToStory(true);
    try {
      const canvas = await generateImage();
      if (!canvas) throw new Error("Failed to generate image");
      
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8));
      if (!blob) throw new Error("Failed to create blob");

      const formData = new FormData();
      formData.append('referenceId', eventObj.id);
      formData.append('category', 'xp');
      formData.append('caption', `Earned +${eventObj.xp_amount} XP for ${eventObj.action}!`);
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
      window.dispatchEvent(new CustomEvent('story-added'));
    } catch (e: any) {
      console.error("Story Error:", e);
      alert(`Failed to add to story. Hint: ${e.message}`);
    } finally {
      setIsAddingToStory(false);
    }
  };

  const handleShare = async (eventObj: XpEvent) => {
    setIsSharing(true);
    try {
      const canvas = await generateImage();
      if (!canvas) throw new Error("Failed to generate canvas");
      
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create image blob');

      const file = new File([blob], 'xp-earned.png', { type: 'image/png' });
      let sharedSuccess = false;

      if (navigator.share) {
        // Try file sharing if supported
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'XP Earned!',
              text: `I just earned +${eventObj.xp_amount} XP for ${eventObj.action} on the platform! ⚡`,
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
              title: 'XP Earned!',
              text: `I just earned +${eventObj.xp_amount} XP for ${eventObj.action} on the platform! ⚡`,
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
        a.download = 'xp-earned.png';
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

  useEffect(() => {
    const supabase = createClient();
    
    let channel: ReturnType<typeof supabase.channel>;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

        const uniqueId = Math.random().toString(36).substring(2, 9);
        channel = supabase
          .channel(`xp_toast_${user.id}_${uniqueId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'xp_log', filter: `user_id=eq.${user.id}` },
            (payload) => {
              const newEvent = payload.new as XpEvent;
              setXpEvents(prev => [...prev, newEvent]);
              
              setTimeout(() => {
                setXpEvents(prev => prev.filter(e => e.id !== newEvent.id));
              }, 10000);
            }
          )
          .subscribe();
      };
  
      setupRealtime();
  
      return () => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
  }, []);

  const dismissEvent = (id: string) => {
    setXpEvents(prev => prev.filter(e => e.id !== id));
  };

  if (xpEvents.length === 0) return null;

  const event = xpEvents[0];

  return (
    <div className="badge-celebrator-overlay">
      <div className="falling-stars">
        {[...Array(30)].map((_, i) => (
          <div suppressHydrationWarning key={i} className="star" style={{ 
            left: `${(i * 17) % 100}vw`,
            animationDuration: `${2 + ((i * 11) % 3)}s`,
            animationDelay: `${((i * 7) % 20) / 10}s`
          }}>
            ⚡
          </div>
        ))}
      </div>
      <div className="badge-popup" ref={popupRef} style={{ paddingBottom: 'var(--space-2xl)' }}>
        <button onClick={() => dismissEvent(event.id)} className="badge-close-btn no-share">×</button>
        <h2 className="celebration-title">XP Earned!</h2>
        <div className="badge-icon-large">⚡</div>
        <h3 className="badge-name">+{event.xp_amount} XP</h3>
        <p className="badge-desc">for {event.action}</p>
        
        <div className="no-share" style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginTop: 'var(--space-xl)', flexWrap: 'wrap' }}>
          <button 
            onClick={() => handleAddToStory(event)}
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
            onClick={() => handleShare(event)}
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
