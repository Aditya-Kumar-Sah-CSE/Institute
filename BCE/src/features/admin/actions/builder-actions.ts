'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { validateFiles, uploadFiles, serializeAttachmentUrls } from '@/lib/attachments';

// Authorization helper — verifies the user has admin or instructor role
async function requireBuilderRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor' && profile.role !== 'developer')) {
    throw new Error('Unauthorized: admin, instructor, or developer role required');
  }

  return { supabase, user, role: profile.role };
}

// --- LESSON ACTIONS ---

export async function generateLessonUploadUrls(courseId: string, files: { name: string, type: string, size: number }[]) {
  const { supabase, user, role } = await requireBuilderRole();
  
  // Verify course permission
  const { data: course } = await supabase.from('courses').select('id, created_by').eq('id', courseId).single();
  if (!course) return { error: 'Course not found' };
  
  if (role !== 'admin' && role !== 'developer') {
    const isCreator = course.created_by === user.id;
    const { data: isInstructor } = await supabase
      .from('course_instructors')
      .select('id')
      .eq('course_id', courseId)
      .eq('instructor_id', user.id)
      .maybeSingle();

    if (!isCreator && !isInstructor) {
      return { error: 'Unauthorized to modify this course' };
    }
  }

  // Validate files
  const maxSizeMB = 10;
  for (const f of files) {
    if (f.size > maxSizeMB * 1024 * 1024) return { error: `File ${f.name} exceeds ${maxSizeMB}MB` };
  }

  const adminSupabase = await createAdminClient();
  const bucketName = 'lesson_notes';
  
  const uploadData = [];
  for (const f of files) {
    const ext = f.name.split('.').pop();
    const uniqueFilename = `${crypto.randomUUID()}-${Date.now()}.${ext}`;
    const path = `lesson_${courseId}/${uniqueFilename}`;
    
    const { data, error } = await adminSupabase.storage.from(bucketName).createSignedUploadUrl(path);
    if (error) return { error: error.message };
    
    uploadData.push({
      path,
      signedUrl: data.signedUrl,
      token: data.token,
      name: f.name
    });
  }

  return { success: true, uploadData };
}

export async function deleteOrphanedLessonFiles(paths: string[]) {
  await requireBuilderRole(); // Just to ensure authenticated builder
  if (!paths || paths.length === 0) return { success: true };
  const adminSupabase = await createAdminClient();
  const { error } = await adminSupabase.storage.from('lesson_notes').remove(paths);
  if (error) return { error: error.message };
  return { success: true };
}

export async function addLesson(courseId: string, formData: FormData) {
  const { supabase } = await requireBuilderRole();
  const title = formData.get('title') as string;
  const youtube_url = formData.get('youtube_url') as string;
  const notes = formData.get('notes') as string;
  const xp_reward = parseInt(formData.get('xp_reward') as string || '20');
  let sort_order = parseInt(formData.get('sort_order') as string);
  let week_number = parseInt(formData.get('week_number') as string);
  const pdf_file = formData.get('pdf_file') as File | null;
  const uploaded_paths_str = formData.get('uploaded_paths') as string | null;

  if (isNaN(sort_order) || isNaN(week_number)) {
    // Auto-calculate sort_order and week_number
    const { data: existingLessons } = await supabase
      .from('lessons')
      .select('sort_order, week_number')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: false })
      .limit(1);
    
    if (existingLessons && existingLessons.length > 0) {
      sort_order = existingLessons[0].sort_order + 1;
      week_number = Math.ceil(sort_order / 7);
    } else {
      sort_order = 1;
      week_number = 1;
    }
  }

  if (!title) return { error: 'Lesson title is required' };

  let pdf_url = null;
  
  if (uploaded_paths_str) {
    try {
      const paths = JSON.parse(uploaded_paths_str) as string[];
      if (paths.length > 0) {
        // Prevent arbitrary paths by ensuring it belongs to this course
        const validPaths = paths.filter(p => p.startsWith(`lesson_${courseId}/`));
        if (validPaths.length !== paths.length) return { error: 'Invalid file paths provided' };
        
        const urls = validPaths.map(path => supabase.storage.from('lesson_notes').getPublicUrl(path).data.publicUrl);
        pdf_url = serializeAttachmentUrls(urls);
      }
    } catch (e) {
      return { error: 'Invalid uploaded paths data' };
    }
  } else {
    const pdf_files = formData.getAll('pdf_file') as File[];
    const validFiles = pdf_files.filter(f => f && f.size > 0);

    if (validFiles.length > 0) {
      const valResult = validateFiles(validFiles, { maxFiles: 10 });
      if (!valResult.valid) {
        return { error: valResult.error };
      }

      const adminSupabase = await createAdminClient();
      const { urls, errors } = await uploadFiles({
        files: validFiles,
        supabase: adminSupabase,
        bucketName: 'lesson_notes',
        pathPrefix: `lesson_${courseId}`,
        ensureBucket: true
      });

      if (errors.length > 0 && urls.length === 0) {
        return { error: `Failed to upload notes: ${errors[0]}` };
      }

      pdf_url = serializeAttachmentUrls(urls);
    }
  }

  const { error } = await supabase.from('lessons').insert({
    course_id: courseId,
    title,
    youtube_url: youtube_url || null,
    notes: notes || null,
    pdf_url,
    xp_reward,
    sort_order,
    week_number,
  });

  if (error) return { error: error.message };

  // Notify enrolled students
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('user_id')
    .eq('course_id', courseId)
    .eq('status', 'approved');

  if (enrollments && enrollments.length > 0) {
    const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single();
    if (course) {
      const notifications = enrollments.map(e => ({
        user_id: e.user_id,
        type: 'notice',
        message: `New Lesson Unlocked: "${title}" in course ${course.title}`,
        link: `/courses/${courseId}`
      }));
      await supabase.from('notifications').insert(notifications);
    }
  }

  revalidatePath(`/admin/courses/${courseId}/builder`);
  revalidatePath(`/instructor/courses/${courseId}/builder`);
  return { success: true };
}

export async function updateLesson(lessonId: string, courseId: string, formData: FormData) {
  const { supabase } = await requireBuilderRole();
  const title = formData.get('title') as string;
  const youtube_url = formData.get('youtube_url') as string;
  const notes = formData.get('notes') as string;
  const xp_reward = parseInt(formData.get('xp_reward') as string || '20');
  const sort_order = parseInt(formData.get('sort_order') as string);
  const week_number = parseInt(formData.get('week_number') as string);
  const pdf_file = formData.get('pdf_file') as File | null;
  const uploaded_paths_str = formData.get('uploaded_paths') as string | null;

  const clear_attachment = formData.get('clear_attachment') === 'true';
  const clear_content = formData.get('clear_content') === 'true';

  const updateData: any = {
    title,
    youtube_url: clear_content ? null : (youtube_url || null),
    notes: clear_content ? null : (notes || null),
    xp_reward,
  };

  if (clear_attachment || clear_content) {
    updateData.pdf_url = null;
  }

  // Only update sort_order and week_number if they were explicitly provided
  if (!isNaN(sort_order)) updateData.sort_order = sort_order;
  if (!isNaN(week_number)) updateData.week_number = week_number;

  if (uploaded_paths_str) {
    try {
      const paths = JSON.parse(uploaded_paths_str) as string[];
      if (paths.length > 0) {
        const validPaths = paths.filter(p => p.startsWith(`lesson_${courseId}/`));
        if (validPaths.length !== paths.length) return { error: 'Invalid file paths provided' };
        
        // Append to existing pdf_url if needed? The form currently replaces everything or we handle it based on old UI?
        // Actually the current UI replaces everything unless we just don't touch it.
        // Wait, the current implementation sets pdf_url if validFiles.length > 0.
        // We will just replace it.
        const urls = validPaths.map(path => supabase.storage.from('lesson_notes').getPublicUrl(path).data.publicUrl);
        updateData.pdf_url = serializeAttachmentUrls(urls);
      }
    } catch (e) {
      return { error: 'Invalid uploaded paths data' };
    }
  } else {
    const pdf_files = formData.getAll('pdf_file') as File[];
    const validFiles = pdf_files.filter(f => f && f.size > 0);

    if (validFiles.length > 0) {
      const valResult = validateFiles(validFiles, { maxFiles: 10 });
      if (!valResult.valid) {
        return { error: valResult.error };
      }

      const adminSupabase = await createAdminClient();
      const { urls, errors } = await uploadFiles({
        files: validFiles,
        supabase: adminSupabase,
        bucketName: 'lesson_notes',
        pathPrefix: `lesson_${courseId}`,
        ensureBucket: true
      });

      if (errors.length > 0 && urls.length === 0) {
        return { error: `Failed to upload note: ${errors[0]}` };
      }

      updateData.pdf_url = serializeAttachmentUrls(urls);
    }
  }

  const { error } = await supabase.from('lessons').update(updateData).eq('id', lessonId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/courses/${courseId}/builder`);
  revalidatePath(`/instructor/courses/${courseId}/builder`);
  return { success: true };
}

export async function deleteLesson(lessonId: string, courseId: string) {
  const { supabase } = await requireBuilderRole();
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
  
  if (error) return { error: error.message };

  revalidatePath(`/admin/courses/${courseId}/builder`);
  revalidatePath(`/instructor/courses/${courseId}/builder`);
  return { success: true };
}

// --- ASSIGNMENT ACTIONS ---

export async function addAssignment(lessonId: string, courseId: string, formData: FormData) {
  const { supabase } = await requireBuilderRole();
  const title = formData.get('title') as string;
  const type = formData.get('type') as string;
  const description = formData.get('description') as string;
  const xp_reward = parseInt(formData.get('xp_reward') as string || '50');
  const requires_github = formData.get('requires_github') === 'true';
  const requires_deploy = formData.get('requires_deploy') === 'true';
  const due_date_str = formData.get('due_date') as string | null;
  const expected_output_files = formData.getAll('expected_output_file') as File[];

  if (!title) return { error: 'Assignment title is required' };

  // Calculate default due_date: 3 months from now if not provided
  let due_date: string;
  if (due_date_str) {
    due_date = new Date(due_date_str).toISOString();
  } else {
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 3);
    due_date = defaultDate.toISOString();
  }

  let expected_output = null;
  const validFiles = expected_output_files.filter(file => file instanceof File && file.size > 0);

  if (validFiles.length > 0) {
    const validation = validateFiles(validFiles, { allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'] });
    if (!validation.valid) return { error: validation.error };

    const adminSupabase = await createAdminClient();
    const uploadResult = await uploadFiles({
      files: validFiles,
      supabase: adminSupabase,
      bucketName: 'attachments',
      pathPrefix: `assignments/${courseId}`,
      ensureBucket: true
    });

    if (uploadResult.errors.length > 0) {
      return { error: uploadResult.errors.join('; ') };
    }

    if (uploadResult.urls.length > 0) {
      expected_output = serializeAttachmentUrls(uploadResult.urls);
    }
  }

  const { error } = await supabase.from('assignments').insert({
    lesson_id: lessonId,
    title,
    type,
    description: description || null,
    xp_reward,
    requires_github,
    requires_deploy,
    due_date,
    expected_output: expected_output,
  });

  if (error) return { error: error.message };

  // Notify enrolled students
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('user_id')
    .eq('course_id', courseId)
    .eq('status', 'approved');

  if (enrollments && enrollments.length > 0) {
    const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single();
    if (course) {
      const notifications = enrollments.map(e => ({
        user_id: e.user_id,
        type: 'notice',
        message: `New Assignment Added: "${title}" in course ${course.title}`,
        link: `/courses/${courseId}`
      }));
      await supabase.from('notifications').insert(notifications);
    }
  }

  revalidatePath(`/admin/courses/${courseId}/builder`);
  revalidatePath(`/instructor/courses/${courseId}/builder`);
  return { success: true };
}

export async function updateAssignment(assignmentId: string, courseId: string, formData: FormData) {
  const { supabase } = await requireBuilderRole();
  const title = formData.get('title') as string;
  const type = formData.get('type') as string;
  const description = formData.get('description') as string;
  const xp_reward = parseInt(formData.get('xp_reward') as string || '50');
  const requires_github = formData.get('requires_github') === 'true';
  const requires_deploy = formData.get('requires_deploy') === 'true';
  const due_date_str = formData.get('due_date') as string | null;
  const expected_output_files = formData.getAll('expected_output_file') as File[];
  const clearAttachment = formData.get('clear_attachment') === 'on';

  let updateData: Record<string, any> = {
    title,
    type,
    description: description || null,
    xp_reward,
    requires_github,
    requires_deploy,
  };

  if (due_date_str !== null && due_date_str !== undefined) {
    updateData.due_date = due_date_str ? new Date(due_date_str).toISOString() : null;
  }

  if (clearAttachment) {
    updateData.expected_output = null;
  } else {
    const validFiles = expected_output_files.filter(file => file instanceof File && file.size > 0);
    if (validFiles.length > 0) {
      const validation = validateFiles(validFiles, { allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'] });
      if (!validation.valid) return { error: validation.error };

      const adminSupabase = await createAdminClient();
      const uploadResult = await uploadFiles({
        files: validFiles,
        supabase: adminSupabase,
        bucketName: 'attachments',
        pathPrefix: `assignments/${courseId}`,
        ensureBucket: true
      });

      if (uploadResult.errors.length > 0) {
        return { error: uploadResult.errors.join('; ') };
      }

      if (uploadResult.urls.length > 0) {
        updateData.expected_output = serializeAttachmentUrls(uploadResult.urls);
      }
    }
  }

  const { error } = await supabase.from('assignments').update(updateData).eq('id', assignmentId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/courses/${courseId}/builder`);
  revalidatePath(`/instructor/courses/${courseId}/builder`);
  return { success: true };
}

export async function deleteAssignment(assignmentId: string, courseId: string) {
  const { supabase } = await requireBuilderRole();
  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
  
  if (error) return { error: error.message };

  revalidatePath(`/admin/courses/${courseId}/builder`);
  revalidatePath(`/instructor/courses/${courseId}/builder`);
  return { success: true };
}
