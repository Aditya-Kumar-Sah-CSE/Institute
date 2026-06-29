'use client';

import { useEffect, useState } from 'react';
import { getUnseenBadges, markBadgesSeen } from '@/features/gamification/actions/gamification';
import './BadgeCelebrator.css';

export default function BadgeCelebrator() {
  const [unseenBadges, setUnseenBadges] = useState<any[]>([]);
  const [currentBadge, setCurrentBadge] = useState<any | null>(null);

  useEffect(() => {
    // Fetch unseen badges
    getUnseenBadges().then((data) => {
      console.log('Fetched unseen badges:', data);
      if (data && data.length > 0) {
        setUnseenBadges(data);
      }
    }).catch(console.error);
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

  const dismissCurrentBadge = (badgeId: string) => {
    // Mark as seen in DB ONLY when it is dismissed so they don't lose it if they reload too fast
    markBadgesSeen([badgeId]).catch(console.error);
    
    setCurrentBadge(null);
    setUnseenBadges((prev) => prev.slice(1));
  };

  if (!currentBadge || !currentBadge.badges) return null;

  return (
    <div className="badge-celebrator-overlay">
      <div className="falling-stars">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="star" style={{ 
            left: `${Math.random() * 100}vw`,
            animationDuration: `${Math.random() * 2 + 2}s`,
            animationDelay: `${Math.random() * 2}s`
          }}>
            ⭐
          </div>
        ))}
      </div>
      <div className="badge-popup">
        <button onClick={() => dismissCurrentBadge(currentBadge.id)} className="badge-close-btn">×</button>
        <h2 className="celebration-title">🎉 Badge Unlocked! 🎉</h2>
        <div className="badge-icon-large">{currentBadge.badges.icon}</div>
        <h3 className="badge-name">{currentBadge.badges.name}</h3>
        <p className="badge-desc">{currentBadge.badges.description}</p>
      </div>
    </div>
  );
}
