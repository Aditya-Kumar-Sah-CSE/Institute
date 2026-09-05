'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, Pause, Download, ExternalLink, FileText, Pin, MoreHorizontal, 
  Reply, Smile, Copy, Forward, Trash2, Edit2, Volume2, Check, Share2
} from 'lucide-react';
import type { ChatMessage } from '@/types/database';

interface MessageBubbleProps {
  msg: ChatMessage & { sender?: { name: string }; reply_to?: any; reactions?: any[] };
  isMine: boolean;
  isRead?: boolean;
  showSenderName?: boolean;
  onReply?: (msg: ChatMessage) => void;
  onReact?: (msgId: string, emoji: string) => void;
  onEdit?: (msg: ChatMessage) => void;
  onDelete?: (msgId: string) => void;
  onPin?: (msgId: string, currentPinned: boolean) => void;
  onForward?: (msg: ChatMessage) => void;
  onOpenLightbox?: (url: string, type: string) => void;
}

const getSenderColor = (senderId: string) => {
  const colors = ['#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#64d2ff', '#0a84ff', '#bf5af2', '#ff375f'];
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function MessageBubble({
  msg,
  isMine,
  isRead = false,
  showSenderName = false,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onPin,
  onForward,
  onOpenLightbox
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiQuick, setShowEmojiQuick] = useState(false);
  const [copied, setCopied] = useState(false);

  // Custom Audio Player State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState<number>(1);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const displayTime = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(audioPlaybackRate) + 1) % rates.length];
    setAudioPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleCopyText = () => {
    if (msg.content) {
      navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setShowMenu(false);
  };

  const handleShareFile = async (e: React.MouseEvent, url: string, filename: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!url) return;

    let sharedSuccess = false;
    if (navigator.share) {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        let extension = 'bin';
        if (msg.attachment_type === 'pdf') extension = 'pdf';
        else if (/\.(ppt|pptx)$/i.test(url)) extension = 'ppt';
        else if (/\.(pdf)$/i.test(url)) extension = 'pdf';
        else if (/\.(xls|xlsx)$/i.test(url)) extension = 'xls';
        else if (/\.(doc|docx)$/i.test(url)) extension = 'doc';
        else if (msg.attachment_type === 'text') extension = 'txt';
        
        let cleanedName = filename.replace(/[^\w\s.-]/g, '');
        if (!cleanedName.toLowerCase().endsWith(`.${extension}`)) {
          cleanedName = `${cleanedName}.${extension}`;
        }

        const file = new File([blob], cleanedName, { type: blob.type });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: cleanedName,
            files: [file]
          });
          sharedSuccess = true;
        }
      } catch (err) {
        console.warn("Native file sharing failed, trying text/URL share...", err);
      }

      if (!sharedSuccess) {
        try {
          await navigator.share({
            title: filename,
            url: url
          });
          sharedSuccess = true;
        } catch (err) {
          console.warn("Native text sharing failed...", err);
        }
      }
    }

    if (!sharedSuccess) {
      try {
        await navigator.clipboard.writeText(url);
        alert('File link copied to clipboard!');
      } catch (_) {
        alert('Sharing action not supported.');
      }
    }
  };

  // Convert URLs to clickable links
  const renderFormattedText = (text: string | null) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--neon-cyan)', textDecoration: 'underline', wordBreak: 'break-all' }}
            onClick={e => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // Group reactions by emoji
  const reactionCounts: Record<string, number> = {};
  if (msg.reactions && Array.isArray(msg.reactions)) {
    msg.reactions.forEach((r: any) => {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    });
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        display: 'flex',
        marginBottom: Object.keys(reactionCounts).length > 0 ? '22px' : '14px',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        position: 'relative',
      }}
      className="message-bubble-wrapper"
    >
      <div 
        style={{
          maxWidth: 'min(82vw, 480px)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMine ? 'flex-end' : 'flex-start'
        }}
        onMouseEnter={() => setShowMenu(true)}
        onMouseLeave={() => {
          setShowMenu(false);
          setShowEmojiQuick(false);
        }}
      >
        {/* Floating Quick Action Trigger */}
        {showMenu && (
          <div style={{
            position: 'absolute',
            top: '-14px',
            right: isMine ? '0' : 'auto',
            left: isMine ? 'auto' : '0',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: '16px',
            padding: '2px 8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            zIndex: 10
          }}>
            <button 
              onClick={() => onReply?.(msg)} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px' }} 
              title="Reply"
            >
              <Reply size={14} />
            </button>
            <button 
              onClick={() => setShowEmojiQuick(!showEmojiQuick)} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px' }} 
              title="React"
            >
              <Smile size={14} />
            </button>
            {isMine && !msg.deleted_for_everyone && (
              <button 
                onClick={() => onEdit?.(msg)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px' }} 
                title="Edit"
              >
                <Edit2 size={14} />
              </button>
            )}
            <button 
              onClick={() => onForward?.(msg)} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px' }} 
              title="Forward"
            >
              <Forward size={14} />
            </button>
            <button 
              onClick={handleCopyText} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px' }} 
              title="Copy"
            >
              <Copy size={14} />
            </button>
            {onPin && (
              <button 
                onClick={() => onPin(msg.id, !!msg.is_pinned)} 
                style={{ background: 'none', border: 'none', color: msg.is_pinned ? 'var(--neon-gold)' : 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px' }} 
                title={msg.is_pinned ? "Unpin" : "Pin"}
              >
                <Pin size={14} />
              </button>
            )}
            {isMine && onDelete && (
              <button 
                onClick={() => onDelete(msg.id)} 
                style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', padding: '2px 4px' }} 
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}

        {/* Quick Emoji Reaction Selector */}
        {showEmojiQuick && (
          <div style={{
            position: 'absolute',
            top: '-42px',
            right: isMine ? '0' : 'auto',
            left: isMine ? 'auto' : '0',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: '20px',
            padding: '4px 8px',
            display: 'flex',
            gap: '6px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
            zIndex: 12
          }}>
            {['👍', '❤️', '🔥', '😂', '🎉', '👏'].map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  onReact?.(msg.id, emoji);
                  setShowEmojiQuick(false);
                }}
                style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', padding: '2px' }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Main Message Card Bubble */}
        <div 
          className="glass-card"
          style={{
            padding: '8px 12px',
            borderRadius: '16px',
            background: isMine 
              ? '#1976d2' 
              : 'var(--bg-elevated)',
            backdropFilter: 'blur(20px)',
            color: isMine ? '#ffffff' : 'var(--text-primary)',
            borderBottomRightRadius: isMine ? '4px' : '16px',
            borderBottomLeftRadius: isMine ? '16px' : '4px',
            border: isMine ? 'none' : '1px solid var(--border-default)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            position: 'relative'
          }}
        >
          {/* Pinned Tag */}
          {msg.is_pinned && (
            <div style={{ fontSize: '10px', color: 'var(--neon-gold)', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Pin size={10} /> Pinned
            </div>
          )}

          {/* Group Sender Name */}
          {showSenderName && msg.sender && (
            <div style={{ fontSize: '12px', fontWeight: 700, color: getSenderColor(msg.sender_id), marginBottom: '4px', textAlign: 'left' }}>
              {msg.sender.name}
            </div>
          )}

          {/* Reply Quoted Preview (Only rendered if actual reply ID exists) */}
          {msg.reply_to && msg.reply_to.id && (
            <div style={{
              background: 'rgba(0,0,0,0.25)',
              borderLeft: '4px solid var(--neon-cyan)',
              padding: '6px 10px',
              borderRadius: '8px',
              marginBottom: '8px',
              fontSize: '11px',
              color: 'var(--text-secondary)'
            }}>
              <span style={{ fontWeight: 700, color: 'var(--neon-cyan)', display: 'block', marginBottom: '2px' }}>
                {msg.reply_to.sender?.name || 'Reply'}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {msg.reply_to.content || '[Attachment]'}
              </span>
            </div>
          )}

          {/* Attachment Rendering */}
          {msg.attachment_link && (
            <div style={{ marginBottom: '6px' }}>
              {msg.attachment_type === 'image' && (
                <div 
                  onClick={() => onOpenLightbox?.(msg.attachment_link!, 'image')}
                  style={{ borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--glass-border)', maxWidth: '280px' }}
                >
                  <img 
                    src={msg.attachment_link} 
                    alt="attachment" 
                    style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '240px', objectFit: 'cover' }} 
                  />
                </div>
              )}

              {msg.attachment_type === 'video' && (
                <div 
                  onClick={() => onOpenLightbox?.(msg.attachment_link!, 'video')}
                  style={{ borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--glass-border)', maxWidth: '280px', position: 'relative' }}
                >
                  <video 
                    src={msg.attachment_link} 
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} 
                  />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,240,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                      <Play size={22} fill="#000" />
                    </div>
                  </div>
                </div>
              )}

              {msg.attachment_type === 'audio' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '8px 12px',
                  borderRadius: '16px',
                  minWidth: '220px'
                }}>
                  <audio 
                    ref={audioRef} 
                    src={msg.attachment_link} 
                    onTimeUpdate={() => {
                      if (audioRef.current) {
                        setAudioProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
                      }
                    }}
                    onEnded={() => setIsPlayingAudio(false)}
                  />
                  <button
                    onClick={toggleAudio}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'var(--neon-cyan)',
                      border: 'none',
                      color: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    {isPlayingAudio ? <Pause size={16} fill="#000" /> : <Play size={16} fill="#000" style={{ marginLeft: 2 }} />}
                  </button>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${audioProgress}%`, height: '100%', background: 'var(--neon-cyan)' }} />
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Voice Note</span>
                      <span 
                        onClick={cyclePlaybackRate}
                        style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--neon-cyan)' }}
                      >
                        {audioPlaybackRate}x
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {(msg.attachment_type === 'pdf' || msg.attachment_type === 'text' || (msg.attachment_type && !['image', 'video', 'audio'].includes(msg.attachment_type))) && (
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '10px',
                    color: 'inherit',
                    border: '1px solid var(--glass-border)'
                  }}
                >
                  <FileText size={24} color="var(--neon-cyan)" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {msg.content || 'Attached Document'}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Document File</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-share">
                    <a 
                      href={msg.attachment_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      title="Download File"
                      style={{ color: 'var(--text-muted)', display: 'flex', padding: '4px' }}
                    >
                      <Download size={16} />
                    </a>
                    <button 
                      onClick={(e) => handleShareFile(e, msg.attachment_link!, msg.content || 'document')}
                      title="Share File"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Text Content + Time/Status Layout */}
          {msg.content && msg.attachment_type !== 'audio' ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <p style={{ 
                fontSize: '14.5px', 
                margin: 0, 
                lineHeight: 1.45, 
                wordBreak: 'break-word', 
                textAlign: 'left',
                color: isMine ? '#ffffff' : 'var(--text-primary)',
                paddingBottom: '4px'
              }}>
                {renderFormattedText(msg.content)}
              </p>

              {/* Inline Metadata footer right-aligned under text */}
              <div style={{
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                alignSelf: 'flex-end',
                gap: '4px',
                opacity: 0.75,
                marginTop: '2px',
                color: isMine ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap'
              }}>
                {msg.is_edited && <span>(edited)</span>}
                <span>{displayTime}</span>
                {isMine && (
                  <span 
                    title={isRead ? "Seen" : "Sent"} 
                    style={{ 
                      fontWeight: 'bold', 
                      fontSize: '12px',
                      color: isRead ? '#4ade80' : 'rgba(255,255,255,0.45)'
                    }}
                  >
                    {isRead ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Metadata block for empty content or audio attachments */
            <div style={{
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '4px',
              opacity: 0.75,
              marginTop: '6px',
              color: isMine ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-muted)',
              fontFamily: 'var(--font-sans)',
              whiteSpace: 'nowrap'
            }}>
              {msg.is_edited && <span>(edited)</span>}
              <span>{displayTime}</span>
              {isMine && (
                <span 
                  title={isRead ? "Seen" : "Sent"} 
                  style={{ 
                    fontWeight: 'bold', 
                    fontSize: '12px',
                    color: isRead ? '#4ade80' : 'rgba(255,255,255,0.45)'
                  }}
                >
                  {isRead ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Compact Reactions Badge Pill positioned absolutely on the edge of the bubble */}
        {Object.keys(reactionCounts).length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '-10px',
            right: isMine ? '10px' : 'auto',
            left: isMine ? 'auto' : '10px',
            display: 'flex',
            gap: '4px',
            zIndex: 5
          }}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => onReact?.(msg.id, emoji)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: '#1d2030',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: '11px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                  transition: 'all 0.15s ease'
                }}
                title={`Toggle ${emoji} reaction`}
              >
                <span>{emoji}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--neon-cyan)' }}>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
