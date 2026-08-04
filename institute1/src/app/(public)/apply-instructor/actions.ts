'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getTenantConfig, generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';

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
    const { tenant, routingMode } = await getTenantConfig();
    const baseUrl = generateTenantBaseUrl(tenant?.slug || null, routingMode);
    redirect(`${baseUrl}/apply-instructor?error=` + encodeURIComponent(authError?.message || 'Failed to create account'));
  }

  // After registration, user is logged in. Redirect to the same page to show the second form.
  const { tenant, routingMode } = await getTenantConfig();
  const baseUrl = generateTenantBaseUrl(tenant?.slug || null, routingMode);
  redirect(`${baseUrl}/apply-instructor`);
}

export async function handleSubmitApplication(formData: FormData) {
  const sb = await createClient();
  const { data: { user: currentUser } } = await sb.auth.getUser();

  if (!currentUser) {
    return { error: 'Not authenticated' };
  }

  const bio = formData.get('bio') as string;
  const experience = formData.get('experience') as string;
  const institute_id = (formData.get('institute_id') as string) || null;

  // Note: We no longer upgrade profile to instructor immediately.
  // The user remains a student until the admin approves their application.

  const adminSb = await createAdminClient();

  // If user provided an institute_id, save it to their profile
  if (institute_id) {
    await adminSb.from('profiles').update({ institute_id }).eq('id', currentUser.id);
  }

  // Insert or update application (Upsert for reapply)
  const { error: appError } = await adminSb.from('instructor_applications').upsert({
    user_id: currentUser.id,
    bio,
    experience,
    status: 'pending',
    submitted_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  
  if (appError) {
    console.error('Application insert error:', appError);
    return { error: 'Failed to submit application: ' + appError.message };
  }

  // System notification for applying as instructor
  await sb.from('notifications').insert({
    user_id: currentUser.id,
    type: 'system',
    message: 'Thank you for applying as an instructor. Please wait for admin approval.',
    link: '/dashboard'
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
  const institute_id = (formData.get('institute_id') as string) || null;

  const { data: authData, error: authError } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { name, institute_id },
    }
  });

  if (authError || !authData.user) {
    return { error: authError?.message || 'Failed to create account' };
  }

  const userId = authData.user.id;
  
  // Use admin client to bypass RLS since the user's session isn't fully established in this request yet
  const adminSb = await createAdminClient();

  // Note: We no longer upgrade profile to instructor immediately.
  // The user remains a student until the admin approves their application.

  // Insert or update application (Upsert for reapply)
  const { error: appError } = await adminSb.from('instructor_applications').upsert({
    user_id: userId,
    bio,
    experience,
    status: 'pending',
    submitted_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  
  if (appError) {
    console.error('Application insert error:', appError);
    return { error: 'Failed to submit application: ' + appError.message };
  }

  // System notification for applying as instructor
  await adminSb.from('notifications').insert({
    user_id: userId,
    type: 'system',
    message: 'Thank you for applying as an instructor. Please wait for admin approval.',
    link: '/dashboard'
  });

  // Revalidate the root layout so that subsequent navigations (e.g., to dashboard)
  // fetch the updated profile data and reflect the new role/status.
  revalidatePath('/', 'layout');

  // We won't redirect here, so the client component can show the popup.
  return { success: true };
}
