'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const STORY_BUCKET = 'story_media';
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_LOGO_SIZE = 3 * 1024 * 1024; // 3MB logo limit

export async function submitStudentApp(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { error: 'Not authenticated' };

  const student_name = formData.get('student_name') as string;
  const mobile_no = formData.get('mobile_no') as string;
  const batch = formData.get('batch') as string;
  const problem_addressing = formData.get('problem_addressing') as string;
  const solution = formData.get('solution') as string;
  const working_url = formData.get('working_url') as string;
  const app_name = formData.get('app_name') as string;
  const logoFile = formData.get('app_logo') as File | null;

  if (!student_name || !mobile_no || !batch || !problem_addressing || !solution || !working_url || !app_name) {
    return { error: 'All text fields are required.' };
  }

  if (!logoFile || logoFile.size === 0) {
    return { error: 'App logo image file is required.' };
  }

  if (!ALLOWED_MIME_TYPES.includes(logoFile.type)) {
    return { error: 'Invalid file type for app logo. Allowed: JPG, PNG, WEBP, GIF.' };
  }

  if (logoFile.size > MAX_LOGO_SIZE) {
    return { error: 'App logo file size is too large. Maximum is 3MB.' };
  }

  try {
    const userId = userData.user.id;
    const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
    const uniqueName = `logo-${crypto.randomUUID()}-${Date.now()}.${ext}`;

    let publicUrl: string;

    // Check Google Drive connection
    const adminSb = await createAdminClient();
    const { data: driveRecord } = await adminSb
      .from('user_google_drive_tokens')
      .select('root_folder_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (driveRecord?.root_folder_id) {
      // Upload to Google Drive
      try {
        const { uploadFileToGoogleDrive } = await import('@/features/profile/actions/google-drive');
        const arrayBuffer = await logoFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await uploadFileToGoogleDrive({
          filename: uniqueName,
          mimeType: logoFile.type,
          fileBuffer: buffer,
          category: 'Projects',
        });

        if (result.success && result.googleDriveFileId) {
          publicUrl = `/api/drive/files/${result.googleDriveFileId}`;
        } else {
          throw new Error(result.error || 'Drive upload failed');
        }
      } catch (driveErr: any) {
        // Fall back to Supabase
        console.warn('[submitStudentApp] Drive upload failed, falling back to Supabase:', driveErr.message);
        const filePath = `${userId}/${uniqueName}`;
        const { error: uploadError } = await supabase.storage
          .from(STORY_BUCKET)
          .upload(filePath, logoFile, { upsert: false, contentType: logoFile.type });
        if (uploadError) throw new Error(`Upload logo failed: ${uploadError.message}`);
        publicUrl = supabase.storage.from(STORY_BUCKET).getPublicUrl(filePath).data.publicUrl;
      }
    } else {
      // Upload to Supabase Storage
      const filePath = `${userId}/${uniqueName}`; // Must be under userId/ folder for RLS storage policy
      const { error: uploadError } = await supabase.storage
        .from(STORY_BUCKET)
        .upload(filePath, logoFile, { upsert: false, contentType: logoFile.type });
      if (uploadError) throw new Error(`Upload logo failed: ${uploadError.message}`);
      publicUrl = supabase.storage.from(STORY_BUCKET).getPublicUrl(filePath).data.publicUrl;
    }

    const { error: insertError } = await supabase
      .from('student_apps')
      .insert({
        user_id: userId,
        student_name: student_name.trim(),
        mobile_no: mobile_no.trim(),
        batch: batch.trim(),
        problem_addressing: problem_addressing.trim(),
        solution: solution.trim(),
        working_url: working_url.trim(),
        app_name: app_name.trim(),
        app_logo_url: publicUrl,
        status: 'pending'
      });

    if (insertError) throw insertError;

    // Send notification ONLY to Admin users (not faculty/instructor)
    try {
      const adminSb = await createAdminClient();
      const { data: admins } = await adminSb
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'developer']);

      if (admins && admins.length > 0) {
        const notifications = admins.map(a => ({
          user_id: a.id,
          type: 'system',
          message: `🚀 Innovation Hub: New showcase "${app_name.trim()}" submitted by ${student_name.trim()} awaiting approval.`,
          link: '/leaderboard'
        }));
        await adminSb.from('notifications').insert(notifications);
      }
    } catch (notifErr) {
      console.error('Failed to send notification to admin:', notifErr);
    }

    revalidatePath('/leaderboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to submit app showcase.' };
  }
}

async function requireAdminRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
    throw new Error('Unauthorized: Admin access required for Innovation Hub approvals.');
  }

  return { supabase, user };
}

export async function approveStudentApp(id: string) {
  try {
    const { supabase } = await requireAdminRole();
    const { error } = await supabase
      .from('student_apps')
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/leaderboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to approve app.' };
  }
}

export async function rejectStudentApp(id: string) {
  try {
    const { supabase } = await requireAdminRole();
    const { error } = await supabase
      .from('student_apps')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/leaderboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to reject app.' };
  }
}

export async function deleteStudentApp(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Fetch the app to verify owner or check if admin
    const { data: app, error: fetchError } = await supabase
      .from('student_apps')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !app) throw new Error('Application not found.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile && ['admin', 'developer'].includes(profile.role);
    if (app.user_id !== user.id && !isAdmin) {
      throw new Error('Forbidden: You are not allowed to delete this application.');
    }

    // Delete the application
    const { error: deleteError } = await supabase
      .from('student_apps')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    revalidatePath('/leaderboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete app showcase.' };
  }
}
