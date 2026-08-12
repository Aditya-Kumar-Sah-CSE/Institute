import { createClient } from '@/lib/supabase/server';
import { normalizeRole } from '@/lib/role-utils';

export async function getCodeArenaActor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, isInstructor: false };
  const { data: profile } = await supabase.from('profiles').select('id, role, status, graduation_period, institution_id').eq('id', user.id).single();
  const role = normalizeRole(profile?.role);
  return { supabase, user, profile, isInstructor: ['instructor', 'admin', 'developer'].includes(role) && profile?.status !== 'pending' && profile?.status !== 'rejected' };
}

export function slugifyProblem(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 100);
}
