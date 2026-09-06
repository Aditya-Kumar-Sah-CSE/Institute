'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { Sparkles } from 'lucide-react';
import { useSmartAgentSession } from '../context/SmartAgentSessionContext';

export default function AskAgentCardTrigger() {
  const { openDrawer } = useSmartAgentSession();

  return (
    <div 
      style={{
        background: 'rgba(0, 229, 255, 0.05)',
        border: '1px solid rgba(0, 229, 255, 0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-md) var(--space-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-md)',
        margin: 'var(--space-md) 0'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'rgba(0, 229, 255, 0.15)', color: 'var(--neon-cyan)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
          <Sparkles size={22} />
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            ✦ Smart Learn Agent
          </h4>
          <p style={{ margin: '2px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Control Smart Learn using natural language or voice commands.
          </p>
        </div>
      </div>

      <Button 
        variant="primary" 
        size="sm" 
        onClick={() => openDrawer()}
        style={{ gap: '6px', whiteSpace: 'nowrap' }}
      >
        <Sparkles size={14} /> Ask Smart Agent
      </Button>
    </div>
  );
}
