import React from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from '@/types/database';

interface MessageBubbleProps {
  msg: ChatMessage & { sender?: { name: string } };
  isMine: boolean;
  isRead?: boolean;
  showSenderName?: boolean;
}

const getSenderColor = (senderId: string) => {
  const colors = [
    '#ff453a', // Red
    '#ff9f0a', // Orange
    '#ffd60a', // Yellow
    '#30d158', // Green
    '#64d2ff', // Light Blue
    '#0a84ff', // Dark Blue
    '#bf5af2', // Purple
    '#ff375f'  // Pink
  ];
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) {
    hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default function MessageBubble({ msg, isMine, isRead = false, showSenderName = false }: MessageBubbleProps) {
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
        {showSenderName && msg.sender && (
          <div style={{ fontSize: '12px', fontWeight: 700, color: getSenderColor(msg.sender_id), marginBottom: '6px', textAlign: 'left' }}>
            {msg.sender.name}
          </div>
        )}
        <p style={{ fontSize: '15px', margin: 0, lineHeight: 1.5, wordBreak: 'break-word', textAlign: 'left' }}>
          {msg.content}
        </p>
        <div 
          style={{ 
            fontSize: '11px', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '6px',
            opacity: 0.85, 
            marginTop: '6px',
            fontFamily: 'monospace'
          }}
        >
          <span>{displayTime}</span>
          {isMine && (
            <span 
              title={isRead ? "Seen" : "Not seen"} 
              style={{ 
                fontWeight: 'bold', 
                fontSize: '13px',
                color: isRead ? '#39ff14' : '#ff0055',
                textShadow: isRead ? '0 0 6px rgba(57, 255, 20, 0.6)' : '0 0 6px rgba(255, 0, 85, 0.6)',
                transition: 'color 0.3s ease, text-shadow 0.3s ease'
              }}
            >
              {isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
