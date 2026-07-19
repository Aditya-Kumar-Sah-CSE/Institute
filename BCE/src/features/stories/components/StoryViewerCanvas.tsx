'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Heart, MoreVertical, Play, Pause, Trash2, Eye } from 'lucide-react';
import Image from 'next/image';
import type { Story, StoryItem } from '@/types/database';
import { registerView, toggleReaction, deleteStoryItem } from '@/features/stories/actions/stories';

interface StoryViewerCanvasProps {
  stories: Story[];
  initialStoryIndex: number;
  currentUserId?: string;
  onClose: () => void;
  onRefreshFeed: () => void;
}

export default function StoryViewerCanvas({ 
  stories, 
  initialStoryIndex, 
  currentUserId,
  onClose,
  onRefreshFeed
}: StoryViewerCanvasProps) {
  const [activeStoryIndex, setActiveStoryIndex] = useState(initialStoryIndex);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const activeStory = stories[activeStoryIndex];
  const activeItems = activeStory?.items || [];
  const currentItem = activeItems[activeItemIndex];
  
  const isMyStory = activeStory?.user_id === currentUserId;

  // Next/Prev Logic
  const goToNext = useCallback(() => {
    if (activeItemIndex < activeItems.length - 1) {
      setActiveItemIndex(prev => prev + 1);
      setProgress(0);
    } else if (activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
      setActiveItemIndex(0);
      setProgress(0);
    } else {
      onClose(); // End of all stories
    }
  }, [activeItemIndex, activeItems.length, activeStoryIndex, stories.length, onClose]);

  const goToPrev = useCallback(() => {
    if (activeItemIndex > 0) {
      setActiveItemIndex(prev => prev - 1);
      setProgress(0);
    } else if (activeStoryIndex > 0) {
      setActiveStoryIndex(prev => prev - 1);
      const prevItems = stories[activeStoryIndex - 1]?.items || [];
      setActiveItemIndex(prevItems.length > 0 ? prevItems.length - 1 : 0);
      setProgress(0);
    }
  }, [activeItemIndex, activeStoryIndex, stories]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') setIsPaused(p => !p);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, onClose]);

  // Read Receipt Registration
  useEffect(() => {
    if (currentItem && currentUserId && currentItem.id) {
      registerView(currentItem.id).catch(console.error);
    }
  }, [currentItem, currentUserId]);

  useEffect(() => {
    if (progress >= 100) {
      goToNext();
    }
  }, [progress, goToNext]);

  // Auto-progress Timer
  useEffect(() => {
    if (isPaused || !currentItem) return;

    if (currentItem.media_type === 'video') {
       // Video controls its own progress if we have the reference
       let interval: NodeJS.Timeout;
       if (videoRef.current) {
          interval = setInterval(() => {
            if (videoRef.current) {
               const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
               setProgress(percent);
            }
          }, 100);
       } else {
          // If ref not caught instantly, fallback to timer
          const durationMs = (currentItem.duration || 10) * 1000;
          const step = 100 / (durationMs / 50); // 50ms interval updates
          interval = setInterval(() => {
            setProgress(prev => {
              const next = prev + step;
              return next >= 100 ? 100 : next;
            });
          }, 50);
       }
       return () => clearInterval(interval);
    } else {
      // Photo / Text progress
      const durationMs = (currentItem.duration || 5) * 1000;
      const step = 100 / (durationMs / 50); 
      
      const interval = setInterval(() => {
        setProgress(prev => {
          const next = prev + step;
          return next >= 100 ? 100 : next;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [currentItem, isPaused]);


  const handleDeleteItem = async () => {
    if (!currentItem || !confirm('Delete this story?')) return;
    try {
      setIsPaused(true);
      await deleteStoryItem(currentItem.id);
      onRefreshFeed();
      onClose(); // Exit cleanly
    } catch (e) {
      console.error(e);
      alert('Failed to delete story');
    }
  };

  const handleLike = async () => {
    if (!currentItem) return;
    try {
      await toggleReaction(currentItem.id, '❤️');
      onRefreshFeed();
    } catch (e) {
       console.error(e);
    }
  };

  const userHasLiked = currentItem?.reactions?.some(r => r.user_id === currentUserId);

  if (!activeStory || !currentItem) return null;

  return (
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
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', paddingTop: '2rem', paddingBottom: '1rem', paddingLeft: '1rem', paddingRight: '1rem', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)', zIndex: 40 }}>
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/20 overflow-hidden flex-shrink-0">
               {activeStory.profile?.avatar_url ? (
                 <Image src={activeStory.profile.avatar_url} alt="Profile" width={40} height={40} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-800 font-bold">
                    {activeStory.profile?.name?.charAt(0) || '?'}
                 </div>
               )}
             </div>
             <div>
                <h3 className="text-white font-semibold text-sm drop-shadow-md">{activeStory.profile?.name}</h3>
                <p className="text-white/70 text-xs drop-shadow-md">
                   {new Date(currentItem.created_at).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                </p>
             </div>
           </div>
           
           <div className="flex items-center gap-2">
              {isMyStory && (
                <div className="relative">
                  <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-white/90 hover:bg-white/10 rounded-full">
                     <MoreVertical size={20} />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-10 w-36 bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl overflow-hidden py-1">
                      <button onClick={handleDeleteItem} className="w-full px-4 py-2 text-left text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 text-sm font-medium">
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button 
                onClick={onClose} 
                className="p-2 text-white/90 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
           </div>
        </div>

        {/* Media Container */}
        <div 
          style={{ position: 'absolute', inset: 0, backgroundColor: '#0f172a', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          onPointerDown={(e) => { 
            // Only pause if clicking center region not top header
            if (e.clientY > 100 && e.clientY < window.innerHeight - 100) {
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
               muted // Typically unmuted on tap, left muted by default for safe autoplay
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
           ) : (
             <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900 p-8">
               <p className="text-white text-3xl font-semibold text-center leading-snug drop-shadow-xl" style={{ wordBreak: 'break-word' }}>
                 {currentItem.caption}
               </p>
             </div>
           )}

           {currentItem.media_type !== 'text' && currentItem.caption && (
             <div className="absolute bottom-20 w-fit max-w-[80%] mx-auto left-0 right-0 p-3 bg-black/60 backdrop-blur-md rounded-2xl text-center z-40">
               <span className="text-white font-medium">{currentItem.caption}</span>
             </div>
           )}
        </div>

        {/* Overlays for Next/Prev Tap */}
        <div style={{ position: 'absolute', top: '5rem', bottom: '5rem', left: 0, width: '40%', zIndex: 30 }} onClick={(e) => { e.stopPropagation(); goToPrev(); }} />
        <div style={{ position: 'absolute', top: '5rem', bottom: '5rem', right: 0, width: '40%', zIndex: 30 }} onClick={(e) => { e.stopPropagation(); goToNext(); }} />

        {/* Footer actions */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
            {isMyStory ? (
              <div className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mx-auto font-medium cursor-pointer hover:bg-white/20 transition">
                 <Eye size={18} />
                 <span>{currentItem.views?.length || 0} Views</span>
              </div>
            ) : (
              <div className="flex w-full gap-2 items-center">
                 <div className="flex-1 bg-white/10 backdrop-blur-md rounded-full px-4 py-2">
                   <input type="text" placeholder="Reply..." className="w-full bg-transparent border-none text-white focus:outline-none placeholder:text-white/60 text-sm font-medium" />
                 </div>
                 <button 
                  onClick={(e) => { e.stopPropagation(); handleLike(); }}
                  className={`p-2.5 rounded-full backdrop-blur-md transition-colors ${userHasLiked ? 'bg-rose-500/20 text-rose-500' : 'bg-white/10 text-white shadow-sm'}`}
                 >
                    <Heart size={20} className={userHasLiked ? 'fill-rose-500' : ''} />
                 </button>
              </div>
            )}
        </div>

      </div>
    </motion.div>
  );
}
