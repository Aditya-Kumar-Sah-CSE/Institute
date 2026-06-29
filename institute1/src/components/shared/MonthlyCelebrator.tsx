'use client';

import { useEffect, useState } from 'react';
import { checkMonthlyRewards, markMonthlyRewardSeen, MonthlyReward } from '@/features/gamification/actions/monthly-rewards';
import { createClient } from '@/lib/supabase/client';
import './MonthlyCelebrator.css';

export default function MonthlyCelebrator() {
  const [unseenReward, setUnseenReward] = useState<MonthlyReward | null>(null);
  
  useEffect(() => {
    const fetchRewards = async () => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      
      const rewards = await checkMonthlyRewards(user.id);
      if (rewards && rewards.length > 0) {
        setUnseenReward(rewards[0]);
        // Auto-dismiss after 8 seconds
        setTimeout(() => {
          dismissReward(rewards[0].id);
        }, 8000);
      }
    };
    fetchRewards();
  }, []);

  const dismissReward = (rewardId: string) => {
    markMonthlyRewardSeen(rewardId).catch(console.error);
    setUnseenReward(null);
  };

  if (!unseenReward) return null;

  return (
    <div className="monthly-celebrator-overlay">
      <div className="confetti-container">
        {[...Array(50)].map((_, i) => (
          <div key={i} className={`confetti ${i % 2 === 0 ? 'confetti-gold' : 'confetti-silver'}`} style={{ 
            left: `${Math.random() * 100}vw`,
            animationDuration: `${Math.random() * 3 + 2}s`,
            animationDelay: `${Math.random() * 2}s`
          }} />
        ))}
      </div>
      <div className="monthly-popup">
        <button onClick={() => dismissReward(unseenReward.id)} className="monthly-close-btn">×</button>
        <div className="crown-icon">👑</div>
        <h2 className="monthly-celebration-title">Monthly Topper!</h2>
        <p className="monthly-desc">
          Congratulations! You ranked <strong>#{unseenReward.rank}</strong> in the institute last month!
        </p>
        <div className="glow-effect"></div>
      </div>
    </div>
  );
}
