'use server';
// force compiler module flush: reload schema cache bindings

import { createClient } from '@/lib/supabase/server';
import type { Story, StoryItem, StoryPrivacyLevel, StoryMediaType } from '@/types/database';

export type ActionResponse<T> = { success: true; data: T } | { success: false; error: string };

// ─── Constants ──────────────────────────────────────────────────────────────
const STORY_BUCKET = 'story_media';
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
];

// ─── Validation Helpers ─────────────────────────────────────────────────────
function isUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

// ─── Expired Story Cleanup ──────────────────────────────────────────────────
async function cleanupExpiredStories(supabase: any) {
  try {
    const now = new Date().toISOString();
    
    // 1. Soft-delete expired items
    await supabase.from('story_items')
      .update({ deleted_at: now })
      .lt('expires_at', now)
      .is('deleted_at', null);

    // 2. Soft-delete expired master stories
    await supabase.from('stories')
      .update({ deleted_at: now })
      .lt('expires_at', now)
      .is('deleted_at', null);

  } catch (err) {
    console.error('[Story Cleanup Error]', err);
  }
}

// ─── Server-Side Upload Action ───────────────────────────────────────────────
export async function uploadStoryMedia(formData: FormData): Promise<ActionResponse<{ url: string; mediaType: StoryMediaType }>> {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return { success: false, error: 'Not authenticated' };

    const file = formData.get('file') as File | null;
    if (!file || file.size === 0) return { success: false, error: 'No file provided' };

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { success: false, error: `File type "${file.type}" is not allowed.` };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { success: false, error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 20MB.` };
    }

    const userId = userData.user.id;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const uniqueName = `${crypto.randomUUID()}-${Date.now()}.${ext}`;
    const filePath = `${userId}/${uniqueName}`; 

    const { error: uploadError } = await supabase.storage
      .from(STORY_BUCKET)
      .upload(filePath, file, { upsert: false, contentType: file.type });

    if (uploadError) return { success: false, error: `Upload failed: ${uploadError.message}` };

    const { data: { publicUrl } } = supabase.storage.from(STORY_BUCKET).getPublicUrl(filePath);

    const mediaType: StoryMediaType = file.type.startsWith('video/') ? 'video' : 'image';
    return { success: true, data: { url: publicUrl, mediaType } };
  } catch (err: any) {
    console.error('[uploadStoryMedia error]', err);
    return { success: false, error: err.message || 'An unexpected error occurred during upload.' };
  }
}

// ─── Container Management ───────────────────────────────────────────────────
async function getOrCreateActiveStoryContainer(supabase: any, userId: string, visibility: StoryPrivacyLevel = 'everyone'): Promise<string> {
  const now = new Date().toISOString();
  
  const { data: existingStory } = await supabase
    .from('stories')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gt('expires_at', now)
    .single();

  if (existingStory) {
    return existingStory.id;
  }

  // Auto clean up old fragments
  await supabase.from('stories').update({ deleted_at: now }).eq('user_id', userId).is('deleted_at', null);

  const { data: newStory, error } = await supabase
    .from('stories')
    .insert({
      user_id: userId,
      visibility,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return newStory.id;
}

// ─── Create Story Item ──────────────────────────────────────────────────────
export async function createStoryItem(params: {
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  mediaType: StoryMediaType;
  caption: string | null;
  duration?: number;
  visibility?: StoryPrivacyLevel;
}): Promise<ActionResponse<any>> {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return { success: false, error: 'Not authenticated' };

    const storyId = await getOrCreateActiveStoryContainer(supabase, userData.user.id, params.visibility || 'everyone');
    const now = Date.now();
    
    // Set 24 hour item expiry explicitly
    const { data, error } = await supabase
      .from('story_items')
      .insert({
        story_id: storyId,
        media_url: params.mediaUrl,
        thumbnail_url: params.thumbnailUrl,
        media_type: params.mediaType,
        caption: params.caption,
        duration: params.mediaType === 'video' ? (params.duration ?? 30) : (params.duration ?? 5), 
        expires_at: new Date(now + 24 * 60 * 60 * 1000).toISOString()
      })
      .select('*')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    console.error('[createStoryItem error]', err);
    return { success: false, error: err.message || 'Server iteration failed.' };
  }
}

// ─── Fetch Feed ─────────────────────────────────────────────────────────────
export async function fetchStoryFeed(): Promise<ActionResponse<{ myStory: Story | null; activeStories: Story[] }>> {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData?.user?.id;

    await cleanupExpiredStories(supabase);

    const now = new Date().toISOString();
    const { data: rawStories, error } = await supabase
      .from('stories')
      .select(`
        *,
        profile:profiles!inner(id, name, avatar_url, institution_id),
        items:story_items(
          *,
          views:story_views(id, viewed_at, viewer_id, viewer:profiles(id, name, avatar_url))
        )
      `)
      .is('deleted_at', null)
      .gt('expires_at', now)
      .order('updated_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    const stories = (rawStories || []) as unknown as Story[];
    const activeTime = Date.now();
    
    for (const story of stories) {
      if (Array.isArray(story.profile)) story.profile = story.profile[0] as any; // Flatten one-to-one array mapping
      
      story.items = (story.items || [])
        .filter(item => !item.deleted_at && new Date(item.expires_at || 0).getTime() > activeTime)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    const validStories = stories.filter(s => s.items && s.items.length > 0);

    const { data: myProfile } = currentUserId
      ? await supabase.from('profiles').select('institution_id').eq('id', currentUserId).single()
      : { data: null };

    const myStoryNode = validStories.find(s => s.user_id === currentUserId) || null;
    
    // Filter others' stories based on visibility
    const othersStories = validStories.filter(s => {
      if (s.user_id === currentUserId) return false;
      
      if (s.visibility === 'institute') {
         return myProfile && s.profile?.institution_id && s.profile.institution_id === myProfile.institution_id;
      }
      
      return true; // 'everyone' or unhandled scopes fall back to public
    });

    // Grouping unseen vs seen
    othersStories.sort((a, b) => {
      if (!currentUserId) return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();

      const aAllViewed = a.items?.every(item => item.views?.some(v => v.viewer_id === currentUserId));
      const bAllViewed = b.items?.every(item => item.views?.some(v => v.viewer_id === currentUserId));
      
      if (aAllViewed === bAllViewed) {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      return aAllViewed ? 1 : -1;
    });

    return { success: true, data: { myStory: myStoryNode, activeStories: othersStories } };
  } catch (err: any) {
    console.error("[fetchStoryFeed error]:", err);
    return { success: false, error: err.message || 'Error executing feed resolution' };
  }
}

// ─── Deletion APIs ──────────────────────────────────────────────────────────
export async function deleteStory(storyId: string): Promise<ActionResponse<boolean>> {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user || !isUUID(storyId)) return { success: false, error: 'Unauthorized or Invalid' };

    const { error } = await supabase
      .from('stories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', storyId)
      .eq('user_id', userData.user.id);

    if (error) return { success: false, error: error.message };
    return { success: true, data: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteStoryItem(itemId: string): Promise<ActionResponse<boolean>> {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user || !isUUID(itemId)) return { success: false, error: 'Unauthorized or Invalid' };

    const { data: item } = await supabase
      .from('story_items')
      .select('id, story:stories(user_id)')
      .eq('id', itemId)
      .single();

    if (!item) return { success: false, error: 'Not found' };
    
    // Handles array wrapping edge case
    const ownerId = Array.isArray(item.story) ? (item.story[0] as any)?.user_id : (item.story as any)?.user_id;
    if (ownerId !== userData.user.id) return { success: false, error: 'Forbidden' };

    const { error } = await supabase
      .from('story_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', itemId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Viewer Registration & Activity ─────────────────────────────────────────
export async function registerView(storyItemId: string): Promise<ActionResponse<boolean>> {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user || !isUUID(storyItemId)) return { success: false, error: 'Unauthorized' };

    await supabase
      .from('story_views')
      .insert({ story_item_id: storyItemId, viewer_id: userData.user.id })
      .select('id')
      .single();
      
    return { success: true, data: true };
  } catch (err) {
    return { success: true, data: true }; // Ignore duplicates
  }
}

export async function toggleReaction(storyItemId: string, emoji: string): Promise<ActionResponse<boolean>> {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user || !isUUID(storyItemId)) return { success: false, error: 'Unauthorized' };

    const { data: existing } = await supabase
      .from('story_reactions')
      .select('id, emoji')
      .eq('story_item_id', storyItemId)
      .eq('user_id', userData.user.id)
      .single();

    if (existing) {
      if (existing.emoji === emoji) {
         await supabase.from('story_reactions').delete().eq('id', existing.id);
         return { success: true, data: false };
      } else {
         await supabase.from('story_reactions').update({ emoji }).eq('id', existing.id);
         return { success: true, data: true };
      }
    }

    await supabase.from('story_reactions').insert({
      story_item_id: storyItemId,
      user_id: userData.user.id,
      emoji
    });

    return { success: true, data: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

