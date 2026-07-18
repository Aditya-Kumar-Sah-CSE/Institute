'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { fetchActiveStories, toggleStoryReaction, createStory } from '@/features/hall-of-fame/actions/stories';
import type { HallOfFameStory } from '@/types/database';
import { Plus, X, Heart, Trophy, User } from 'lucide-react';
import './StoryCarousel.css';

export default function StoryCarousel({ currentUserId }: { currentUserId?: string }) {
  const [stories, setStories] = useState<HallOfFameStory[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  useEffect(() => {
    fetchActiveStories().then(setStories);
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
      {/* Horizontal Carousel */}
      <div className="story-carousel-container w-full overflow-x-auto no-scrollbar flex items-center gap-4 py-4 px-2 mb-6">
        
        {/* Share Achievement Button */}
        <div className="story-item flex flex-col items-center gap-2 cursor-pointer group flex-shrink-0" onClick={() => alert('Earn badges in lessons to share your achievements to the Hall of Fame!')}>
          <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-dark-paper group-hover:border-neon-cyan group-hover:bg-cyan-50 dark:group-hover:bg-cyan-900/20 transition-colors">
            <Plus size={24} className="text-gray-400 group-hover:text-neon-cyan transition-colors" />
          </div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center leading-tight">Share<br/>Achievement</span>
        </div>

        {/* Existing Stories */}
        {stories.map((story, index) => {
          const profile = story.profile;
          const imageSrc = profile?.avatar_url;
          return (
            <div 
              key={story.id} 
              className="story-item flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 relative group"
              onClick={() => setActiveStoryIndex(index)}
            >
              <div className="story-ring relative w-16 h-16 rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 group-hover:scale-105 transition-transform duration-300 shadow-md shadow-pink-500/20">
                <div className="w-full h-full bg-white dark:bg-dark-paper rounded-full p-[2px]">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    {imageSrc ? (
                      <Image src={imageSrc} alt="avatar" width={100} height={100} className="w-full h-full object-cover" />
                    ) : (
                       <User size={32} className="text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-300 w-16 truncate text-center">
                {profile?.name || 'Student'}
              </span>
            </div>
          );
        })}
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
