'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { fetchActiveStories, toggleStoryReaction, createStory } from '@/features/hall-of-fame/actions/stories';
import type { HallOfFameStory } from '@/types/database';
import { Plus, X, Heart, Trophy, User, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './StoryCarousel.css';

export default function StoryCarousel({ currentUserId }: { currentUserId?: string }) {
  const [stories, setStories] = useState<HallOfFameStory[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    fetchActiveStories().then(st => {
      console.log('--- AUDIT CLIENT: Initial Load fetchActiveStories result size:', st?.length);
      setStories(st);
    });

    const handleNewStory = () => {
      console.log('--- AUDIT CLIENT: story-added event triggered in StoryCarousel');
      fetchActiveStories().then(st => {
         console.log('--- AUDIT CLIENT: Event triggered fetchActiveStories result size:', st?.length);
         setStories(st);
      });
    };
    window.addEventListener('story-added', handleNewStory);
    
    return () => {
      window.removeEventListener('story-added', handleNewStory);
    };
  }, []);

  useEffect(() => {
    if (activeStoryIndex === null || isPaused) return;
    const timer = setTimeout(() => {
      setActiveStoryIndex(prev => {
        if (prev === null) return null;
        if (prev < stories.length - 1) return prev + 1;
        return null;
      });
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeStoryIndex, stories.length, isPaused]);

  // Close share menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setIsShareMenuOpen(false);
      }
    }
    if (isShareMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isShareMenuOpen]);

  const handleToggleLike = async (story: HallOfFameStory) => {
    if (!currentUserId) return;
    
    // Optimistic Update
    const hasLiked = story.reactions?.some(l => l.user_id === currentUserId) || false;
    
    setStories(prev => prev.map(s => {
      if (s.id === story.id) {
        const newReactions = hasLiked
          ? (s.reactions || []).filter(l => l.user_id !== currentUserId)
          : [...(s.reactions || []), { story_id: story.id, user_id: currentUserId, reaction: 'like', created_at: new Date().toISOString() }];
        
        return {
          ...s,
          reactions: newReactions,
          _count: { ...s._count, reactions: newReactions.length }
        };
      }
      return s;
    }));

    try {
      await toggleStoryReaction(story.id, hasLiked, 'like');
    } catch(err) {
      console.error(err);
      fetchActiveStories().then(setStories); // Rollback
    }
  };

  const activeStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  return (
    <>
      {/* Rectangular Box with Glassmorphism */}
      <div className="relative mb-6" ref={shareMenuRef}>
        <div className="story-carousel-container w-full bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-xl shadow-black/20 overflow-x-auto no-scrollbar flex items-center gap-5 py-6 px-5 relative z-10">
          
          {/* Your Story Button (Instagram Style) */}
          <div 
            className="flex flex-col items-center gap-2 cursor-pointer group flex-shrink-0 relative" 
            onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
          >
            <div className="relative w-16 h-16">
               <div className="w-full h-full rounded-full overflow-hidden border border-slate-700 dark:border-slate-700 bg-slate-800 flex items-center justify-center p-[2px]">
                   <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                       <User size={30} className="text-slate-400" />
                   </div>
               </div>
               {/* Blue Plus Overlay */}
               <div className="absolute -bottom-1 -right-0 w-[24px] h-[24px] bg-blue-500 rounded-full border-2 border-slate-900 dark:border-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                 <Plus size={16} className="text-white stroke-[3px]" />
               </div>
            </div>
            <span className="text-[11px] font-medium text-slate-300 mt-1">Your Story</span>
          </div>

          {/* Existing Stories (Instagram style rings) */}
          {stories.map((story, index) => {
            const profile = story.profile;
            const imageSrc = profile?.avatar_url;
            return (
              <div 
                key={story.id} 
                className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 group"
                onClick={() => setActiveStoryIndex(index)}
              >
                <div className="story-ring relative w-16 h-16 rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 group-hover:scale-105 transition-transform duration-300 shadow-md shadow-pink-500/20">
                  <div className="w-full h-full bg-white dark:bg-[#0F172A] rounded-full p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                      {imageSrc ? (
                        <Image src={imageSrc} alt="avatar" width={100} height={100} className="w-full h-full object-cover" />
                      ) : (
                         <User size={28} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-slate-300 w-16 truncate text-center mt-1">
                  {profile?.name || 'Student'}
                </span>
              </div>
            );
          })}

        </div>

        {/* Render Share Menu POPUP Outside the overflow-x-auto container! */}
        <AnimatePresence>
          {isShareMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.8 }}
              className="absolute left-4 top-[120px] w-[240px] rounded-[20px] overflow-hidden z-50 shadow-2xl"
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 20px 50px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}
            >
              <div className="flex flex-col p-2 space-y-1">
                {/* Share Action */}
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05, duration: 0.2 }}
                  className="group relative flex items-center w-full p-3 rounded-2xl text-left bg-transparent hover:bg-blue-500/12 transition-colors duration-200"
                  onClick={() => { setIsShareMenuOpen(false); alert('Material sharing modal coming soon!'); }}
                >
                   <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform duration-200">
                     <Upload size={20} className="stroke-2" />
                   </div>
                   <div className="ml-3 flex flex-col">
                     <span className="font-semibold text-[15px] leading-snug text-slate-100 group-hover:text-blue-500 transition-colors">Share</span>
                     <span className="text-[12px] leading-tight text-slate-400 mt-[2px] group-hover:text-blue-200/70 transition-colors">Material, PDF, Link</span>
                   </div>
                </motion.button>

                {/* Achievement Action */}
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                  whileHover={{ y: -2 }}
                  className="group relative flex items-center w-full p-3 rounded-2xl text-left bg-transparent hover:bg-blue-500/12 transition-colors duration-200"
                  onClick={() => { setIsShareMenuOpen(false); alert('Earn badges to share to the Hall of Fame!'); }}
                >
                   <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 group-hover:text-amber-400 transition-all duration-200" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))' }}>
                     <Trophy size={20} className="stroke-2" />
                   </div>
                   <div className="ml-3 flex flex-col">
                     <span className="font-semibold text-[15px] leading-snug text-slate-100 group-hover:text-amber-400 transition-colors">Achievement</span>
                     <span className="text-[12px] leading-tight text-slate-400 mt-[2px] group-hover:text-amber-200/70 transition-colors">Badges, XP, Rank</span>
                   </div>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full Screen Viewer Viewer */}
      {activeStory && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center">
          <button 
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors bg-white/10 p-2 rounded-full backdrop-blur"
            onClick={() => setActiveStoryIndex(null)}
          >
            <X size={24} />
          </button>

          <div 
            className="relative w-full max-w-sm aspect-[9/16] bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl overflow-hidden shadow-2xl shadow-purple-900/50 flex flex-col"
            onPointerDown={() => setIsPaused(true)}
            onPointerUp={() => setIsPaused(false)}
            onPointerLeave={() => setIsPaused(false)}
          >
            {/* Progress Bars */}
            <div className="absolute top-3 left-0 w-full flex gap-1 px-3 z-20">
              {stories.map((s, idx) => (
                <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                  <div 
                    className={`h-full bg-white transition-all ease-linear ${
                      idx < (activeStoryIndex || 0) ? 'w-full' : idx === activeStoryIndex && !isPaused ? 'animate-story-progress w-0' : idx === activeStoryIndex && isPaused ? 'w-full' : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>
            
            {/* Header */}
            <div className="pt-8 pb-4 px-4 flex items-center gap-3 bg-gradient-to-b from-black/60 to-transparent z-10 absolute top-0 left-0 w-full">
               <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-gray-800 flex justify-center items-center">
                 {activeStory.profile?.avatar_url ? (
                   <Image src={activeStory.profile.avatar_url!} alt="avatar" width={60} height={60} className="object-cover w-full h-full" />
                 ) : (
                   <User size={20} className="text-gray-400" />
                 )}
               </div>
               <div>
                  <h3 className="text-white font-bold text-sm shadow-black drop-shadow-md">{activeStory.profile?.name}</h3>
                  <p className="text-white/70 text-xs">{new Date(activeStory.created_at).toLocaleString([], { hour: '2-digit', minute:'2-digit' })}</p>
               </div>
            </div>

            {/* Story Content / Badge Simulation */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 mt-12 mb-24">
              <div className="w-32 h-32 rounded-full flex items-center justify-center bg-gradient-to-br from-neon-cyan to-neon-purple shadow-[0_0_50px_rgba(0,242,254,0.3)] mb-8 animate-pulse text-white">
                {activeStory.category === 'badge' && <Trophy size={64} />}
                {activeStory.category === 'xp' && <Heart size={64} />}
                {activeStory.category === 'course' && <Plus size={64} />}
                {['badge', 'xp', 'course'].indexOf(activeStory.category || '') === -1 && <Trophy size={64} />}
              </div>
              <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-purple mb-4 text-center">
                 {activeStory.category === 'badge' ? 'Unlocked Badge' : 'New Achievement'}!
              </h3>
              <p className="text-xl text-white/90 text-center max-w-md font-medium leading-relaxed font-sans">
                {activeStory.caption}
              </p>
            </div>

            {/* Footer / Like */}
            <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col items-center bg-gradient-to-t from-black/80 to-transparent">
              <button 
                onClick={() => handleToggleLike(activeStory)}
                className={`p-4 rounded-full transition-all group duration-300 ${activeStory.reactions?.some(l => l.user_id === currentUserId) ? 'bg-rose-500/20 border border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'bg-white/10 border border-white/20 hover:bg-white/20'}`}
              >
                <Heart size={32} className={`transition-all duration-300 ${activeStory.reactions?.some(l => l.user_id === currentUserId) ? 'text-rose-500 fill-rose-500 scale-110' : 'text-white group-hover:scale-110'}`} />
              </button>
              <div className="mt-2 text-white/80 font-medium text-sm flex items-center gap-1">
                 {activeStory.reactions?.length || 0} {activeStory.reactions?.length === 1 ? 'Like' : 'Likes'}
              </div>
            </div>

            {/* Navigation Overlays */}
            <div className="absolute inset-y-0 left-0 w-1/3" onClick={(e) => { e.stopPropagation(); setActiveStoryIndex(prev => (prev! > 0 ? prev! - 1 : prev)) }} />
            <div className="absolute inset-y-0 right-0 w-1/3" onClick={(e) => { e.stopPropagation(); setActiveStoryIndex(prev => (prev! < stories.length - 1 ? prev! + 1 : prev)) }} />
          </div>
        </div>
      )}
    </>
  );
}
