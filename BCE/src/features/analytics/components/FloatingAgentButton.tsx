'use client';

import React from 'react';
import SmartAgentDrawer from './SmartAgentDrawer';
import { Sparkles } from 'lucide-react';
import { useSmartAgentSession } from '../context/SmartAgentSessionContext';

export default function FloatingAgentButton() {
  const { toggleDrawer } = useSmartAgentSession();

  return (
    <>
      <button
        type="button"
        onClick={toggleDrawer}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '150px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          borderRadius: '30px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--neon-cyan)',
          color: 'var(--neon-cyan)',
          fontWeight: 'bold',
          fontSize: 'var(--text-sm)',
          cursor: 'pointer',
          boxShadow: '0 8px 25px rgba(0, 229, 255, 0.35)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
          e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 229, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 229, 255, 0.35)';
        }}
        title="Open Smart Learn AI Agent"
      >
        <Sparkles size={18} style={{ color: 'var(--neon-cyan)' }} />
        <span>✦ Smart Agent</span>
      </button>

      <SmartAgentDrawer />
    </>
  );
}
