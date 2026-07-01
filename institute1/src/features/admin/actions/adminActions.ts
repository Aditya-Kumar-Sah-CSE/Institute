'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Using the service role key to bypass RLS and interact with auth.users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function deleteStudent(studentId: string) {
  try {
    // Check if user is an admin before allowing delete
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const supabaseUser = await createServerClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { error: 'Unauthorized. Only admins can delete students.' };
    }

    // Delete user from Supabase Auth
    // This will trigger cascade deletes on profiles, submissions, user_badges, etc.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(studentId, false);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/admin/students');
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to delete student';
    return { error: errorMsg };
  }
}

export async function deleteEnrollment(enrollmentId: string) {
  try {
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const supabaseUser = await createServerClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { error: 'Unauthorized. Only admins can delete enrollments.' };
    }

    // Fetch enrollment info first to get user_id and course title
    const { data: enrollment } = await supabaseUser
      .from('enrollments')
      .select('user_id, courses(title)')
      .eq('id', enrollmentId)
      .single();

    const { error } = await supabaseUser
      .from('enrollments')
      .delete()
      .eq('id', enrollmentId);

    if (error) {
      return { error: error.message };
    }

    // If successfully deleted, insert a system notification for the student
    if (enrollment) {
      const courseTitle = Array.isArray(enrollment.courses) ? enrollment.courses[0]?.title : (enrollment.courses as { title: string } | null)?.title || 'the course';
      await supabaseUser.from('notifications').insert({
        user_id: enrollment.user_id,
        type: 'system',
        message: `You have been removed from the course: ${courseTitle}.`,
        link: '/dashboard'
      });
    }

    revalidatePath('/admin/students');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to delete enrollment';
    return { error: errorMsg };
  }
}
