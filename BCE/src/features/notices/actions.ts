'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { validateFiles, serializeAttachmentUrls } from '@/lib/attachments';
import { uploadFilesServerSide } from '@/lib/attachments.server';

export async function getNotices(limit?: number) {
  // Fire-and-forget cleanup of expired notices
  try {
    const adminSupabase = await createAdminClient();
    // Don't await this so it doesn't block the request
    adminSupabase.from('notices').delete().lt('expires_at', new Date().toISOString())
      .then(({ error }) => { if (error) console.error('Auto-delete expired notices error:', error); });
  } catch (error) {
    console.error('Failed to init cleanup routine', error);
  }

  const supabase = await createClient();
    let query = supabase
      .from('notices')
      .select('*, profiles(name, role, email)')
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

  const images = formData.getAll('image') as File[];
  const validImages = images.filter(img => img && img.size > 0);
  let image_url = null;

  if (validImages.length > 0) {
    const valResult = validateFiles(validImages, { maxFiles: 5 });
    if (!valResult.valid) {
      return { error: valResult.error };
    }

    const { urls, errors } = await uploadFilesServerSide({
      files: validImages,
      bucketName: 'notices_media',
      pathPrefix: user.id,
      category: 'Notices',
      userId: user.id,
    });

    if (errors.length > 0) {
      console.error('Errors uploading notice images:', errors);
      if (urls.length === 0) {
        return { error: 'Failed to upload images' };
      }
    }

    image_url = serializeAttachmentUrls(urls);
  }
  
  const expiresAtStr = formData.get('expires_at') as string;
  let expires_at;
  if (expiresAtStr) {
    expires_at = new Date(expiresAtStr).toISOString();
  } else {
    const date = new Date();
    date.setMonth(date.getMonth() + 6);
    expires_at = date.toISOString();
  }

  const { error } = await supabase.from('notices').insert({
    title,
    content,
    author_id: user.id,
    image_url,
    expires_at
  });
  
  if (error) {
    console.error('Error creating notice:', error);
    return { error: error.message };
  }
  
  // Notify all users about the new notice (excluding author)
  const { data: activeUsers } = await supabase.from('profiles').select('id').neq('id', user.id);
  if (activeUsers && activeUsers.length > 0) {
    const notifications = activeUsers.map(u => ({
      user_id: u.id,
      type: 'notice',
      message: `Important Announcement: ${title}`,
      link: '/dashboard'
    }));
    await supabase.from('notifications').insert(notifications);
  }
  
  revalidatePath('/dashboard');
  revalidatePath('/notices');
  revalidatePath('/admin/notices');
  revalidatePath('/instructor/notices');
  
  return { success: true };
}

async function canManageNotice(supabase: Awaited<ReturnType<typeof createClient>>, id: string, userId: string) {
  const [{ data: notice }, { data: profile }] = await Promise.all([
    supabase.from('notices').select('author_id').eq('id', id).maybeSingle(),
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
  ]);
  if (!notice) return false;
  const role = (profile?.role || '').toLowerCase();
  return notice.author_id === userId || ['admin', 'super_admin', 'superadmin', 'developer'].includes(role);
}

export async function updateNotice(formData: FormData) {
  const id = String(formData.get('id') || '');
  const title = String(formData.get('title') || '').trim();
  const content = String(formData.get('content') || '').trim();
  const expiresAtValue = String(formData.get('expires_at') || '').trim();
  if (!id || !title || !content) return { error: 'Title and content are required' };

  let expires_at: string | null = null;
  if (expiresAtValue) {
    const date = new Date(expiresAtValue);
    if (Number.isNaN(date.getTime())) return { error: 'Invalid expiration date' };
    expires_at = date.toISOString();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  if (!await canManageNotice(supabase, id, user.id)) return { error: 'You are not allowed to edit this notice' };

  const { error } = await supabase.from('notices').update({ title, content, expires_at }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/notices');
  revalidatePath('/admin/notices');
  revalidatePath('/instructor/notices');
  return { success: true };
}

export async function deleteNotice(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  if (!await canManageNotice(supabase, id, user.id)) return { error: 'You are not allowed to delete this notice' };
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
