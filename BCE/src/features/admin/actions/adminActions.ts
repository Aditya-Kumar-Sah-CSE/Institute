'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';

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

    if (profile?.role !== 'admin' && profile?.role !== 'developer') {
      return { error: 'Unauthorized. Only admins or developers can delete students.' };
    }

    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', studentId)
      .single();

    if (targetProfile?.email === SUPER_ADMIN_EMAIL) {
      return { error: 'Cannot delete the developer account.' };
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

    if (profile?.role !== 'admin' && profile?.role !== 'developer') {
      return { error: 'Unauthorized. Only admins or developers can delete enrollments.' };
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

export async function makeAdmin(userId: string) {
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

    if (profile?.role !== 'admin' && profile?.role !== 'developer') {
      return { error: 'Unauthorized. Only admins or developers can assign admin roles.' };
    }

    // Update user role to admin
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    await supabaseUser.from('notifications').insert({
      user_id: userId,
      type: 'system',
      message: 'Your account has been upgraded to Administrator.',
      link: '/dashboard'
    });

    revalidatePath('/admin/students');
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to make admin';
    return { error: errorMsg };
  }
}

export async function makeFaculty(userId: string) {
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

    if (profile?.role !== 'admin' && profile?.role !== 'developer') {
      return { error: 'Unauthorized. Only admins or developers can assign roles.' };
    }

    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (targetProfile?.email === SUPER_ADMIN_EMAIL) {
      return { error: 'Cannot demote the developer.' };
    }

    // Prevent demoting the developer (you can add a check for SUPER_ADMIN_EMAIL here if needed, but we'll assume the UI handles it or they can't demote themselves easily without it being tricky. Actually, let's just update the role)
    // Update user role to instructor
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'instructor' })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    await supabaseUser.from('notifications').insert({
      user_id: userId,
      type: 'system',
      message: 'Your account has been updated to Faculty permissions.',
      link: '/dashboard'
    });

    revalidatePath('/admin/students');
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to make faculty';
    return { error: errorMsg };
  }
}

export async function makeStudent(userId: string) {
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

    if (profile?.role !== 'admin' && profile?.role !== 'developer') {
      return { error: 'Unauthorized. Only admins or developers can assign roles.' };
    }

    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (targetProfile?.email === SUPER_ADMIN_EMAIL) {
      return { error: 'Cannot demote the developer.' };
    }

    // Update user role to student
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'student' })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    // Also update any approved instructor applications to rejected
    await supabaseAdmin
      .from('instructor_applications')
      .update({ status: 'rejected' })
      .eq('user_id', userId)
      .in('status', ['pending', 'approved']);

    await supabaseUser.from('notifications').insert({
      user_id: userId,
      type: 'system',
      message: 'Your account has been reverted to Student status.',
      link: '/dashboard'
    });

    revalidatePath('/admin/students');
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to make student';
    return { error: errorMsg };
  }
}

export async function makeDeveloper(userId: string) {
  try {
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const supabaseUser = await createServerClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    if (user.email !== SUPER_ADMIN_EMAIL) {
      return { error: 'Unauthorized. Only the Superadmin can assign the Developer role.' };
    }

    // Update user role to developer
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'developer' })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    await supabaseUser.from('notifications').insert({
      user_id: userId,
      type: 'system',
      message: 'Your account has been granted Developer privileges.',
      link: '/dashboard'
    });

    revalidatePath('/admin/students');
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to make developer';
    return { error: errorMsg };
  }
}

export async function impersonateUser(targetUserId: string) {
  try {
    const { createClient: createServerClient } = await import('@/lib/supabase/server');
    const supabaseUser = await createServerClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'developer' && user.email !== SUPER_ADMIN_EMAIL) {
      return { error: 'Unauthorized. Only admins or developers can impersonate users.' };
    }

    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return { error: 'Target user profile not found.' };
    }

    // Set impersonation cookie
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.set('impersonated_user_id', targetUserId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    revalidatePath('/', 'layout');
    return { success: true, targetUser: targetProfile };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to impersonate user';
    return { error: errorMsg };
  }
}

export async function stopImpersonation() {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.delete('impersonated_user_id');

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to stop impersonation';
    return { error: errorMsg };
  }
}

