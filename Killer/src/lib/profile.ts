import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function getOrCreateProfile(user: any) {
  const supabase = await createClient();
  
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    const adminSupabase = await createAdminClient();
    
    // Auto-create profile
    const newProfileData = {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      role: user.user_metadata?.role || 'student',
    };
    
    const { data: newProfile, error } = await adminSupabase
      .from('profiles')
      .insert(newProfileData)
      .select()
      .single();
      
    if (!error && newProfile) {
      profile = newProfile;
    }
  }
  
  return profile;
}
