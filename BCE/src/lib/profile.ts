import { createClient, createAdminClient } from '@/lib/supabase/server';
import { cache } from 'react';
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_ROLE } from '@/lib/super-admin';

export const getOrCreateProfile = cache(async (user: any) => {
  const supabase = await createClient();
  const isPlatformOwner = user?.email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    const adminSupabase = await createAdminClient();
    
    // Auto-create profile with super_admin role if platform owner
    const newProfileData = {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      role: isPlatformOwner ? SUPER_ADMIN_ROLE : (user.user_metadata?.role || 'student'),
    };
    
    const { data: newProfile, error } = await adminSupabase
      .from('profiles')
      .insert(newProfileData)
      .select()
      .single();
      
    if (!error && newProfile) {
      profile = newProfile;
    }
  } else if (isPlatformOwner && profile.role !== SUPER_ADMIN_ROLE) {
    // Automatically promote platform owner to super_admin in DB
    try {
      const adminSupabase = await createAdminClient();
      const { data: updatedProfile } = await adminSupabase
        .from('profiles')
        .update({ role: SUPER_ADMIN_ROLE })
        .eq('id', user.id)
        .select()
        .single();
      if (updatedProfile) {
        profile = updatedProfile;
      }
    } catch (_e) {
      profile.role = SUPER_ADMIN_ROLE;
    }
  }
  
  return profile;
});
