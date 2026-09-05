'use client';

import React, { useState } from 'react';
import SmartMentorDrawer from './SmartMentorDrawer';
import { Sparkles } from 'lucide-react';
import './FloatingButtons.css';

export default function FloatingMentorButton() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="floating-mentor-btn"
        onClick={() => setIsDrawerOpen(true)}
        title="Open Personal AI Mentor"
      >
        <Sparkles size={18} style={{ color: 'var(--neon-lime)' }} />
        <span>✦ Mentor</span>
      </button>

      <SmartMentorDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
}
