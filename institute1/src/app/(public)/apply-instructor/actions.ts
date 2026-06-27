'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function handleRegister(formData: FormData) {
  const sb = await createClient();

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { data: authData, error: authError } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    }
  });

  if (authError || !authData.user) {
    redirect('/apply-instructor?error=' + encodeURIComponent(authError?.message || 'Failed to create account'));
  }

  // After registration, user is logged in. Redirect to the same page to show the second form.
  redirect('/apply-instructor');
}

export async function handleSubmitApplication(formData: FormData) {
  const sb = await createClient();
  const { data: { user: currentUser } } = await sb.auth.getUser();

  if (!currentUser) {
    return { error: 'Not authenticated' };
  }

  const bio = formData.get('bio') as string;
  const experience = formData.get('experience') as string;
  const instructor_id = (formData.get('instructor_id') as string) || null;

  // Upgrade profile to instructor and pending
  const { error: profileError } = await sb.from('profiles').update({
    role: 'instructor',
    status: 'pending',
    instructor_id
  }).eq('id', currentUser.id);
  
  if (profileError) {
    console.error('Profile update error:', profileError);
    return { error: 'Failed to update profile: ' + profileError.message };
  }

  // Insert application
  const { error: appError } = await sb.from('instructor_applications').insert({
    user_id: currentUser.id,
    bio,
    experience,
    status: 'pending',
    instructor_id
  });
  
  if (appError) {
    console.error('Application insert error:', appError);
    return { error: 'Failed to submit application: ' + appError.message };
  }

  // System notification for applying as instructor
  await sb.from('feedbacks').insert({
    user_id: currentUser.id,
    name: 'System',
    role: 'System',
    category: 'Notification',
    message: 'Thank you for applying as an instructor. Please wait for admin approval.',
    status: 'open'
  });

  // Revalidate the root layout so that subsequent navigations (e.g., to dashboard)
  // fetch the updated profile data and reflect the new role/status.
  revalidatePath('/', 'layout');

  // We won't redirect here, so the client component can show the popup.
  return { success: true };
}

export async function handleFullRegistrationAndApplication(formData: FormData) {
  const sb = await createClient();

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const bio = formData.get('bio') as string;
  const experience = formData.get('experience') as string;
  const instructor_id = (formData.get('instructor_id') as string) || null;

  const { data: authData, error: authError } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    }
  });

  if (authError || !authData.user) {
    return { error: authError?.message || 'Failed to create account' };
  }

  const userId = authData.user.id;
  
  // Use admin client to bypass RLS since the user's session isn't fully established in this request yet
  const adminSb = await createAdminClient();

  // Upgrade profile to instructor and pending
  const { error: profileError } = await adminSb.from('profiles').update({
    role: 'instructor',
    status: 'pending',
    instructor_id
  }).eq('id', userId);
  
  if (profileError) {
    console.error('Profile update error:', profileError);
    return { error: 'Failed to update profile: ' + profileError.message };
  }

  // Insert application
  const { error: appError } = await adminSb.from('instructor_applications').insert({
    user_id: userId,
    bio,
    experience,
    status: 'pending',
    instructor_id
  });
  
  if (appError) {
    console.error('Application insert error:', appError);
    return { error: 'Failed to submit application: ' + appError.message };
  }

  // System notification for applying as instructor
  await adminSb.from('feedbacks').insert({
    user_id: userId,
    name: 'System',
    role: 'System',
    category: 'Notification',
    message: 'Thank you for applying as an instructor. Please wait for admin approval.',
    status: 'open'
  });

  // Revalidate the root layout so that subsequent navigations (e.g., to dashboard)
  // fetch the updated profile data and reflect the new role/status.
  revalidatePath('/', 'layout');

  // We won't redirect here, so the client component can show the popup.
  return { success: true };
}
