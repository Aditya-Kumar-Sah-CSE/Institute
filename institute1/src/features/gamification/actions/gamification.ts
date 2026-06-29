'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getLevelFromXP } from '@/lib/utils';
import { XP_VALUES } from '@/lib/constants';
import { awardXP } from '@/features/auth/actions/auth';

export async function checkBadges(userId: string) {
  const supabase = await createClient();
  const adminSb = await createAdminClient();

  // 1. Get all available badges
  const { data: allBadges } = await supabase.from('badges').select('*');
  if (!allBadges) return;

  // 2. Get user's current stats (for condition checking)
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  
  // Fetch completed assignments from xp_log (submissions are deleted after approval)
  const { data: completedXpLogs } = await supabase
    .from('xp_log')
    .select('source_id')
    .eq('user_id', userId)
    .eq('source_type', 'assignment');

  const completedAssignmentIds = [...new Set(completedXpLogs?.map(l => l.source_id).filter(Boolean) || [])];

  let completedAssignments: { id: string; type: string; requires_deploy: boolean; requires_github: boolean }[] = [];
  if (completedAssignmentIds.length > 0) {
    const { data } = await supabase
      .from('assignments')
      .select('id, type, requires_deploy, requires_github')
      .in('id', completedAssignmentIds);
    completedAssignments = data || [];
  }

  const deployCount = completedAssignments.filter(a => a.type === 'deploy' || a.requires_deploy).length;
  const githubCount = completedAssignments.filter(a => a.type === 'github' || a.requires_github).length;
  const codeCompleteCount = completedAssignments.filter(a => a.type === 'code').length;

  // For MCQ perfect scores, check submissions table (MCQs are auto-approved and not deleted)
  const { data: approvedSubmissions } = await supabase
    .from('submissions')
    .select('score, assignments(type)')
    .eq('user_id', userId)
    .eq('status', 'approved');

  const perfectQuizzes = approvedSubmissions?.filter(s => {
    const type = Array.isArray(s.assignments) ? s.assignments[0]?.type : (s.assignments as { type: string } | null)?.type;
    return type === 'mcq' && s.score === 100;
  }).length || 0;

  const { count: courseCount } = await supabase.from('enrollments').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).not('completed_at', 'is', null);

  const { count: enrolledCount } = await supabase.from('enrollments').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('status', 'approved');

  const { count: approvedAssignmentCount } = await supabase.from('submissions').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('status', 'approved');

  const { data: enrollments } = await supabase.from('enrollments').select('course_id, progress').eq('user_id', userId);

  // Faculty logic: count courses created by this user
  const { count: coursesCreatedCount } = await supabase.from('courses').select('*', { count: 'exact', head: true })
    .eq('created_by', userId);


  // 3. Get currently earned badges
  const { data: earned } = await supabase.from('user_badges').select('badge_id').eq('user_id', userId);
  const earnedIds = new Set(earned?.map(e => e.badge_id) || []);

  // 4. Evaluate conditions
  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue; // Already earned

    let isEligible = false;

    switch (badge.condition_type) {
      case 'xp_threshold':
        isEligible = (profile?.xp || 0) >= (badge.condition_value || 0);
        break;
      case 'deploy_count':
        isEligible = (deployCount || 0) >= (badge.condition_value || 0);
        break;
      case 'github_count':
        isEligible = (githubCount || 0) >= (badge.condition_value || 0);
        break;
      case 'perfect_score':
        isEligible = (perfectQuizzes || 0) >= (badge.condition_value || 0);
        break;
      case 'code_complete':
        isEligible = (codeCompleteCount || 0) >= (badge.condition_value || 0);
        break;
      case 'course_complete':
        if (badge.course_id) {
          // Course-specific badge: check if the user has 100% progress on this specific course
          const enrollment = enrollments?.find(e => e.course_id === badge.course_id);
          isEligible = !!enrollment && enrollment.progress >= 1.0;
        } else {
          // Global badge: check total completed courses count
          isEligible = (courseCount || 0) >= (badge.condition_value || 0);
        }
        break;
      case 'streak_days':
        isEligible = (profile?.streak_days || 0) >= (badge.condition_value || 0);
        break;
      case 'active_days':
        isEligible = (profile?.total_active_days || 0) >= (badge.condition_value || 0);
        break;
      case 'course_enrolled':
        isEligible = (enrolledCount || 0) >= (badge.condition_value || 0);
        break;
      case 'assignments_approved':
        isEligible = (approvedAssignmentCount || 0) >= (badge.condition_value || 0);
        break;
      case 'courses_created':
        isEligible = (coursesCreatedCount || 0) >= (badge.condition_value || 0);
        break;
    }

    if (isEligible) {
      const { error } = await adminSb.from('user_badges').insert({
        user_id: userId,
        badge_id: badge.id
      });
      
      // Award Bonus XP if the badge has it and insert was successful
      if (!error && badge.bonus_xp && badge.bonus_xp > 0) {
        await awardXP(userId, badge.bonus_xp, `Bonus Reward: ${badge.name}`, 'badge_bonus', badge.id);
      }
    }
  }
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

  // Always evaluate badges when fetching unseen to catch retroactive eligibility 
  // (e.g. for users who are already active today so they bypass updateStreak)
  await checkBadges(user.id).catch(console.error);

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
