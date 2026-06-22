'use server';

import { createClient } from '@/lib/supabase/server';
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

  // Upgrade profile to instructor and pending
  await sb.from('profiles').update({
    role: 'instructor',
    status: 'pending'
  }).eq('id', currentUser.id);

  // Insert application
  await sb.from('instructor_applications').insert({
    user_id: currentUser.id,
    bio,
    experience,
    status: 'pending'
  });

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

  // Upgrade profile to instructor and pending
  await sb.from('profiles').update({
    role: 'instructor',
    status: 'pending'
  }).eq('id', userId);

  // Insert application
  await sb.from('instructor_applications').insert({
    user_id: userId,
    bio,
    experience,
    status: 'pending'
  });

  // System notification for applying as instructor
  await sb.from('feedbacks').insert({
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
