'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Heart, MoreVertical, Play, Pause, Trash2, Eye, Send, Smile, Plus } from 'lucide-react';
import Image from 'next/image';
import type { Story, StoryItem } from '@/types/database';
import { registerView, toggleReaction, deleteStoryItem, addStoryReply } from '@/features/stories/actions/stories';
import StoryViewsSheet from './StoryViewsSheet';

const EMOJI_REACTIONS = ['❤️', '😂', '😮', '👏', '🔥', '😢'];

interface StoryViewerCanvasProps {
  stories: Story[];
  initialStoryIndex: number;
  currentUserId?: string;
  onClose: () => void;
  onOpenCompose?: () => void;
  onRefreshFeed: () => void;
}

export default function StoryViewerCanvas({ 
  stories, 
  initialStoryIndex, 
  currentUserId,
  onClose,
  onOpenCompose,
  onRefreshFeed
}: StoryViewerCanvasProps) {
  const [activeStoryIndex, setActiveStoryIndex] = useState(initialStoryIndex);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  // Reactions
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingEmoji, setPendingEmoji] = useState<string | null>(null);
  // Reply
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);
  // Views Sheet
  const [viewsOpen, setViewsOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const activeStory = stories[activeStoryIndex];
  const activeItems = activeStory?.items || [];
  const currentItem = activeItems[activeItemIndex];
  
  const isMyStory = activeStory?.user_id === currentUserId;

  // Next/Prev Logic
  const goToNext = useCallback(() => {
    if (showEmojiPicker || viewsOpen) return;
    if (activeItemIndex < activeItems.length - 1) {
      setActiveItemIndex(prev => prev + 1);
      setProgress(0);
    } else if (activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
      setActiveItemIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [activeItemIndex, activeItems.length, activeStoryIndex, stories.length, onClose, showEmojiPicker, viewsOpen]);

  const goToPrev = useCallback(() => {
    if (showEmojiPicker || viewsOpen) return;
    if (activeItemIndex > 0) {
      setActiveItemIndex(prev => prev - 1);
      setProgress(0);
    } else if (activeStoryIndex > 0) {
      setActiveStoryIndex(prev => prev - 1);
      const prevItems = stories[activeStoryIndex - 1]?.items || [];
      setActiveItemIndex(prevItems.length > 0 ? prevItems.length - 1 : 0);
      setProgress(0);
    }
  }, [activeItemIndex, activeStoryIndex, stories, showEmojiPicker, viewsOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'Escape') { 
        if (viewsOpen) { setViewsOpen(false); return; }
        if (showEmojiPicker) { setShowEmojiPicker(false); return; }
        onClose(); 
      }
      if (e.key === ' ') setIsPaused(p => !p);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, onClose, viewsOpen, showEmojiPicker]);

  // Pause when emoji picker or reply focused or views open
  const isInteracting = showEmojiPicker || viewsOpen;
  
  // Read Receipt Registration
  useEffect(() => {
    if (currentItem && currentUserId && currentItem.id) {
      registerView(currentItem.id).catch(console.error);
    }
  }, [currentItem, currentUserId]);

  useEffect(() => {
    if (progress >= 100) goToNext();
  }, [progress, goToNext]);

  // Auto-progress Timer
  useEffect(() => {
    if (isPaused || isInteracting || !currentItem) return;

    if (currentItem.media_type === 'video') {
       let interval: NodeJS.Timeout;
       if (videoRef.current) {
          interval = setInterval(() => {
            if (videoRef.current) {
               const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
               setProgress(percent);
            }
          }, 100);
       } else {
          const durationMs = (currentItem.duration || 10) * 1000;
          const step = 100 / (durationMs / 50);
          interval = setInterval(() => {
            setProgress(prev => { const next = prev + step; return next >= 100 ? 100 : next; });
          }, 50);
       }
       return () => clearInterval(interval);
    } else {
      const durationMs = (currentItem.duration || 5) * 1000;
      const step = 100 / (durationMs / 50); 
      const interval = setInterval(() => {
        setProgress(prev => { const next = prev + step; return next >= 100 ? 100 : next; });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [currentItem, isPaused, isInteracting]);

  const handleDeleteItem = async () => {
    if (!currentItem || !confirm('Delete this story?')) return;
    try {
      setIsPaused(true);
      await deleteStoryItem(currentItem.id);
      onRefreshFeed();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to delete story');
    }
  };

  const handleEmojiReact = async (emoji: string) => {
    if (!currentItem) return;
    setShowEmojiPicker(false);
    setPendingEmoji(emoji);
    try {
      await toggleReaction(currentItem.id, emoji);
      onRefreshFeed();
    } catch (e) {
       console.error(e);
    } finally {
      setTimeout(() => setPendingEmoji(null), 1000);
    }
  };

  const handleSendReply = async () => {
    if (!currentItem || !replyText.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      await addStoryReply(currentItem.id, replyText.trim());
      setReplyText('');
      setReplySuccess(true);
      setTimeout(() => setReplySuccess(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSendingReply(false);
    }
  };

  const userHasLiked = currentItem?.reactions?.some(r => r.user_id === currentUserId);
  const myReaction = currentItem?.reactions?.find(r => r.user_id === currentUserId);
  const totalReactions = currentItem?.reactions?.length || 0;

  if (!activeStory || !currentItem) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(16px)'
        }}
        className="touch-none"
      >
        <div 
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '430px',
            aspectRatio: '9/16',
            backgroundColor: '#0f172a',
            borderRadius: '1.5rem',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            margin: '0 auto',
          }}
          className="touch-pan-y"
        >
          {/* Progress Bars */}
          <div style={{ position: 'absolute', top: '1rem', left: 0, width: '100%', display: 'flex', gap: '0.25rem', padding: '0 1rem', zIndex: 50 }}>
            {activeItems.map((item, idx) => (
              <div key={item.id} style={{ height: '0.25rem', flex: 1, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div 
                  className="h-full bg-white transition-all ease-linear"
                  style={{ 
                    width: idx < activeItemIndex ? '100%' : idx === activeItemIndex ? `${progress}%` : '0%' 
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          {(() => {
            const authorName = activeStory.profile?.name || (isMyStory ? 'My Status' : 'User');
            const authorAvatar = activeStory.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=0D8ABC&color=fff`;
            const timeFormatted = new Date(currentItem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div 
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '100%', 
                  paddingTop: '2.25rem', 
                  paddingBottom: '1.25rem', 
                  paddingLeft: '1rem', 
                  paddingRight: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)', 
                  zIndex: 40 
                }}
              >
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                   <div style={{ position: 'relative', width: '2.5rem', height: '2.5rem', borderRadius: '9999px', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,0.4)', backgroundColor: '#1e293b', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                     <Image 
                       src={authorAvatar} 
                       alt={authorName} 
                       fill 
                       style={{ objectFit: 'cover' }} 
                       unoptimized 
                     />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'white', letterSpacing: '0.01em', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                        {authorName}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.725rem', color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                        <span>{timeFormatted}</span>
                        {activeItems.length > 1 && (
                          <>
                            <span>•</span>
                            <span>{activeItemIndex + 1} of {activeItems.length}</span>
                          </>
                        )}
                      </div>
                   </div>
                 </div>
                 
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {/* Add Story Button */}
                    {onOpenCompose && (
                      <button 
                        onClick={onOpenCompose}
                        style={{ padding: '0.4rem 0.75rem', color: 'white', background: 'linear-gradient(135deg, #25D366, #128C7E)', borderRadius: '9999px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, boxShadow: '0 2px 8px rgba(37,211,102,0.4)', transition: 'transform 0.15s' }}
                        className="hover:scale-105 active:scale-95"
                        title="Add New Story"
                      >
                        <Plus size={14} strokeWidth={3} /> Add Story
                      </button>
                    )}

                    {/* Pause / Play Toggle */}
                    <button 
                      onClick={() => setIsPaused(!isPaused)} 
                      style={{ padding: '0.45rem', color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: '9999px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      className="hover:bg-white/25 transition-colors"
                      title={isPaused ? "Play Story" : "Pause Story"}
                    >
                       {isPaused ? <Play size={18} /> : <Pause size={18} />}
                    </button>

                    {isMyStory && (
                      <div style={{ position: 'relative' }}>
                        <button 
                          onClick={() => setShowMenu(!showMenu)} 
                          style={{ padding: '0.45rem', color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: '9999px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          className="hover:bg-white/25 transition-colors"
                        >
                           <MoreVertical size={18} />
                        </button>
                        {showMenu && (
                          <div style={{ position: 'absolute', right: 0, top: '2.5rem', width: '9rem', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', overflow: 'hidden', padding: '0.25rem 0', zIndex: 60 }}>
                            <button onClick={handleDeleteItem} style={{ width: '100%', padding: '0.5rem 1rem', textAlign: 'left', color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                              <Trash2 size={15} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <button 
                      onClick={onClose} 
                      style={{ padding: '0.45rem', color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: '9999px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      className="hover:bg-white/25 transition-colors"
                    >
                      <X size={20} />
                    </button>
                 </div>
              </div>
            );
          })()}

          {/* Paused Overlay Badge */}
          <AnimatePresence>
            {isPaused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{ position: 'absolute', top: '5.25rem', right: '1rem', zIndex: 45, padding: '0.35rem 0.75rem', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', borderRadius: '9999px', color: '#22d3ee', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', border: '1px solid rgba(34,211,238,0.3)', display: 'flex', alignItems: 'center', gap: '0.35rem', pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
              >
                <Pause size={12} /> PAUSED
              </motion.div>
            )}
          </AnimatePresence>

          {/* Media Container */}
          <div 
            style={{ position: 'absolute', inset: 0, backgroundColor: '#0f172a', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            onPointerDown={(e) => { 
              if (e.clientY > 100 && e.clientY < window.innerHeight - 100 && !showEmojiPicker) {
                setIsPaused(true); 
              }
            }}
            onPointerUp={() => setIsPaused(false)}
            onPointerLeave={() => setIsPaused(false)}
          >
             {currentItem.media_type === 'video' && currentItem.media_url ? (
               <video 
                 ref={videoRef}
                 src={currentItem.media_url}
                 autoPlay
                 playsInline
                 className="w-full h-full object-contain"
                 onEnded={goToNext}
                 muted
               />
             ) : currentItem.media_url ? (
               <Image 
                 src={currentItem.media_url} 
                 alt="Story Media" 
                 fill 
                 className="object-contain" 
                 draggable={false}
                 priority
               />
             ) : (() => {
               let parsed: any = { text: currentItem.caption };
               if (currentItem.caption && currentItem.caption.startsWith('{') && currentItem.caption.endsWith('}')) {
                 try { parsed = JSON.parse(currentItem.caption); } catch (e) {}
               }
               return (
                 <div 
                   className="w-full h-full flex items-center justify-center p-8"
                   style={{ 
                     background: parsed.bg || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                   }}
                 >
                   <p 
                     style={{ 
                       color: parsed.textColor || 'white', 
                       fontFamily: parsed.font || 'inherit',
                       fontWeight: parsed.isBold !== undefined ? (parsed.isBold ? 700 : 400) : 600,
                       fontStyle: parsed.isItalic ? 'italic' : 'normal',
                       textDecoration: parsed.isUnderline ? 'underline' : 'none',
                       textAlign: (parsed.textAlign as any) || 'center',
                       fontSize: parsed.fontSize || '1.8rem',
                       lineHeight: 1.35, 
                       textShadow: '0 2px 12px rgba(0,0,0,0.5)', 
                       wordBreak: 'break-word',
                       maxWidth: '100%'
                     }}
                   >
                     {parsed.text || currentItem.caption}
                   </p>
                 </div>
               );
             })()}

             {currentItem.media_type !== 'text' && currentItem.caption && (
               <div className="absolute bottom-20 w-fit max-w-[80%] mx-auto left-0 right-0 p-3 bg-black/60 backdrop-blur-md rounded-2xl text-center z-40">
                 <span className="text-white font-medium">{currentItem.caption}</span>
               </div>
             )}
          </div>

          {/* Emoji picker floating */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.85 }}
                transition={{ type: 'spring', damping: 22, stiffness: 350 }}
                style={{ position: 'absolute', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 60, display: 'flex', gap: '0.5rem', backgroundColor: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)', padding: '0.6rem 0.75rem', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
              >
                {EMOJI_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiReact(emoji)}
                    style={{ fontSize: '1.5rem', lineHeight: 1, padding: '0.25rem', borderRadius: '50%', transition: 'transform 0.15s', cursor: 'pointer', background: 'none', border: 'none', filter: myReaction?.emoji === emoji ? 'drop-shadow(0 0 6px rgba(255,100,100,0.8))' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.3)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating emoji animation */}
          <AnimatePresence>
            {pendingEmoji && (
              <motion.div
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 0, y: -120, scale: 1.8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9 }}
                style={{ position: 'absolute', bottom: '6rem', left: '50%', transform: 'translateX(-50%)', zIndex: 70, fontSize: '2.5rem', pointerEvents: 'none' }}
              >
                {pendingEmoji}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlays for Next/Prev Tap */}
          <div style={{ position: 'absolute', top: '5rem', bottom: '5rem', left: 0, width: '40%', zIndex: 30 }} onClick={(e) => { e.stopPropagation(); goToPrev(); }} />
          <div style={{ position: 'absolute', top: '5rem', bottom: '5rem', right: 0, width: '40%', zIndex: 30 }} onClick={(e) => { e.stopPropagation(); goToNext(); }} />

          {/* Footer actions */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50, background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
              {isMyStory ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setViewsOpen(true); setIsPaused(true); }}
                  className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mx-auto font-medium cursor-pointer hover:bg-white/20 transition"
                >
                   <Eye size={18} />
                   <span>{currentItem.views?.length || 0} Views</span>
                   {totalReactions > 0 && <span style={{ marginLeft: '0.25rem' }}>· {totalReactions} ❤️</span>}
                </button>
              ) : (
                <div className="flex w-full gap-2 items-center">
                   {/* Reply input */}
                   <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '9999px', padding: '0.4rem 0.75rem', border: replySuccess ? '1px solid #22d3ee' : '1px solid rgba(255,255,255,0.12)', transition: 'border 0.2s' }}>
                     <input 
                       ref={replyInputRef}
                       type="text" 
                       placeholder={replySuccess ? '✓ Sent!' : 'Reply...'} 
                       value={replyText}
                       onChange={e => setReplyText(e.target.value)}
                       onFocus={() => setIsPaused(true)}
                       onBlur={() => setIsPaused(false)}
                       onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendReply(); } }}
                       className="w-full bg-transparent border-none text-white focus:outline-none placeholder:text-white/60 text-sm font-medium"
                     />
                     {replyText.trim() && (
                       <button onClick={(e) => { e.stopPropagation(); handleSendReply(); }} disabled={sendingReply} style={{ color: '#22d3ee', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                         <Send size={18} />
                       </button>
                     )}
                   </div>

                   {/* Emoji reaction toggle */}
                   <button 
                     onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(p => !p); }}
                     style={{ padding: '0.6rem', borderRadius: '50%', backdropFilter: 'blur(8px)', background: showEmojiPicker ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)', color: myReaction ? myReaction.emoji : 'white', fontSize: myReaction ? '1.1rem' : 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '2.5rem', height: '2.5rem', transition: 'background 0.2s' }}
                   >
                     {myReaction ? myReaction.emoji : <Heart size={20} className={userHasLiked ? 'fill-rose-500 text-rose-500' : ''} />}
                   </button>
                </div>
              )}
          </div>

        </div>
      </motion.div>

      {/* Views / Replies Sheet */}
      {isMyStory && currentItem && (
        <StoryViewsSheet
          storyItemId={currentItem.id}
          totalViews={currentItem.views?.length || 0}
          isOpen={viewsOpen}
          onClose={() => { setViewsOpen(false); setIsPaused(false); }}
        />
      )}
    </>
  );
}
