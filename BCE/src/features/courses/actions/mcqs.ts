'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { validateFiles, uploadFiles } from '@/lib/attachments';
import type { CourseMCQ, CourseMCQAttempt } from '@/types/database';

async function requireMcqManager(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isStaff = profile && ['admin', 'instructor', 'developer'].includes(profile.role);

  if (!isStaff) {
    const adminSupabase = await createAdminClient();
    const { data: course } = await adminSupabase
      .from('courses')
      .select('created_by')
      .eq('id', courseId)
      .single();

    if (!course || course.created_by !== user.id) {
      throw new Error('Unauthorized: Staff or Course Creator permission required');
    }
  }

  return { supabase, user, isStaff };
}

export async function getCourseMcqsAction(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isStaff = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    isStaff = !!(profile && ['admin', 'instructor', 'developer'].includes(profile.role));
  }

  // Fetch active MCQs for this course
  const { data: mcqsData, error: mcqError } = await supabase
    .from('course_mcqs')
    .select('*')
    .eq('course_id', courseId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (mcqError) {
    console.error('Error fetching course MCQs:', mcqError);
    return { mcqs: [], attempts: [], isStaff: false };
  }

  // Fetch student's attempt history if logged in
  let attempts: CourseMCQAttempt[] = [];
  if (user) {
    const { data: attemptsData } = await supabase
      .from('course_mcq_attempts')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false });
      
    attempts = (attemptsData || []) as CourseMCQAttempt[];
  }

  // Security Rule: Strip correct_option for students
  const mcqs: CourseMCQ[] = (mcqsData || []).map((mcq: any) => {
    if (!isStaff) {
      const { correct_option, ...publicMcq } = mcq;
      return publicMcq as CourseMCQ;
    }
    return mcq as CourseMCQ;
  });

  return { mcqs, attempts, isStaff };
}

export async function createCourseMcqAction(formData: FormData) {
  const courseId = formData.get('course_id') as string;
  if (!courseId) return { error: 'Course ID is required' };

  const { supabase, user } = await requireMcqManager(courseId);

  const sourceType = (formData.get('source_type') as string) || 'scratch';
  const questionText = (formData.get('question_text') as string) || '';
  const optionA = (formData.get('option_a') as string) || '';
  const optionB = (formData.get('option_b') as string) || '';
  const optionC = (formData.get('option_c') as string) || '';
  const optionD = (formData.get('option_d') as string) || '';
  const correctOption = (formData.get('correct_option') as string) || 'A';
  const competencyId = (formData.get('competency_id') as string) || null;
  const topicId = (formData.get('topic_id') as string) || null;
  const difficulty = (formData.get('difficulty') as string) || 'medium';
  const marks = parseInt((formData.get('marks') as string) || '1', 10);

  const imageFile = formData.get('image_file') as File | null;

  if (!optionA || !optionB || !optionC || !optionD) {
    return { error: 'All 4 options (A, B, C, D) are required.' };
  }

  if (!correctOption) {
    return { error: 'Please select at least one correct answer option (A, B, C, or D).' };
  }

  let questionImageUrl: string | null = null;

  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    const valResult = validateFiles([imageFile], { allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'], maxSizeMB: 10 });
    if (!valResult.valid) {
      return { error: valResult.error };
    }

    const adminSupabase = await createAdminClient();
    const { urls, errors } = await uploadFiles({
      files: [imageFile],
      supabase: adminSupabase,
      bucketName: 'attachments',
      pathPrefix: `mcqs/${courseId}`,
      ensureBucket: true
    });

    if (errors.length > 0 && urls.length === 0) {
      return { error: `Failed to upload image: ${errors[0]}` };
    }
    questionImageUrl = urls[0] || null;
  }

  if (sourceType === 'image' && !questionImageUrl) {
    return { error: 'MCQ Image upload is required for image method.' };
  }

  if (sourceType === 'scratch' && !questionText && !questionImageUrl) {
    return { error: 'Question text or diagram image is required.' };
  }

  const { data, error } = await supabase.from('course_mcqs').insert({
    course_id: courseId,
    question_text: questionText || null,
    question_image_url: questionImageUrl,
    option_a: optionA,
    option_b: optionB,
    option_c: optionC,
    option_d: optionD,
    correct_option: correctOption,
    source_type: sourceType,
    competency_id: competencyId,
    topic_id: topicId,
    difficulty,
    marks,
    created_by: user.id
  }).select().single();

  if (error) {
    console.error('Error creating course MCQ:', error);
    return { error: error.message };
  }

  revalidatePath(`/courses/${courseId}`);
  return { success: true, mcq: data };
}

export async function updateCourseMcqAction(mcqId: string, formData: FormData) {
  const courseId = formData.get('course_id') as string;
  if (!courseId) return { error: 'Course ID is required' };

  const { supabase } = await requireMcqManager(courseId);

  const questionText = (formData.get('question_text') as string) || '';
  const optionA = (formData.get('option_a') as string) || '';
  const optionB = (formData.get('option_b') as string) || '';
  const optionC = (formData.get('option_c') as string) || '';
  const optionD = (formData.get('option_d') as string) || '';
  const correctOption = (formData.get('correct_option') as string) || 'A';
  const clearImage = formData.get('clear_image') === 'true';

  const updatePayload: Record<string, any> = {
    question_text: questionText || null,
    option_a: optionA,
    option_b: optionB,
    option_c: optionC,
    option_d: optionD,
    correct_option: correctOption,
    updated_at: new Date().toISOString()
  };

  if (clearImage) {
    updatePayload.question_image_url = null;
  }

  const imageFile = formData.get('image_file') as File | null;
  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    const valResult = validateFiles([imageFile], { allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'], maxSizeMB: 10 });
    if (!valResult.valid) {
      return { error: valResult.error };
    }

    const adminSupabase = await createAdminClient();
    const { urls, errors } = await uploadFiles({
      files: [imageFile],
      supabase: adminSupabase,
      bucketName: 'attachments',
      pathPrefix: `mcqs/${courseId}`,
      ensureBucket: true
    });

    if (errors.length === 0 && urls.length > 0) {
      updatePayload.question_image_url = urls[0];
    }
  }

  const { error } = await supabase
    .from('course_mcqs')
    .update(updatePayload)
    .eq('id', mcqId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}

export async function deleteCourseMcqAction(mcqId: string, courseId: string) {
  const { supabase } = await requireMcqManager(courseId);

  const { error } = await supabase
    .from('course_mcqs')
    .delete()
    .eq('id', mcqId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}

export async function submitCourseMcqAttemptAction(courseId: string, userAnswers: Record<string, string>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required' };

  // Fetch actual correct answers securely using admin client
  const adminSupabase = await createAdminClient();
  const { data: mcqs, error } = await adminSupabase
    .from('course_mcqs')
    .select('id, correct_option, marks')
    .eq('course_id', courseId)
    .eq('is_active', true);

  if (error || !mcqs || mcqs.length === 0) {
    return { error: 'No active questions found for this course.' };
  }

  let totalScore = 0;
  let maxPossibleScore = 0;
  const detailedResults: Record<string, { selected: string; correctOption: string; isCorrect: boolean }> = {};

  const normalizeAnswers = (str: string) => (str || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean).sort().join(',');

  for (const mcq of mcqs) {
    const questionMarks = mcq.marks || 1;
    maxPossibleScore += questionMarks;

    const studentSelected = normalizeAnswers(userAnswers[mcq.id] || '');
    const actualCorrect = normalizeAnswers(mcq.correct_option || '');
    const isCorrect = studentSelected === actualCorrect && studentSelected.length > 0;

    if (isCorrect) {
      totalScore += questionMarks;
    }

    detailedResults[mcq.id] = {
      selected: studentSelected,
      correctOption: actualCorrect,
      isCorrect
    };
  }

  // Insert attempt record to track student attempt history
  const { data: attemptRecord, error: insertError } = await supabase
    .from('course_mcq_attempts')
    .insert({
      course_id: courseId,
      user_id: user.id,
      score: totalScore,
      total: maxPossibleScore,
      answers: userAnswers
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error recording MCQ attempt:', insertError);
  }

  revalidatePath(`/courses/${courseId}`);

  return {
    success: true,
    score: totalScore,
    total: maxPossibleScore,
    detailedResults,
    attempt: attemptRecord
  };
}
