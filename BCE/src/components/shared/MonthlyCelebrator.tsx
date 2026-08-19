'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import './MonthlyCelebrator.css';

interface MonthlyReward {
  id: string;
  user_id: string;
  month: string;
  rank: number;
  is_seen: boolean;
  created_at: string;
}

export default function MonthlyCelebrator() {
  const [unseenReward, setUnseenReward] = useState<MonthlyReward | null>(null);
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

  const handleAddToStory = async (reward: MonthlyReward) => {
     if (!reward) return;
     setIsAddingToStory(true);
     try {
       const canvas = await generateImage();
       if (!canvas) throw new Error("Failed to generate image");
       
       const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8));
       if (!blob) throw new Error("Failed to create blob");

       const formData = new FormData();
       formData.append('referenceId', reward.id);
       formData.append('category', 'leaderboard');
       formData.append('caption', `I just ranked #${reward.rank} overall for the month on the platform! 👑`);
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

  const handleShare = async (reward: MonthlyReward) => {
    if (!reward) return;
    setIsSharing(true);
    
    try {
      const canvas = await generateImage();
      if (!canvas) throw new Error("Failed to generate canvas");

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create image blob');

      const file = new File([blob], 'monthly-topper.png', { type: 'image/png' });
      let sharedSuccess = false;

      if (navigator.share) {
        // Try file sharing if supported
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'Monthly Topper!',
              text: `I just ranked #${reward.rank} overall for the month on the platform! 👑`,
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
              title: 'Monthly Topper!',
              text: `I just ranked #${reward.rank} overall for the month on the platform! 👑`,
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
        a.download = 'monthly-topper.png';
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
    const fetchMonthly = async () => {
      try {
        const res = await fetch('/api/gamification/monthly');
        if (!res.ok) return;
        
        const json = await res.json();
        const rewards = json.data;
        if (rewards && rewards.length > 0) {
          setUnseenReward(rewards[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMonthly();
  }, []);

  const dismissReward = async (rewardId: string) => {
    try {
      await fetch('/api/gamification/monthly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rewardId })
      });
    } catch (err) {
      console.error(err);
    }
    setUnseenReward(null);
  };

  if (!unseenReward) return null;

  return (
    <div className="monthly-celebrator-overlay">
      <div className="confetti-container">
        {[...Array(50)].map((_, i) => (
          <div suppressHydrationWarning key={i} className={`confetti ${i % 2 === 0 ? 'confetti-gold' : 'confetti-silver'}`} style={{ 
            left: `${(i * 37) % 100}vw`,
            animationDuration: `${2 + ((i * 13) % 3)}s`,
            animationDelay: `${((i * 17) % 20) / 10}s`
          }} />
        ))}
      </div>
      <div className="monthly-popup" ref={popupRef} style={{ paddingBottom: 'var(--space-2xl)' }}>
        <button onClick={() => dismissReward(unseenReward.id)} className="monthly-close-btn no-share">×</button>
        <div className="crown-icon">👑</div>
        <h2 className="monthly-celebration-title">Monthly Topper!</h2>
        <p className="monthly-desc">
          Congratulations! You ranked <strong>#{unseenReward.rank}</strong> in the institute last month!
        </p>

        <div className="no-share" style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginTop: 'var(--space-xl)', flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
          <button 
            onClick={() => handleAddToStory(unseenReward)}
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
            onClick={() => handleShare(unseenReward)}
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

        <div className="glow-effect"></div>
      </div>
    </div>
  );
}
