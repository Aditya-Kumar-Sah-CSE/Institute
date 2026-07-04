'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function completeCourseAndIssueCertificates(courseId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Verify user is instructor of the course or admin
    const { data: course } = await supabase
      .from('courses')
      .select('created_by, is_completed, title')
      .eq('id', courseId)
      .single();

    if (!course) {
      return { error: 'Course not found' };
    }

    if (course.is_completed) {
      return { error: 'Course is already completed' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && course.created_by !== user.id) {
      return { error: 'Unauthorized to complete this course' };
    }

    // Get Company Settings for the certificate
    const { data: settings } = await supabase
      .from('company_settings')
      .select('company_name')
      .single();
    
    const companyName = settings?.company_name || 'Smart Learning APP';

    // Get all enrolled students (approved)
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('user_id, profiles(streak_days, institute_id)')
      .eq('course_id', courseId)
      .eq('status', 'approved');

    if (!enrollments || enrollments.length === 0) {
      // Mark as complete even if no students
      await supabase.from('courses').update({ is_completed: true }).eq('id', courseId);
      revalidatePath(`/admin/courses/${courseId}/builder`);
      revalidatePath(`/instructor/courses/${courseId}/builder`);
      return { success: true };
    }

    // Get all assignments for this course
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, assignments(id, xp_reward)')
      .eq('course_id', courseId);

    const lessonIds = lessons?.map(l => l.id) || [];
    const assignmentIds = lessons?.flatMap(l => l.assignments?.map(a => a.id) || []) || [];
    const totalTasks = assignmentIds.length;

    // Get all course-specific doubts and replies
    const { data: doubts } = await supabase
      .from('doubts')
      .select('id, doubt_replies(id)')
      .eq('course_id', courseId);

    const doubtIds = doubts?.map(d => d.id) || [];
    const replyIds = doubts?.flatMap(d => d.doubt_replies?.map(r => r.id) || []) || [];

    const validSourceIds = [...lessonIds, ...assignmentIds, ...doubtIds, ...replyIds];
    const enrolledUserIds = enrollments.map(e => e.user_id);

    // Fetch xp logs in chunks to avoid PostgREST URL length limits
    let allXpLogs: { user_id: string, xp_amount: number }[] = [];
    if (validSourceIds.length > 0 && enrolledUserIds.length > 0) {
      const chunkSize = 150;
      for (let i = 0; i < validSourceIds.length; i += chunkSize) {
        const chunk = validSourceIds.slice(i, i + chunkSize);
        const { data: chunkLogs } = await supabase
          .from('xp_log')
          .select('user_id, xp_amount')
          .in('user_id', enrolledUserIds)
          .in('source_id', chunk);
        
        if (chunkLogs) {
          allXpLogs = [...allXpLogs, ...chunkLogs];
        }
      }
    }

    // Get submissions for all these students in this course (to count tasks completed)
    const { data: submissions } = await supabase
      .from('submissions')
      .select('user_id, assignment_id, score, status')
      .in('assignment_id', assignmentIds)
      .in('user_id', enrolledUserIds);

    // Map student performance
    const studentPerformance = enrollments.map(enrollment => {
      const studentId = enrollment.user_id;
      // Approved submissions for task count
      const studentSubs = submissions?.filter(s => s.user_id === studentId && s.status === 'approved') || [];
      const tasksCompleted = studentSubs.length;
      
      // Calculate XP from all course-related activities
      const studentXpLogs = allXpLogs.filter(log => log.user_id === studentId);
      const xpEarned = studentXpLogs.reduce((sum, log) => sum + (log.xp_amount || 0), 0);
      
      return {
        user_id: studentId,
        course_id: courseId,
        xp_earned: xpEarned,
        tasks_completed: tasksCompleted,
        total_tasks: totalTasks,
        course_rank: 0, // will calculate next
        days_active: (enrollment.profiles as any)?.streak_days || 0,
        company_name: companyName,
        institute_id: (enrollment.profiles as any)?.institute_id || '',
      };
    });

    // Rank students based on xpEarned (descending)
    studentPerformance.sort((a, b) => b.xp_earned - a.xp_earned);
    
    // Assign ranks (handling ties)
    let currentRank = 1;
    let prevXP = -1;
    for (let i = 0; i < studentPerformance.length; i++) {
      if (studentPerformance[i].xp_earned !== prevXP) {
        currentRank = i + 1;
      }
      studentPerformance[i].course_rank = currentRank;
      prevXP = studentPerformance[i].xp_earned;
    }

    // Insert certificates
    const { error: insertError } = await supabase
      .from('certificates')
      .insert(studentPerformance);

    if (insertError) {
      console.error('Failed to generate certificates:', insertError);
      return { error: 'Failed to generate certificates' };
    }

    // Mark course as completed
    await supabase.from('courses').update({ is_completed: true }).eq('id', courseId);

    // Send notifications to students
    const notifications = studentPerformance.map(student => ({
      user_id: student.user_id,
      type: 'achievement',
      message: `You earned a certificate for completing ${course.title}!`,
      link: '/profile'
    }));

    await supabase.from('notifications').insert(notifications);

    revalidatePath(`/admin/courses/${courseId}/builder`);
    revalidatePath(`/instructor/courses/${courseId}/builder`);
    
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return { error: errorMsg };
  }
}
