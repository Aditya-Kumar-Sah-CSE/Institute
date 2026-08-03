import React from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from '@/types/database';
import Image from 'next/image';
import { Check, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
  msg: ChatMessage;
  isMine: boolean;
  isGroupStart: boolean;
  isGroupEnd: boolean;
  showAvatar: boolean;
  showSenderName: boolean;
  readStatus?: 'sent' | 'delivered' | 'seen';
}

export default function MessageBubble({ 
  msg, 
  isMine, 
  isGroupStart, 
  isGroupEnd, 
  showAvatar, 
  showSenderName,
  readStatus = 'sent'
}: MessageBubbleProps) {
  const displayTime = new Date(msg.created_at).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });

  const borderRadius = '18px';
  const smallRadius = '4px';

  return (
    <motion.div 
      initial={isGroupEnd ? { opacity: 0, scale: 0.95, y: 5 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      style={{ 
        display: 'flex', 
        marginBottom: isGroupEnd ? '16px' : '2px', 
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        position: 'relative',
        paddingLeft: (!isMine && !showAvatar) ? '36px' : '0'
      }}
    >
      {!isMine && showAvatar && (
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, alignSelf: 'flex-end', marginRight: '8px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}>
          {msg.sender?.avatar_url ? (
             <Image src={msg.sender.avatar_url} alt="Profile" width={28} height={28} className="object-cover w-full h-full" />
          ) : (
             <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">{msg.sender?.name?.charAt(0) || '?'}</div>
          )}
        </div>
      )}

      <div 
        style={{ 
          maxWidth: '75%', 
          minWidth: '80px',
          padding: '6px 10px 8px 12px', 
          backgroundColor: isMine ? 'var(--neon-cyan)' : 'var(--bg-elevated)', 
          color: isMine ? '#000' : 'var(--text-primary)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          position: 'relative',
          borderTopRightRadius: isMine && !isGroupStart ? smallRadius : borderRadius,
          borderBottomRightRadius: isMine && !isGroupEnd ? smallRadius : borderRadius,
          borderTopLeftRadius: !isMine && !isGroupStart ? smallRadius : borderRadius,
          borderBottomLeftRadius: !isMine && !isGroupEnd ? smallRadius : borderRadius,
        }}
      >
        {!isMine && showSenderName && msg.sender?.name && (
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--neon-cyan)', display: 'block', marginBottom: '2px' }}>
            {msg.sender.name}
          </span>
        )}

        {msg.deleted_for_everyone ? (
           <p style={{ fontSize: '14.5px', margin: 0, fontStyle: 'italic', opacity: 0.6, display: 'flex', alignItems: 'center' }}>🚫 This message was deleted.</p>
        ) : (
           <p style={{ fontSize: '14.5px', margin: 0, lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
             {msg.content}
           </p>
        )}

        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'center', 
            gap: '4px', 
            marginTop: '2px', 
            float: 'right', 
            marginLeft: '12px' 
          }}
        >
          <span style={{ fontSize: '11px', opacity: 0.65, fontWeight: 500 }}>
            {displayTime}
          </span>
          {isMine && !msg.deleted_for_everyone && (
             <span style={{ display: 'flex', alignItems: 'center' }}>
               {readStatus === 'seen' ? (
                 <CheckCheck size={14} color="#34B7F1" />
               ) : readStatus === 'delivered' ? (
                 <CheckCheck size={14} style={{ opacity: 0.6 }} />
               ) : (
                 <Check size={14} style={{ opacity: 0.6 }} />
               )}
             </span>
          )}
        </div>
        {/* Anti-float clearing */}
        <div style={{ clear: 'both' }} />
      </div>
    </motion.div>
  );
}
