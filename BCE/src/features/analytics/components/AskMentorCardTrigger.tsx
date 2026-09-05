'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import SmartMentorDrawer from './SmartMentorDrawer';
import { Sparkles, MessageSquare } from 'lucide-react';

export default function AskMentorCardTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        style={{
          background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.08) 0%, rgba(57, 255, 20, 0.06) 100%)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} style={{ color: 'var(--neon-cyan)' }} />
          <div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>
              Ask Your Smart Mentor
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Your personal AI guide, powered by your Smart Learn activity.
            </div>
          </div>
        </div>

        <Button 
          type="button" 
          variant="primary" 
          size="sm" 
          onClick={() => setIsOpen(true)}
          style={{ fontSize: '11px', padding: '6px 14px', fontWeight: 'bold' }}
        >
          <MessageSquare size={13} /> Ask Smart Mentor
        </Button>
      </div>

      <SmartMentorDrawer 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
