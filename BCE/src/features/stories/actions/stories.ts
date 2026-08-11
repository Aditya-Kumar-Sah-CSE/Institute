'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Story, StoryItem, StoryPrivacyLevel, StoryMediaType } from '@/types/database';

// ─── Constants ──────────────────────────────────────────────────────────────
const STORY_BUCKET = 'story_media';
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
];

// ─── Server-Side Upload Action ───────────────────────────────────────────────
/**
 * Receives a raw File object from the client, validates it, then uploads it
 * server-side using the authenticated server Supabase client.
 * Never exposes the service-role key; uses session-bound authenticated client.
 */
export async function uploadStoryMedia(formData: FormData): Promise<{ url: string; mediaType: StoryMediaType }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) throw new Error('No file provided');

  // Validate type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`File type "${file.type}" is not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 20MB.`);
  }

  const userId = userData.user.id;
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const uniqueName = `${crypto.randomUUID()}-${Date.now()}.${ext}`;
  const filePath = `${userId}/${uniqueName}`; // Must be under user_id/ for RLS to pass

  const { error: uploadError } = await supabase.storage
    .from(STORY_BUCKET)
    .upload(filePath, file, { upsert: false, contentType: file.type });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage.from(STORY_BUCKET).getPublicUrl(filePath);

  const mediaType: StoryMediaType = file.type.startsWith('video/') ? 'video' : 'image';
  return { url: publicUrl, mediaType };
}

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
        views:story_views(viewer_id),
        reactions:story_reactions(id, emoji, user_id, profile:profiles(id, name, avatar_url))
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

  // Explicitly verify that this item belongs to the current user via story ownership
  // Prevents enumeration attacks where a user deletes others' story items by ID
  const { data: item } = await supabase
    .from('story_items')
    .select('id, story:stories(user_id)')
    .eq('id', itemId)
    .single();

  if (!item) throw new Error('Story item not found');

  const ownerId = (item.story as any)?.user_id;
  if (ownerId !== userData.user.id) throw new Error('Forbidden: you do not own this item');

  const { error } = await supabase
    .from('story_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', itemId);

  if (error) throw error;
  
  // Revalidate to ensure UI refreshes immediately
  revalidatePath('/dashboard');
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

export async function addStoryReply(storyItemId: string, message: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');
  if (!message.trim()) throw new Error('Message cannot be empty');

  const { data, error } = await supabase
    .from('story_replies')
    .insert({
      story_item_id: storyItemId,
      sender_id: userData.user.id,
      message: message.trim(),
    })
    .select('*')
    .single();

  if (error) throw error;

  // Attempt to find the story owner to send a chat message
  try {
    const { data: itemData } = await supabase
      .from('story_items')
      .select('id, media_url, story:stories(user_id)')
      .eq('id', storyItemId)
      .single();

    const ownerId = (itemData?.story as any)?.user_id;
    if (ownerId && ownerId !== userData.user.id) {
      // Get or create direct chat
      const { data: convId } = await supabase.rpc('get_or_create_direct_chat', { peer_id: ownerId });
      
      if (convId) {
        await supabase.from('chat_messages').insert({
          conversation_id: convId,
          sender_id: userData.user.id,
          content: `Replied to your status: "${message.trim()}"`,
          attachment_type: itemData?.media_url ? 'image' : 'text',
          attachment_link: itemData?.media_url || null
        });
        revalidatePath('/dashboard/chat');
      }
    }
  } catch (chatError) {
    console.error('Failed to send status reply to chat:', chatError);
  }

  return data;
}

export async function fetchStoryViews(storyItemId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('story_views')
    .select(`
      viewer_id,
      viewed_at,
      profile:profiles!story_views_viewer_id_fkey(id, name, avatar_url)
    `)
    .eq('story_item_id', storyItemId)
    .order('viewed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchStoryReplies(storyItemId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('story_replies')
    .select(`
      id,
      message,
      created_at,
      sender_id,
      profile:profiles!story_replies_sender_id_fkey(id, name, avatar_url)
    `)
    .eq('story_item_id', storyItemId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

