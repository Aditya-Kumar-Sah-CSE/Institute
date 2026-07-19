import React from 'react';
import type { ChatMessage } from '@/types/database';

interface MessageBubbleProps {
  msg: ChatMessage;
  isMine: boolean;
}

export default function MessageBubble({ msg, isMine }: MessageBubbleProps) {
  const displayTime = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', marginBottom: '16px', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
      <div 
        className="glass-card"
        style={{ 
          maxWidth: '75%', 
          padding: '12px 18px', 
          borderRadius: '16px', 
          background: isMine ? 'rgba(0, 240, 255, 0.15)' : 'var(--bg-elevated)', 
          color: isMine ? 'var(--neon-cyan)' : 'var(--text-primary)',
          borderBottomRightRadius: isMine ? '4px' : '16px',
          borderBottomLeftRadius: isMine ? '16px' : '4px',
          border: isMine ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid var(--glass-border)',
          boxShadow: isMine ? '0 4px 15px rgba(0, 240, 255, 0.1)' : 'var(--shadow-sm)',
          position: 'relative'
        }}
      >
        <p style={{ fontSize: '15px', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>
          {msg.content}
        </p>
        <span 
          style={{ 
            fontSize: '11px', 
            display: 'block', 
            opacity: 0.6, 
            textAlign: 'right',
            marginTop: '8px',
            fontFamily: 'monospace'
          }}
        >
          {displayTime}
        </span>
      </div>
    </div>
  );
}
