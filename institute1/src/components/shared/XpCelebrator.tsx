'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import './BadgeCelebrator.css';

export default function XpCelebrator() {
  const [xpEvents, setXpEvents] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createClient();
    
    let channel: any;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('xp_toast')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'xp_log', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const newEvent = payload.new;
            setXpEvents(prev => [...prev, newEvent]);
            
            // Auto dismiss after 3 seconds
            setTimeout(() => {
              setXpEvents(prev => prev.filter(e => e.id !== newEvent.id));
            }, 3000);
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

  // Render only the first event to avoid multiple overlays overlapping weirdly
  const event = xpEvents[0];

  return (
    <div className="badge-celebrator-overlay">
      <div className="falling-stars">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="star" style={{ 
            left: `${Math.random() * 100}vw`,
            animationDuration: `${Math.random() * 2 + 2}s`,
            animationDelay: `${Math.random() * 2}s`
          }}>
            ⚡
          </div>
        ))}
      </div>
      <div className="badge-popup">
        <button onClick={() => dismissEvent(event.id)} className="badge-close-btn">×</button>
        <h2 className="celebration-title">XP Earned!</h2>
        <div className="badge-icon-large">⚡</div>
        <h3 className="badge-name">+{event.xp_amount} XP</h3>
        <p className="badge-desc">for {event.action}</p>
      </div>
    </div>
  );
}
