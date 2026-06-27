'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getLevelFromXP } from '@/lib/utils';
import { checkRateLimit } from '@/lib/rate-limit';


export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const institute_id = formData.get('institute_id') as string;

  if (!name || !email || !password || !institute_id) {
    return { error: 'All fields are required' };
  }

  // Rate limit: 5 signups per email per 10 minutes
  const rl = checkRateLimit(`signUp:${email}`, 5, 600000);
  if (!rl.success) return { error: rl.error };

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, institute_id },
      emailRedirectTo: `${siteUrl}/api/auth/callback`,
    },
  });

  if (error) {
    // Handle Supabase SMTP / rate limit errors which often manifest as a 500 FetchError with an empty message
    if (error.name === 'AuthRetryableFetchError' || error.status === 500 || error.message === '{}') {
      return { 
        error: 'Signup is temporarily disabled because the email server is overloaded. Please try again later or contact the administrator to fix SMTP settings.' 
      };
    }
    return { error: error.message };
  }

  // Profile creation is handled automatically by the Supabase database trigger 'handle_new_user'
  // Sign out the user so they must manually sign in as per requested flow
  await supabase.auth.signOut();

  redirect('/login?message=Account created successfully. Please sign in.');
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  // Rate limit: 10 login attempts per email per 5 minutes
  const rl = checkRateLimit(`signIn:${email}`, 10, 300000);
  if (!rl.success) return { error: rl.error };

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message === 'Email not confirmed') {
      return { error: 'Please check your email and click the confirmation link to sign in.' };
    }
    return { error: error.message };
  }

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Clear all Supabase auth cookies explicitly
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
      cookieStore.delete(cookie.name);
    }
  }

  redirect('/');
}

export async function resetPasswordRequest(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  
  if (!email) {
    return { error: 'Email is required' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/api/auth/callback?redirect_to=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }
  
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get('password') as string;

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters' };
  }

  const { error } = await supabase.auth.updateUser({
    password: password
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/login?message=Password updated successfully. Please sign in with your new password.');
}

export async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

export async function awardXP(userId: string, amount: number, action: string, sourceType?: string, sourceId?: string) {
  const supabase = await createAdminClient();

  // Log the XP
  await supabase.from('xp_log').insert({
    user_id: userId,
    xp_amount: amount,
    action,
    source_type: sourceType,
    source_id: sourceId,
  });

  // Atomically increment XP to avoid race conditions (read-modify-write bug)
  // Use rpc to call a SQL function, or update with raw increment
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', userId)
    .single();

  if (!profile) return;

  const newXP = profile.xp + amount;
  const newLevel = getLevelFromXP(newXP);

  // Update profile — using the calculated value but with an eq check
  // to detect concurrent modifications (optimistic locking)
  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ xp: newXP, level: newLevel, last_active_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('xp', profile.xp) // Optimistic lock: only update if XP hasn't changed
    .select('xp')
    .single();

  // If optimistic lock failed (concurrent update), retry with fresh data
  if (error || !updated) {
    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', userId)
      .single();

    if (freshProfile) {
      const retryXP = freshProfile.xp + amount;
      const retryLevel = getLevelFromXP(retryXP);
      await supabase
        .from('profiles')
        .update({ xp: retryXP, level: retryLevel, last_active_at: new Date().toISOString() })
        .eq('id', userId);
      return { newXP: retryXP, newLevel: retryLevel };
    }
  }

  return { newXP, newLevel };
}

export async function updateAvatarUrl(userId: string, avatarUrl: string) {
  const supabase = await createClient();

  // Fetch the old avatar to clean it up from storage
  const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single();
  if (profile?.avatar_url && profile.avatar_url !== avatarUrl) {
    const match = profile.avatar_url.match(/\/object\/public\/avatars\/(.+)$/);
    if (match) {
      await supabase.storage.from('avatars').remove([match[1]]);
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updateGithubUsername(userId: string, githubUsername: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ github_username: githubUsername })
    .eq('id', userId);

  if (error) {
    return { error: error.message };
  }
  
  // Award XP for connecting GitHub if it's not null/empty
  if (githubUsername) {
    // Check if they already got XP for this to avoid infinite XP farming
    const { count } = await supabase
      .from('xp_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', 'Connected GitHub Profile');
      
    if (count === 0) {
      await awardXP(userId, 50, 'Connected GitHub Profile', 'integration', 'github');
    }
  }

  return { success: true };
}
