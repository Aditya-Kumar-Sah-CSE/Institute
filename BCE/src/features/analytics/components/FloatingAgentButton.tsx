'use client';

import React from 'react';
import SmartAgentDrawer from './SmartAgentDrawer';
import { Sparkles } from 'lucide-react';
import { useSmartAgentSession } from '../context/SmartAgentSessionContext';
import './FloatingButtons.css';

export default function FloatingAgentButton() {
  const { toggleDrawer } = useSmartAgentSession();

  return (
    <>
      <button
        type="button"
        className="floating-agent-btn"
        onClick={toggleDrawer}
        title="Open Smart Learn AI Agent"
      >
        <Sparkles size={18} style={{ color: 'var(--neon-cyan)' }} />
        <span>✦ Smart Agent</span>
      </button>

      <SmartAgentDrawer />
    </>
  );
}
