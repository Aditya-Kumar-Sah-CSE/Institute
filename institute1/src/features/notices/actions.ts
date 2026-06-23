'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getNotices(limit?: number) {
  const supabase = await createClient();
  let query = supabase
    .from('notices')
    .select('*, profiles(name, role)')
    .order('created_at', { ascending: false });
    
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching notices:', error);
    return [];
  }
  
  return data;
}

export async function createNotice(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  
  if (!title || !content) {
    return { error: 'Title and content are required' };
  }
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const image = formData.get('image') as File | null;
  let image_url = null;

  if (image && image.size > 0) {
    const fileExt = image.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('notices_media')
      .upload(filePath, image);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return { error: 'Failed to upload image' };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('notices_media')
      .getPublicUrl(filePath);

    image_url = publicUrl;
  }
  
  const { error } = await supabase.from('notices').insert({
    title,
    content,
    author_id: user.id,
    image_url
  });
  
  if (error) {
    console.error('Error creating notice:', error);
    return { error: error.message };
  }
  
  revalidatePath('/dashboard');
  revalidatePath('/notices');
  revalidatePath('/admin/notices');
  revalidatePath('/instructor/notices');
  
  return { success: true };
}

export async function deleteNotice(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('notices').delete().eq('id', id);
  
  if (error) {
    console.error('Error deleting notice:', error);
    return { error: error.message };
  }
  
  revalidatePath('/dashboard');
  revalidatePath('/notices');
  revalidatePath('/admin/notices');
  revalidatePath('/instructor/notices');
  
  return { success: true };
}
