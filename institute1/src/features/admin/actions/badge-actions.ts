'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function addCourseBadge(courseId: string, formData: FormData) {
  try {
    const supabase = await createServerClient();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      throw new Error('Unauthorized');
    }

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const bonus_xp = parseInt(formData.get('bonus_xp') as string || '0', 10);
    const file = formData.get('icon_file') as File;

    if (!name || !file || file.size === 0) {
      throw new Error('Name and Image are required.');
    }

    // Upload image to avatars bucket (under badges/ folder)
    const fileExt = file.name.split('.').pop();
    const filePath = `badges/badge_${courseId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      throw new Error(`Failed to upload badge image: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Insert badge
    const { error: insertError } = await supabaseAdmin.from('badges').insert({
      name,
      description,
      icon: publicUrl,
      condition_type: 'course_complete',
      course_id: courseId,
      bonus_xp
    });

    if (insertError) {
      throw new Error(`Failed to save badge: ${insertError.message}`);
    }

    revalidatePath(`/admin/courses/${courseId}/builder`);
    revalidatePath(`/instructor/courses/${courseId}/builder`);
    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    console.error(error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { error: errorMsg };
  }
}

export async function deleteCourseBadge(badgeId: string, courseId: string) {
  try {
    const supabase = await createServerClient();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      throw new Error('Unauthorized');
    }

    // Get badge image path to delete it from storage
    const { data: badge } = await supabaseAdmin.from('badges').select('icon').eq('id', badgeId).single();
    if (badge && badge.icon) {
      // public url looks like: https://.../storage/v1/object/public/avatars/badges/badge_123.png
      // we need the path: badges/badge_123.png
      const parts = badge.icon.split('/avatars/');
      if (parts.length > 1) {
        const filePath = parts[1];
        await supabaseAdmin.storage.from('avatars').remove([filePath]);
      }
    }

    const { error } = await supabaseAdmin.from('badges').delete().eq('id', badgeId);
    
    if (error) throw new Error(error.message);

    revalidatePath(`/admin/courses/${courseId}/builder`);
    revalidatePath(`/instructor/courses/${courseId}/builder`);
    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    console.error(error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { error: errorMsg };
  }
}
