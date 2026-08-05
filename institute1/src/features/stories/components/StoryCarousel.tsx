'use client';
// force compiler module flush: reset DOM mismatches

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, User } from 'lucide-react';
import { fetchStoryFeed } from '@/features/stories/actions/stories';
import type { Story, StoryItem } from '@/types/database';
import StoryComposerSheet from './StoryComposerSheet';
import StoryViewerCanvas from './StoryViewerCanvas';
import './StoryCarousel.css';

interface StoryFeedData {
  myStory: Story | null;
  activeStories: Story[];
}

export default function StoryCarousel({ currentUserId, currentUserAvatar }: { currentUserId?: string, currentUserAvatar?: string }) {
  const [feed, setFeed] = useState<StoryFeedData>({ myStory: null, activeStories: [] });
  const [loading, setLoading] = useState(true);
  
  // Internal State
  const [composeOpen, setComposeOpen] = useState(false);
  const [viewerActive, setViewerActive] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  // We unify `myStory` as index 0, and rest linearly if it exists.
  // Wait, if `myStory` exists but viewer opens it, it should just be first element internally in viewer.
  // We'll construct a flat array `playableStories` for the viewer.
  const playableStories = feed.myStory ? [feed.myStory, ...feed.activeStories] : feed.activeStories;

  const loadFeed = async () => {
    try {
      const result = await fetchStoryFeed();
      if (result.success) {
        setFeed(result.data);
      } else {
        console.error("Failed to fetch stories:", result.error);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
    
    const handleRefresh = () => setTimeout(loadFeed, 300); // 300ms delay for db settle
    window.addEventListener('story-added', handleRefresh);
    window.addEventListener('story-deleted', handleRefresh);
    return () => {
      window.removeEventListener('story-added', handleRefresh);
      window.removeEventListener('story-deleted', handleRefresh);
    };
  }, []);
  
  if (loading) {
     return (
       <div className="w-full flex gap-3 overflow-x-hidden px-4 mb-6">
         {[1,2,3,4].map(idx => (
           <div key={idx} className="w-[105px] h-[155px] bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse flex-shrink-0" />
         ))}
       </div>
     );
  }

  const hasMyStory = !!feed.myStory && (feed.myStory.items?.length || 0) > 0;
  
  // Ring Computation Logic
  const getRingColor = (story: Story) => {
     if (!story || !story.items) return 'border-transparent';
     if (story.user_id === currentUserId) return 'border-[#25D366]'; // Own story is green
     
     // Is it Unread or completely Read?
     // Unread if ANY item lacks currentUserId in its views
     const isViewedcompletely = story.items.every(item => 
       item.views?.some(v => v.viewer_id === currentUserId)
     );
     
     if (isViewedcompletely) return 'border-slate-400 dark:border-slate-600'; // Gray ring
     return 'border-[#25D366]'; // Gradient/Green for unread currently
  };

  return (
    <>
      <div className="relative mb-6 w-full">
        <h3 className="text-[16px] font-medium text-slate-700 dark:text-slate-200 mb-2 px-1">Status</h3>
        
        <div className="story-carousel-container w-full overflow-x-auto no-scrollbar flex items-center gap-3 py-1 relative z-10 pl-1 pb-4 border-b border-slate-200 dark:border-slate-800" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflowX: 'auto', scrollSnapType: 'x mandatory' }}>
          
          {/* My Status */}
          <div 
            className={`relative w-[105px] h-[155px] rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer group shadow-sm bg-slate-800 transition-all ${hasMyStory ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-[#25D366]' : 'border border-slate-200 dark:border-slate-700'}`}
            style={{ position: 'relative', width: '105px', height: '155px', borderRadius: '1rem', overflow: 'hidden', flexShrink: 0 }}
            onClick={() => {
              if (hasMyStory) {
                const myIndex = playableStories.findIndex(s => s.user_id === currentUserId);
                setViewerStartIndex(myIndex);
                setViewerActive(true);
              } else {
                setComposeOpen(true);
              }
            }}
          >
             {/* Thumbnail background logic if exist */}
             {(hasMyStory && feed.myStory?.items?.[0]?.media_url && feed.myStory.items[0].media_type === 'image') ? (
                <Image src={feed.myStory.items[0].media_url} alt="My Status" fill className="object-cover opacity-80" style={{ objectFit: 'cover', opacity: 0.8 }} />
             ) : currentUserAvatar ? (
                <Image src={currentUserAvatar} alt="My Avatar" fill className="object-cover opacity-60 backdrop-blur-sm grayscale-[30%]" style={{ objectFit: 'cover', opacity: 0.6, filter: 'blur(4px) grayscale(30%)' }} />
             ) : null}
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-0" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', zIndex: 0 }}></div>

             {/* Avatar Area */}
             <div className="absolute top-2 left-2 z-10" style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', zIndex: 10 }}>
               <div className={`w-10 h-10 rounded-full flex items-center justify-center relative p-[2px] bg-slate-300 dark:bg-slate-700 \${hasMyStory ? getRingColor(feed.myStory!) : ''}`} style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', position: 'relative' }}>
                 <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden flex items-center justify-center">
                   {currentUserAvatar ? (
                      <Image src={currentUserAvatar} alt="My Avatar" fill className="object-cover" />
                   ) : (
                      <User size={20} className="text-slate-500" />
                   )}
                 </div>
                 {/* Always show plus button so they can add multiple stories */}
                 <div 
                   className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#25D366] rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center translate-x-0.5 translate-y-0.5 z-20 cursor-pointer hover:bg-emerald-500 transition-colors"
                   onClick={(e) => { e.stopPropagation(); setComposeOpen(true); }}
                   title="Add another status"
                 >
                   <Plus size={10} className="text-white stroke-[3px]" />
                 </div>
               </div>
             </div>

             <span className="absolute bottom-2 left-2 text-[13px] font-medium text-white drop-shadow-md z-30" style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', fontSize: '13px', fontWeight: 500, color: 'white', zIndex: 30, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>My status</span>
          </div>

          {/* Active Stories */}
          {feed.activeStories.map((story) => {
            const firstItem = story.items?.[0];
            const ringColor = getRingColor(story);
            const globalIndex = playableStories.findIndex(s => s.id === story.id);

            return (
              <div 
                key={story.id} 
                className="relative w-[105px] h-[155px] rounded-2xl bg-slate-800 overflow-hidden flex-shrink-0 cursor-pointer group shadow-sm transition-transform hover:scale-[1.02]"
                style={{ position: 'relative', width: '105px', height: '155px', borderRadius: '1rem', overflow: 'hidden', flexShrink: 0 }}
                onClick={() => {
                  setViewerStartIndex(globalIndex);
                  setViewerActive(true);
                }}
              >
                {/* Background Media */}
                {(firstItem?.media_url && firstItem.media_type === 'image') ? (
                  <Image src={firstItem.media_url} alt="Status" fill className="object-cover" />
                ) : firstItem?.media_type === 'video' && firstItem.media_url ? (
                  <video src={firstItem.media_url} className="w-full h-full object-cover opacity-90" muted playsInline />
                ) : story.profile?.avatar_url ? (
                  <Image src={story.profile.avatar_url} alt="Avatar Fallback" fill className="object-cover opacity-40 blur-sm grayscale-[50%]" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-0"></div>
                
                {/* Avatar */}
                <div className="absolute top-2 left-2 z-10" style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', zIndex: 10 }}>
                  <div className={`w-10 h-10 rounded-full border-[2.5px] p-[2px] ${ringColor} bg-white dark:bg-slate-800`} style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px' }}>
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      {story.profile?.avatar_url ? (
                        <Image src={story.profile.avatar_url} alt="avatar" width={40} height={40} className="object-cover" />
                      ) : (
                        <User size={20} className="text-slate-500" />
                      )}
                    </div>
                  </div>
                </div>
                
                <span className="absolute bottom-2 left-2 text-[13px] font-medium text-white drop-shadow-md z-30 truncate w-[85%]" style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', fontSize: '13px', fontWeight: 500, color: 'white', zIndex: 30, textShadow: '0 1px 2px rgba(0,0,0,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '85%' }}>
                  {story.profile?.name || 'User'}
                </span>
              </div>
            );
          })}
          
        </div>
      </div>

      {/* Overlays */}
      <StoryComposerSheet 
        isOpen={composeOpen} 
        onClose={() => setComposeOpen(false)} 
        onStoryAdded={() => window.dispatchEvent(new Event('story-added'))}
      />
      
      {viewerActive && playableStories.length > 0 && (
        <StoryViewerCanvas 
          stories={playableStories} 
          initialStoryIndex={viewerStartIndex} 
          currentUserId={currentUserId}
          onClose={() => setViewerActive(false)}
          onRefreshFeed={loadFeed}
        />
      )}
    </>
  );
}
