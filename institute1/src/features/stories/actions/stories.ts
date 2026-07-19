'use server';

import { createClient } from '@/lib/supabase/server';
import type { Story, StoryItem, StoryPrivacyLevel, StoryMediaType } from '@/types/database';

/**
 * Ensures a user has an active 24h story container, creating one if it doesn't exist or is expired.
 */
async function getOrCreateActiveStoryContainer(supabase: any, userId: string, visibility: StoryPrivacyLevel = 'everyone') {
  // First, check if there's an active one (not expired, not deleted)
  const { data: existingStory } = await supabase
    .from('stories')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (existingStory) {
    // Optionally update visibility if requested differently (optional implementation)
    return existingStory.id;
  }

  // Create new active story container
  // Because of unique(user_id) constraint from older versions, we must ensure old ones are marked deleted
  await supabase
    .from('stories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('deleted_at', null);

  const { data: newStory, error } = await supabase
    .from('stories')
    .insert({
      user_id: userId,
      visibility,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
    .select('id')
    .single();

  if (error) throw error;
  return newStory.id;
}

export async function createStoryItem(params: {
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  mediaType: StoryMediaType;
  caption: string | null;
  duration?: number;
  visibility?: StoryPrivacyLevel;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  const storyId = await getOrCreateActiveStoryContainer(supabase, userData.user.id, params.visibility || 'everyone');

  const { data, error } = await supabase
    .from('story_items')
    .insert({
      story_id: storyId,
      media_url: params.mediaUrl,
      thumbnail_url: params.thumbnailUrl,
      media_type: params.mediaType,
      caption: params.caption,
      duration: params.duration || 5, // Default 5 seconds for images
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function fetchStoryFeed() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData?.user?.id;

  // We want to fetch all active stories, along with their items and views 
  // Normally we would enforce privacy (e.g., Contacts only) - handled by RLS partially, but explicit joined checks help
  
  const { data: rawStories, error } = await supabase
    .from('stories')
    .select(`
      *,
      profile:profiles(id, name, avatar_url),
      items:story_items(
        *,
        views:story_views(viewer_id)
      )
    `)
    .is('deleted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error("fetchStoryFeed error:", error);
    return { myStory: null, activeStories: [] };
  }

  const stories = (rawStories || []) as unknown as Story[];
  
  // Also filter items to only active ones internally
  for (const story of stories) {
    if (story.items) {
      story.items = story.items
        .filter(item => !item.deleted_at && new Date(item.expires_at).getTime() > Date.now())
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
  }

  // Filter out stories with 0 active items
  const validStories = stories.filter(s => s.items && s.items.length > 0);

  const myStoryNode = validStories.find(s => s.user_id === currentUserId) || null;
  
  // Sort others: Not viewed first, then viewed
  // A story is viewed if ALL items are viewed by me
  const othersStories = validStories.filter(s => s.user_id !== currentUserId);

  othersStories.sort((a, b) => {
    // If current user is not logged in, just sort by updated_at
    if (!currentUserId) return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();

    const aAllViewed = a.items?.every(item => item.views?.some(v => v.viewer_id === currentUserId));
    const bAllViewed = b.items?.every(item => item.views?.some(v => v.viewer_id === currentUserId));
    
    if (aAllViewed === bAllViewed) {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
    
    return aAllViewed ? 1 : -1;
  });

  return { 
    myStory: myStoryNode, 
    activeStories: othersStories 
  };
}

export async function deleteStory(storyId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('stories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', storyId)
    .eq('user_id', userData.user.id);

  if (error) throw error;
  return true;
}

export async function deleteStoryItem(itemId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  // Verify ownership via RLS or explicit check
  const { error } = await supabase
    .from('story_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', itemId);

  if (error) throw error;
  return true;
}

export async function registerView(storyItemId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return; // Silent return for unauthenticated views

  // Avoid violating unique constraints if already viewed, ignoring error
  await supabase
    .from('story_views')
    .insert({
      story_item_id: storyItemId,
      viewer_id: userData.user.id
    })
    .select('id')
    .single();
    
  return true;
}

export async function toggleReaction(storyItemId: string, emoji: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  // Look for existing reaction by this user on this item
  const { data: existing } = await supabase
    .from('story_reactions')
    .select('id, emoji')
    .eq('story_item_id', storyItemId)
    .eq('user_id', userData.user.id)
    .single();

  if (existing) {
    if (existing.emoji === emoji) {
       // Toggle OFF
       await supabase.from('story_reactions').delete().eq('id', existing.id);
       return false;
    } else {
       // Update to new emoji
       await supabase.from('story_reactions').update({ emoji }).eq('id', existing.id);
       return true;
    }
  }

  // Insert new
  await supabase.from('story_reactions').insert({
    story_item_id: storyItemId,
    user_id: userData.user.id,
    emoji
  });

  return true;
}
