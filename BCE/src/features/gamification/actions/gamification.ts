'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getLevelFromXP } from '@/lib/utils';
import { XP_VALUES } from '@/lib/constants';
import { awardXP } from '@/features/auth/actions/auth';

export async function checkBadges(userId: string) {
  const adminSb = await createAdminClient();
  await adminSb.rpc('evaluate_student_badges', { p_student_id: userId });
}

export async function updateStreak(userId: string) {
  const supabase = await createClient();
  const adminSb = await createAdminClient();

  const { data: profile } = await supabase.from('profiles').select('last_active_at, streak_days, total_active_days').eq('id', userId).single();
  if (!profile) return;

  const now = new Date();
  const lastActive = profile.last_active_at ? new Date(profile.last_active_at) : null;
  
  let newStreak = profile.streak_days;
  let newTotalActiveDays = profile.total_active_days || 0;
  let shouldAwardStreakXP = false;

  if (!lastActive) {
    newStreak = 1;
    newTotalActiveDays = 1;
    shouldAwardStreakXP = true;
  } else {
    // Check if it's a new day
    const isSameDay = lastActive.getDate() === now.getDate() && 
                      lastActive.getMonth() === now.getMonth() && 
                      lastActive.getFullYear() === now.getFullYear();
    
    // Check if it's the next day
    const isNextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toDateString() === lastActive.toDateString();

    if (!isSameDay) {
      if (isNextDay) {
        newStreak += 1;
        newTotalActiveDays += 1;
        shouldAwardStreakXP = true;
      } else {
        newStreak = 1; // Streak broken
        newTotalActiveDays += 1;
        shouldAwardStreakXP = true; // Still award for the new day
      }
    }
  }

  // Update profile
  await supabase.from('profiles').update({
    last_active_at: now.toISOString(),
    streak_days: newStreak,
    total_active_days: newTotalActiveDays
  }).eq('id', userId);

  // Award XP if it's a new day
  if (shouldAwardStreakXP) {
    // Use the awardXP logic (duplicating slightly here to avoid circular dep if needed, or import it)
    const { data: newProf } = await supabase.from('profiles').select('xp').eq('id', userId).single();
    if (newProf) {
      const updatedXp = newProf.xp + XP_VALUES.DAILY_STREAK;
      await adminSb.from('profiles').update({
        xp: updatedXp,
        level: getLevelFromXP(updatedXp)
      }).eq('id', userId);
      
      await adminSb.from('xp_log').insert({
        user_id: userId,
        action: 'Daily Login Streak',
        xp_amount: XP_VALUES.DAILY_STREAK,
        source_type: 'streak'
      });
    }
  }

  // Always check badges on login
  await checkBadges(userId);
}

export async function getUnseenBadges() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Avoid running checkBadges on every fetchUnseen to prevent heavy DB load.
  // checkBadges is already invoked on daily login streak update and major achievements.

  const { data: unseen } = await supabase
    .from('user_badges')
    .select(`
      id,
      badges (
        id,
        name,
        icon,
        description
      )
    `)
    .eq('user_id', user.id)
    .eq('is_seen', false);

  return unseen || [];
}

export async function markBadgesSeen(userBadgeIds: string[]) {
  const supabase = await createClient();
  const adminSb = await createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !userBadgeIds.length) return;

  await adminSb
    .from('user_badges')
    .update({ is_seen: true })
    .in('id', userBadgeIds)
    .eq('user_id', user.id);
}
