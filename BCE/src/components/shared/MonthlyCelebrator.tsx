'use client';

import { useEffect, useState, useRef } from 'react';
import './MonthlyCelebrator.css';

interface MonthlyReward {
  id: string;
  user_id: string;
  month_date: string;
  rank: number;
  is_seen: boolean;
  problems_solved?: number;
  created_at: string;
}

interface Champion {
  rank: number;
  problems_solved: number;
  name: string;
  avatar_url: string | null;
}

export default function MonthlyCelebrator() {
  const [unseenReward, setUnseenReward] = useState<MonthlyReward | null>(null);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [monthName, setMonthName] = useState<string>('');
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
      formData.append('caption', `I just ranked #${reward.rank} in ${monthName} with ${reward.problems_solved ?? 0} solved problems! 👑`);
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
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'Monthly Coding Champion!',
              text: `I just ranked #${reward.rank} in ${monthName} with ${reward.problems_solved ?? 0} solved problems! 👑`,
              files: [file]
            });
            sharedSuccess = true;
          } catch (shareErr) {
            console.warn("Native file sharing failed, trying text-only sharing...", shareErr);
          }
        }

        if (!sharedSuccess) {
          try {
            await navigator.share({
              title: 'Monthly Coding Champion!',
              text: `I just ranked #${reward.rank} in ${monthName} with ${reward.problems_solved ?? 0} solved problems! 👑`,
              url: window.location.origin
            });
            sharedSuccess = true;
          } catch (textShareErr) {
            console.warn("Native text sharing failed, downloading instead...", textShareErr);
          }
        }
      }

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
        const { unseenRewards, champions, monthName } = json.data || {};
        if (unseenRewards && unseenRewards.length > 0) {
          setUnseenReward(unseenRewards[0]);
          setChampions(champions || []);
          setMonthName(monthName || '');
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

  const first = champions.find(c => c.rank === 1);
  const second = champions.find(c => c.rank === 2);
  const third = champions.find(c => c.rank === 3);

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
      <div className="monthly-popup" ref={popupRef}>
        <button onClick={() => dismissReward(unseenReward.id)} className="monthly-close-btn no-share">×</button>
        <div className="crown-icon">👑</div>
        <h2 className="monthly-celebration-title">Monthly Coding Champions</h2>
        <h3 className="monthly-subtitle">{monthName}</h3>

        {/* Podium Layout */}
        <div className="podium-container">
          {/* Rank 2 (Silver) */}
          {second ? (
            <div className="podium-pedestal rank-2">
              <div className="podium-avatar-wrapper">
                <img 
                  src={second.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(second.name)}&background=64748b&color=fff`} 
                  className="podium-avatar" 
                  alt={second.name} 
                />
                <span className="podium-medal">🥈</span>
              </div>
              <span className="podium-name">{second.name}</span>
              <span className="podium-count">{second.problems_solved} Problems</span>
              <div className="podium-pillar silver-pillar">
                <span className="pillar-label">#2</span>
              </div>
            </div>
          ) : (
            <div className="podium-pedestal empty-pedestal no-share"></div>
          )}

          {/* Rank 1 (Gold) */}
          {first ? (
            <div className="podium-pedestal rank-1">
              <div className="podium-avatar-wrapper">
                <img 
                  src={first.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(first.name)}&background=eab308&color=000`} 
                  className="podium-avatar" 
                  alt={first.name} 
                />
                <span className="podium-medal">🥇</span>
              </div>
              <span className="podium-name">{first.name}</span>
              <span className="podium-count">{first.problems_solved} Problems</span>
              <div className="podium-pillar gold-pillar">
                <span className="pillar-label">#1</span>
              </div>
            </div>
          ) : (
            <div className="podium-pedestal empty-pedestal no-share"></div>
          )}

          {/* Rank 3 (Bronze) */}
          {third ? (
            <div className="podium-pedestal rank-3">
              <div className="podium-avatar-wrapper">
                <img 
                  src={third.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(third.name)}&background=b45309&color=fff`} 
                  className="podium-avatar" 
                  alt={third.name} 
                />
                <span className="podium-medal">🥉</span>
              </div>
              <span className="podium-name">{third.name}</span>
              <span className="podium-count">{third.problems_solved} Problems</span>
              <div className="podium-pillar bronze-pillar">
                <span className="pillar-label">#3</span>
              </div>
            </div>
          ) : (
            <div className="podium-pedestal empty-pedestal no-share"></div>
          )}
        </div>

        <p className="monthly-desc">
          Congratulations! You ranked <strong>#{unseenReward.rank}</strong> in the institute last month, solving <strong>{unseenReward.problems_solved ?? 0}</strong> coding problems!
        </p>

        <div className="no-share button-container-row">
          <button 
            onClick={() => handleAddToStory(unseenReward)}
            disabled={isAddingToStory || isSharing}
            className="action-btn story-btn"
          >
            {isAddingToStory ? 'Posting...' : '🌟 Add to Story'}
          </button>

          <button 
            onClick={() => handleShare(unseenReward)}
            disabled={isSharing || isAddingToStory}
            className="action-btn share-btn"
          >
            {isSharing ? 'Generating...' : '📸 Share'}
          </button>
        </div>

        <div className="glow-effect"></div>
      </div>
    </div>
  );
}
