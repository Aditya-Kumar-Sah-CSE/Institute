import React from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from '@/types/database';

interface MessageBubbleProps {
  msg: ChatMessage;
  isMine: boolean;
}

export default function MessageBubble({ msg, isMine }: MessageBubbleProps) {
  const displayTime = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      style={{ display: 'flex', marginBottom: '16px', justifyContent: isMine ? 'flex-end' : 'flex-start' }}
    >
      <div 
        className="glass-card"
        style={{ 
          maxWidth: '80%', 
          padding: '12px 18px', 
          borderRadius: '20px', 
          background: isMine ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 150, 255, 0.05) 100%)' : 'var(--bg-elevated)', 
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          color: isMine ? 'var(--neon-cyan)' : 'var(--text-primary)',
          borderBottomRightRadius: isMine ? '4px' : '20px',
          borderBottomLeftRadius: isMine ? '20px' : '4px',
          border: isMine ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid var(--glass-border)',
          boxShadow: isMine ? '0 4px 15px rgba(0, 240, 255, 0.08)' : '0 2px 10px rgba(0,0,0,0.3)',
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
    </motion.div>
  );
}
