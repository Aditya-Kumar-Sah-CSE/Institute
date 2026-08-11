import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import LessonView from '@/features/courses/components/LessonView';
import { awardXP } from '@/features/auth/actions/auth';
import { revalidatePath } from 'next/cache';
import type { Submission } from '@/types';
import LessonPageClient from './components/LessonPageClient';

export default async function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('graduation_period, role').eq('id', user.id).single();
  const batch = profile?.graduation_period || null;

  // Check enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single();

  // Allow access to the first lesson, otherwise require an approved enrollment
  const { data: courseLessons } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true })
    .limit(1);
    
  const isFirstLesson = courseLessons && courseLessons[0]?.id === lessonId;

  if (!isFirstLesson && (!enrollment || enrollment.status !== 'approved')) {
    redirect(`/courses/${courseId}`);
  }

  // Fetch lesson
  const { data: lesson } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .single();

  if (!lesson) notFound();

  // Fetch doubts for this lesson based on user's batch (or all if admin/instructor)
  const doubtsQuery = supabase
    .from('doubts')
    .select('*, author:profiles(name, avatar_url, role), view_count:doubt_views(count), replies:doubt_replies(count)')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false });
    
  // The RLS policy should handle batch filtering automatically based on auth.uid()
  const { data: doubtsData, error: doubtsError } = await doubtsQuery;
  const doubts = doubtsData || [];

  if (doubtsError && doubtsError.code !== 'PGRST205' && !doubtsError.message?.includes('public.doubts')) {
    console.error('Error fetching lesson doubts:', doubtsError);
  }

  // Fetch assignments
  const { data: assignments } = await supabase
    .from('assignments')
    .select('*')
    .eq('lesson_id', lessonId);

  // Fetch all submissions for these assignments (for community view)
  let submissions: Submission[] = [];
  // For the community view, we want to include the user profile data
  let allSubmissions: any[] = [];
  
  if (assignments && assignments.length > 0) {
    const assignmentIds = assignments.map(a => a.id);
    const { data: subs } = await supabase
      .from('submissions')
      .select('*, profile:profiles(name, avatar_url, role)')
      .in('assignment_id', assignmentIds)
      .order('submitted_at', { ascending: false });
      
    allSubmissions = subs || [];
    // The current user's submissions
    submissions = allSubmissions.filter(s => s.user_id === user.id) as Submission[];
  }

  // Check lesson progress
  const { data: lessonProgress } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('user_id', user.id)
    .single();

  const isCompleted = lessonProgress?.completed || false;

  async function completeLesson() {
    'use server';
    const sb = await createClient();
    const { data: { user: currentUser } } = await sb.auth.getUser();
    if (!currentUser) return;

    // Check if already completed
    const { data: existing } = await sb.from('lesson_progress').select('*').eq('lesson_id', lessonId).eq('user_id', currentUser.id).single();
    if (existing?.completed) return;

    // Mark as completed
    await sb.from('lesson_progress').upsert({
      user_id: currentUser.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString()
    });

    // Update course progress (simplified)
    // Real progress = completed lessons / total lessons
    const { data: courseLessons } = await sb.from('lessons').select('id').eq('course_id', courseId);
    const lessonIds = courseLessons?.map(l => l.id) || [];
    
    let completedCount = 0;
    if (lessonIds.length > 0) {
      const { count } = await sb.from('lesson_progress').select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id).eq('completed', true).in('lesson_id', lessonIds);
      completedCount = count || 0;
    }
    
    const { data: course } = await sb.from('courses').select('lesson_count').eq('id', courseId).single();
    
    if (course && course.lesson_count > 0 && completedCount) {
      const progress = Math.min(completedCount / course.lesson_count, 1.0);
      await sb.from('enrollments').update({ progress }).eq('user_id', currentUser.id).eq('course_id', courseId);
    }

    // Award XP
    await awardXP(currentUser.id, lesson.xp_reward, `Completed Lesson: ${lesson.title}`, 'lesson', lesson.id);
    
    revalidatePath(`/courses/${courseId}/${lessonId}`);
  }

  async function submitAssignment(assignmentId: string, formData: FormData) {
    'use server';
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Not logged in");

    // Rate Limiting: 5 submissions per minute
    const { checkRateLimit } = await import('@/lib/rate-limit');
    const rl = checkRateLimit(`submitAssignment:${user.id}`, 5, 60000);
    if (!rl.success) {
      throw new Error(rl.error);
    }

    const { data: currentUser } = await sb.from('profiles').select('*').eq('id', user.id).single();
    if (!currentUser) throw new Error("Profile not found");

    // Get the assignment details to know requirements
    const { data: assign } = await sb.from('assignments').select('*').eq('id', assignmentId).single();
    if (!assign) return;

    // Prevent re-submission for already completed assignments
    const { data: existingSub } = await sb
      .from('submissions')
      .select('status')
      .eq('user_id', user.id)
      .eq('assignment_id', assignmentId)
      .single();
      
    if (existingSub?.status === 'approved') {
      throw new Error('You have already completed this assignment.');
    }

    let answer = formData.get('answer') as string || '';
    const github_link = formData.get('githubUrl') as string || null;
    const deploy_link = formData.get('deployUrl') as string || null;
    if (assign.type === 'ui' || assign.type === 'any') {
      const ui_files = formData.getAll('ui_files');
      const uploadedUrls: string[] = [];
      
      for (const ui_file of ui_files as File[]) {
        if (ui_file && ui_file.size > 0) {
          const fileExt = ui_file.name.split('.').pop();
          const fileName = `submission-${currentUser.id}-${crypto.randomUUID()}.${fileExt}`;
          const { data: uploadData, error: uploadError } = await sb.storage.from('branding').upload(`submissions/${fileName}`, ui_file, { upsert: true });
          
          if (!uploadError && uploadData) {
            const { data: publicUrlData } = sb.storage.from('branding').getPublicUrl(uploadData.path);
            uploadedUrls.push(publicUrlData.publicUrl);
          } else {
            throw new Error(`Upload failed for ${ui_file.name}: ${uploadError?.message || 'Unknown error'}`);
          }
        }
      }
      
      if (uploadedUrls.length > 0) {
        answer = JSON.stringify(uploadedUrls);
      }
    }

    let status = 'pending';
    // Only auto-approve simple MCQs, all other types (UI, Code, Github, Deploy) require manual review
    if (assign.type === 'mcq') {
      status = 'approved';
    }

    // Validation: prevent empty submission for UI or Code types
    if (assign.type === 'ui' && !answer) {
      throw new Error('No files were provided or upload failed. Please select a file and try again.');
    }
    if (assign.type === 'code' && !answer) {
      throw new Error('Code answer cannot be empty.');
    }
    if (assign.type === 'any' && !answer && !github_link && !deploy_link) {
      throw new Error('You must provide at least one answer, GitHub link, Deploy link, or file upload.');
    }

    const { error, data: insertedSub } = await sb.from('submissions').upsert({
      user_id: currentUser.id,
      assignment_id: assign.id,
      answer: answer,
      github_link: github_link,
      deploy_link: deploy_link,
      status: status
    }, { onConflict: 'user_id,assignment_id' }).select().single();

    if (error) {
      console.error(error);
      throw new Error(`Database error saving submission: ${error.message}`);
    }

    if (status === 'approved' && insertedSub) {
      await awardXP(currentUser.id, assign.xp_reward, `Completed Assignment: ${assign.title}`, 'assignment', assign.id);
    }

    revalidatePath(`/courses/${courseId}/${lessonId}`);
    revalidatePath('/instructor/submissions');
    revalidatePath('/admin/submissions');
    revalidatePath('/instructor');
    revalidatePath('/admin');
  }

  const showDoubts = profile?.role === 'admin' || profile?.role === 'instructor' || !!batch;

  return (
    <div className="lesson-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
      <div>
        <Link href={`/courses/${courseId}`} style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-md)', fontSize: 'var(--text-sm)', textDecoration: 'none', transition: 'color 0.2s' }}>
          ← Back to Course
        </Link>
        <LessonView 
          lesson={lesson} 
          isCompleted={isCompleted}
          onComplete={completeLesson}
        />
      </div>

      <LessonPageClient
        assignments={assignments || []}
        submissions={submissions}
        allSubmissions={allSubmissions}
        submitAssignment={submitAssignment}
        doubts={showDoubts ? doubts : []}
        courseId={courseId}
        lessonId={lessonId}
        showDoubts={showDoubts}
      />
    </div>
  );
}
