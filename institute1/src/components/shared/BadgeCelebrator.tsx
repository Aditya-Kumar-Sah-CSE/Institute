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
    
    // Mark this badge as seen
    markBadgesSeen([badgeData.id]).catch(console.error);

    // After 5 seconds, remove this badge and show next if any
    setTimeout(() => {
      setCurrentBadge(null);
      setUnseenBadges((prev) => prev.slice(1));
    }, 5000);
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
        <h2 className="celebration-title">🎉 Badge Unlocked! 🎉</h2>
        <div className="badge-icon-large">{currentBadge.badges.icon}</div>
        <h3 className="badge-name">{currentBadge.badges.name}</h3>
        <p className="badge-desc">{currentBadge.badges.description}</p>
      </div>
    </div>
  );
}
