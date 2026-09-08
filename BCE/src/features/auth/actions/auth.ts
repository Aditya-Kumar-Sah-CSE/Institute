'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { normalizeRole } from '@/lib/role-utils';
import { redirect } from 'next/navigation';
import { getLevelFromXP } from '@/lib/utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { revalidatePath } from 'next/cache';


export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const institute_id = (formData.get('institute_id') as string) || '';
  const graduation_period = (formData.get('graduation_period') as string) || '';

  if (!name || !email || !password) {
    return { error: 'Name, email and password are required' };
  }

  // Rate limit: 5 signups per email per 10 minutes
  const rl = checkRateLimit(`signUp:${email}`, 5, 600000);
  if (!rl.success) return { error: rl.error };

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return { error: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character (@$!%*?&)' };
  }

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // Local dev: bypass SMTP and auto-confirm using admin client
    const adminSupabase = await createAdminClient();
    const { error: adminAuthError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, institute_id, graduation_period },
    });

    if (adminAuthError) {
      return { error: adminAuthError.message };
    }

    redirect('/login?message=Account created successfully (Local Auto-Confirmed). Please sign in.');
  } else {
    // Production: standard signup flow requiring email confirmation
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';
  
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, institute_id, graduation_period },
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
  
    redirect(`/verify-email?email=${encodeURIComponent(email)}`);
  }
}

export async function resendVerificationEmail(email: string) {
  if (!email || typeof email !== 'string') {
    return { error: 'Please enter a valid email address.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { error: 'Please enter a valid email address.' };
  }

  // 1. Global daily quota protection (250 resends/day globally to protect Brevo daily quota)
  const globalRl = checkRateLimit('resend_global_daily', 250, 86400000);
  if (!globalRl.success) {
    return { error: 'Email service temporarily unavailable. Please try again later.' };
  }

  // 2. Per-email 60-second cooldown
  const cooldownRl = checkRateLimit(`resend_cooldown:${normalizedEmail}`, 1, 60000);
  if (!cooldownRl.success) {
    const secs = cooldownRl.retryAfterSeconds || 60;
    return { error: `Please wait ${secs} seconds before requesting another email.` };
  }

  // 3. Per-email 1-hour limit (max 5 resends / hour)
  const hourlyRl = checkRateLimit(`resend_hourly:${normalizedEmail}`, 5, 3600000);
  if (!hourlyRl.success) {
    return { error: 'Too many requests. Please try again later.' };
  }

  const supabase = await createClient();

  // 4. Check if account is already verified in profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_verified')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (profile?.is_verified) {
    return {
      success: true,
      message: 'If this account requires verification, a verification email has been sent.',
    };
  }

  // 5. Trigger Supabase Auth resend email (uses Supabase Custom SMTP -> Brevo)
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: normalizedEmail,
  });

  if (error) {
    if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
      return { error: 'Please wait before requesting another email.' };
    }
    console.error('[resendVerificationEmail] Supabase resend error:', error.message);
    // Generic safe response to prevent email enumeration or internal error leakage
    return {
      success: true,
      message: 'If this account requires verification, a verification email has been sent.',
    };
  }

  return {
    success: true,
    message: 'Verification email sent successfully. Please check your inbox or spam folder.',
  };
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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message === 'Email not confirmed') {
      return { error: 'Please check your email and click the confirmation link to sign in.' };
    }
    return { error: error.message };
  }

  let redirectUrl = '/dashboard';
  if (data.user) {
    let role: string | undefined;

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminSupabase = await createAdminClient();
        await adminSupabase.from('profiles').update({
          is_verified: true,
          last_login_at: new Date().toISOString()
        }).eq('id', data.user.id);
        const { data: profile } = await adminSupabase.from('profiles').select('role').eq('id', data.user.id).single();
        if (profile?.role) role = profile.role;
      } catch (err) {
        console.error('[signIn] Admin client error:', err);
      }
    }

    if (!role) {
      try {
        await supabase.from('profiles').update({
          is_verified: true,
          last_login_at: new Date().toISOString()
        }).eq('id', data.user.id);
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
        if (profile?.role) role = profile.role;
      } catch (err) {
        console.error('[signIn] User client error:', err);
      }
    }

    role = normalizeRole(role || data.user.user_metadata?.role);
    if (role === 'instructor') {
      redirectUrl = '/instructor';
    } else if (role === 'admin' || role === 'developer') {
      redirectUrl = '/admin';
    }
  }

  revalidatePath('/', 'layout');
  redirect(redirectUrl);
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Supabase signout error:', error);
  }

  try {
    // Clear all Supabase auth cookies explicitly
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    for (const cookie of allCookies) {
      if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
        cookieStore.delete(cookie.name);
      }
    }
  } catch (error) {
    console.error('Error clearing cookies:', error);
  }

  revalidatePath('/', 'layout');
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

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!password || !passwordRegex.test(password)) {
    return { error: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character (@$!%*?&)' };
  }

  const { error } = await supabase.auth.updateUser({
    password: password
  });

  if (error) {
    return { error: error.message };
  }

  // Retrieve user ID to send a notification
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'system',
      message: 'Your password was successfully updated.',
      link: '/profile'
    });
  }

  redirect('/login?message=Password updated successfully. Please sign in with your new password.');
}

export async function getLoginConfig() {
  try {
    const { getCurrentTenant } = await import('@/lib/tenant');
    const supabase = await createClient();
    
    // Add timeout to database operations to prevent infinite pending state
    const tenantPromise = getCurrentTenant();
    const settingsPromise = supabase.from('company_settings').select('company_name, logo_url').maybeSingle();
    
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database timeout')), 8000)
    );
    
    const [tenant, { data: settings }] = await Promise.race([
      Promise.all([tenantPromise, settingsPromise]),
      timeoutPromise
    ]) as [any, { data: any }];

    return {
      companyName: tenant?.name || settings?.company_name || null,
      logoUrl: tenant?.logo || settings?.logo_url || null,
      tenantId: tenant?.id || null,
    };
  } catch (err) {
    console.error('Error fetching login config:', err);
    return {
      companyName: null,
      logoUrl: null,
      tenantId: null,
    };
  }
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

export async function updateLinkedinUrl(userId: string, linkedinUrl: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ linkedin_url: linkedinUrl })
    .eq('id', userId);

  if (error) {
    return { error: error.message };
  }
  
  // Award XP for connecting LinkedIn if it's not null/empty
  if (linkedinUrl) {
    // Check if they already got XP for this to avoid infinite XP farming
    const { count } = await supabase
      .from('xp_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', 'Connected LinkedIn Profile');
      
    if (count === 0) {
      await awardXP(userId, 50, 'Connected LinkedIn Profile', 'integration', 'linkedin');
    }
  }

  return { success: true };
}

export async function updateSocialLinks(userId: string, socialLinks: Record<string, string>) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ social_links: socialLinks })
    .eq('id', userId);

  if (error) {
    return { error: error.message };
  }

  // Award XP for adding social links if they have any
  const countLinks = Object.keys(socialLinks).length;
  if (countLinks > 0) {
    const { count } = await supabase
      .from('xp_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', 'Added Social Profile Links');
      
    if (count === 0) {
      await awardXP(userId, 50, 'Added Social Profile Links', 'integration', 'social_links');
    }
  }

  return { success: true };
}

export async function updateAcademicInfo(
  userId: string, 
  data: { graduation_period?: string, cgpa?: number, sgpa?: Record<string, number> }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ 
      graduation_period: data.graduation_period,
      cgpa: data.cgpa,
      sgpa: data.sgpa
    })
    .eq('id', userId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updateProfessionalInfo(
  userId: string,
  data: {
    experience_years?: number | null;
    phd_details?: string | null;
    mtech_details?: string | null;
    btech_details?: string | null;
  }
) {
  const supabase = await createClient();

  const professional_details = {
    experience_years: data.experience_years,
    phd_details: data.phd_details,
    mtech_details: data.mtech_details,
    btech_details: data.btech_details,
  };

  const { error } = await supabase
    .from('profiles')
    .update({ 
      professional_details 
    })
    .eq('id', userId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function uploadAvatarToServer(formData: FormData) {
  const supabaseAdmin = await createAdminClient();
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const file = formData.get('file') as File;
  if (!file || file.size === 0) return { error: 'No file provided' };

  const { uploadSingleFileWithFallback } = await import('@/lib/storage-service');

  const fileExt = file.name.split('.').pop() || 'jpg';
  const filename = `avatar_${Date.now()}.${fileExt}`;

  const uploadResult = await uploadSingleFileWithFallback({
    file,
    filename,
    mimeType: file.type || 'image/jpeg',
    bucketName: 'avatars',
    pathPrefix: user.id,
    category: 'Profile Image',
    userId: user.id,
    supabaseClient: supabaseAdmin,
  });

  if (!uploadResult.success || !uploadResult.url) {
    return { error: uploadResult.error || 'Avatar upload failed' };
  }

  const publicUrl = uploadResult.url;

  // Clean up old avatar from Supabase Storage (only if it's a Supabase URL)
  const { data: profile } = await supabaseAdmin.from('profiles').select('avatar_url').eq('id', user.id).single();
  if (profile?.avatar_url && profile.avatar_url !== publicUrl) {
    const match = profile.avatar_url.match(/\/object\/public\/avatars\/(.+)$/);
    if (match) {
      await supabaseAdmin.storage.from('avatars').remove([match[1]]);
    }
  }

  // Update Profile
  const { error: dbError } = await supabaseAdmin
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id);

  if (dbError) return { error: dbError.message };

  return { success: true, publicUrl, provider: uploadResult.provider };
}

