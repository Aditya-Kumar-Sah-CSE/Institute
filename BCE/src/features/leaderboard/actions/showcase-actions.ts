'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const STORY_BUCKET = 'story_media';
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_LOGO_SIZE = 3 * 1024 * 1024; // 3MB logo limit

const REVIEWER_ROLES = ['admin', 'super_admin', 'instructor', 'developer'];

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

    // Use centralized storage service (Drive-first, Supabase-fallback)
    const { uploadSingleFileWithFallback } = await import('@/lib/storage-service');
    const uploadResult = await uploadSingleFileWithFallback({
      file: logoFile,
      filename: uniqueName,
      mimeType: logoFile.type,
      bucketName: STORY_BUCKET,
      pathPrefix: userId,
      category: 'Projects',
      userId,
    });

    if (!uploadResult.success || !uploadResult.url) {
      throw new Error(uploadResult.error || 'Failed to upload app logo');
    }

    publicUrl = uploadResult.url;

    const adminSb = await createAdminClient();
    const { error: insertError } = await adminSb
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

    // Send notification to Admin & Instructor reviewers
    try {
      const { data: reviewers } = await adminSb
        .from('profiles')
        .select('id')
        .in('role', REVIEWER_ROLES);

      if (reviewers && reviewers.length > 0) {
        const notifications = reviewers.map(a => ({
          user_id: a.id,
          type: 'system',
          message: `🚀 Innovation Hub: New showcase "${app_name.trim()}" submitted by ${student_name.trim()} awaiting approval.`,
          link: '/leaderboard'
        }));
        await adminSb.from('notifications').insert(notifications);
      }
    } catch (notifErr) {
      console.error('Failed to send notification to reviewers:', notifErr);
    }

    revalidatePath('/leaderboard');
    revalidatePath('/instructor/submissions');
    revalidatePath('/admin/submissions');
    revalidatePath('/instructor');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to submit app showcase.' };
  }
}

export async function updateStudentApp(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { error: 'Not authenticated' };

  const id = formData.get('id') as string;
  const student_name = formData.get('student_name') as string;
  const mobile_no = formData.get('mobile_no') as string;
  const batch = formData.get('batch') as string;
  const problem_addressing = formData.get('problem_addressing') as string;
  const solution = formData.get('solution') as string;
  const working_url = formData.get('working_url') as string;
  const app_name = formData.get('app_name') as string;
  const logoFile = formData.get('app_logo') as File | null;

  if (!id || !student_name || !mobile_no || !batch || !problem_addressing || !solution || !working_url || !app_name) {
    return { error: 'All text fields are required.' };
  }

  try {
    const adminSb = await createAdminClient();
    const userId = userData.user.id;

    // Fetch existing app to verify owner or reviewer
    const { data: existingApp, error: fetchErr } = await adminSb
      .from('student_apps')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existingApp) return { error: 'Application not found.' };

    const { data: profile } = await adminSb
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const isReviewer = profile && REVIEWER_ROLES.includes(profile.role);
    if (existingApp.user_id !== userId && !isReviewer) {
      return { error: 'Forbidden: You are not allowed to edit this application.' };
    }

    let publicUrl = existingApp.app_logo_url;

    // Optional logo replacement
    if (logoFile && logoFile.size > 0) {
      if (!ALLOWED_MIME_TYPES.includes(logoFile.type)) {
        return { error: 'Invalid file type for app logo. Allowed: JPG, PNG, WEBP, GIF.' };
      }
      if (logoFile.size > MAX_LOGO_SIZE) {
        return { error: 'App logo file size is too large. Maximum is 3MB.' };
      }

      const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
      const uniqueName = `logo-${crypto.randomUUID()}-${Date.now()}.${ext}`;

      const { uploadSingleFileWithFallback } = await import('@/lib/storage-service');
      const uploadResult = await uploadSingleFileWithFallback({
        file: logoFile,
        filename: uniqueName,
        mimeType: logoFile.type,
        bucketName: STORY_BUCKET,
        pathPrefix: existingApp.user_id,
        category: 'Projects',
        userId: existingApp.user_id,
      });

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Failed to upload app logo');
      }

      publicUrl = uploadResult.url;
    }

    const { error: updateError } = await adminSb
      .from('student_apps')
      .update({
        student_name: student_name.trim(),
        mobile_no: mobile_no.trim(),
        batch: batch.trim(),
        problem_addressing: problem_addressing.trim(),
        solution: solution.trim(),
        working_url: working_url.trim(),
        app_name: app_name.trim(),
        app_logo_url: publicUrl,
        // Reset to pending so changes can be verified by reviewers
        status: isReviewer ? existingApp.status : 'pending'
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Send notification to reviewers about edit
    try {
      const { data: reviewers } = await adminSb
        .from('profiles')
        .select('id')
        .in('role', REVIEWER_ROLES);

      if (reviewers && reviewers.length > 0) {
        const notifications = reviewers
          .filter(r => r.id !== userId)
          .map(r => ({
            user_id: r.id,
            type: 'system',
            message: `📝 Innovation Hub: Showcase "${app_name.trim()}" updated by ${student_name.trim()} awaiting review.`,
            link: '/leaderboard'
          }));
        if (notifications.length > 0) {
          await adminSb.from('notifications').insert(notifications);
        }
      }
    } catch (nErr) {
      console.error('Failed to send update notification:', nErr);
    }

    revalidatePath('/leaderboard');
    revalidatePath('/instructor/submissions');
    revalidatePath('/admin/submissions');
    revalidatePath('/instructor');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update app showcase.' };
  }
}

async function requireReviewerRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const adminSb = await createAdminClient();
  const { data: profile } = await adminSb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !REVIEWER_ROLES.includes(profile.role)) {
    throw new Error('Unauthorized: Admin or Instructor access required for Innovation Hub approvals.');
  }

  return { supabase: adminSb, user, profile };
}

export async function approveStudentApp(id: string) {
  try {
    const { supabase } = await requireReviewerRole();
    const { error } = await supabase
      .from('student_apps')
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/leaderboard');
    revalidatePath('/instructor/submissions');
    revalidatePath('/admin/submissions');
    revalidatePath('/instructor');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to approve app.' };
  }
}

export async function rejectStudentApp(id: string) {
  try {
    const { supabase } = await requireReviewerRole();
    const { error } = await supabase
      .from('student_apps')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/leaderboard');
    revalidatePath('/instructor/submissions');
    revalidatePath('/admin/submissions');
    revalidatePath('/instructor');
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

    const adminSb = await createAdminClient();
    // Fetch the app to verify owner or check if reviewer
    const { data: app, error: fetchError } = await adminSb
      .from('student_apps')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !app) throw new Error('Application not found.');

    const { data: profile } = await adminSb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isReviewer = profile && REVIEWER_ROLES.includes(profile.role);
    if (app.user_id !== user.id && !isReviewer) {
      throw new Error('Forbidden: You are not allowed to delete this application.');
    }

    // Delete the application via admin client
    const { error: deleteError } = await adminSb
      .from('student_apps')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    revalidatePath('/leaderboard');
    revalidatePath('/instructor/submissions');
    revalidatePath('/admin/submissions');
    revalidatePath('/instructor');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete app showcase.' };
  }
}
