'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { HallOfFameStory } from '@/types/database';

export async function fetchActiveStories(): Promise<HallOfFameStory[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('hall_of_fame')
    .select(`
      *,
      profile:profiles(id, name, avatar_url, level, role),
      reactions:story_reactions(user_id, reaction),
      views:story_views(viewer_id)
    `)
    .gt('expires_at', new Date().toISOString())
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('--- AUDIT DB Error fetching active stories:', error);
    return [];
  }

  console.log('--- AUDIT DB fetchActiveStories Result Count:', data?.length);

  // Optional: manually join reference_id if needed, or wait until expanded component.
  return (data || []) as unknown as HallOfFameStory[];
}

export async function createStory(
  categoryId: string | null, 
  categoryType: 'badge'|'leaderboard'|'xp'|'certificate'|'course'|'faculty', 
  caption: string,
  imageUrl: string
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  console.log('--- AUDIT DB createStory payload:', {
    user_id: userData.user.id,
    reference_id: categoryId,
    category: categoryType,
    caption,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });

  const { data, error } = await supabase
    .from('hall_of_fame')
    .insert({
      user_id: userData.user.id,
      reference_id: categoryId,
      category: categoryType,
      caption,
      image_url: imageUrl,
      is_hidden: false,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
    .select();

  console.log('--- AUDIT DB createStory Result:', { error, data });

  if (error) throw new Error(error.message);

  revalidatePath('/', 'layout');
}

export async function toggleStoryReaction(storyId: string, currentlyReacted: boolean, reactionType: string = 'like') {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  if (currentlyReacted) {
    const { error } = await supabase
      .from('story_reactions')
      .delete()
      .eq('story_id', storyId)
      .eq('user_id', userData.user.id);
      
    if (error) throw new Error(error.message);
  } else {
    // Upsert or insert depending on if they are just changing reaction or adding new
    const { error } = await supabase
      .from('story_reactions')
      .upsert({
        story_id: storyId,
        user_id: userData.user.id,
        reaction: reactionType
      }, { onConflict: 'story_id, user_id' });
      
    if (error) throw new Error(error.message);
  }

  revalidatePath('/dashboard');
}
