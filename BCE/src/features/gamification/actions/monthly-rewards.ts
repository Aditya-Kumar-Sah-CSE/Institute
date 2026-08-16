'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface MonthlyReward {
  id: string;
  user_id: string;
  month_date: string;
  rank: number;
  is_seen: boolean;
}

export async function checkMonthlyRewards(userId: string): Promise<MonthlyReward[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) return [];

    const adminSb = await createAdminClient();
    
    // First, trigger the calculation of last month's winners if not already done
    // We use the admin client because this is a system-level operation
    const { error: rpcError } = await adminSb.rpc('get_and_award_last_month_winners');
    if (rpcError) {
      console.error('Error computing monthly winners:', rpcError);
    }
    
    // Fetch any unseen rewards for this user
    const { data: rewards, error } = await adminSb
      .from('monthly_rewards')
      .select('*')
      .eq('user_id', userId)
      .eq('is_seen', false);
      
    if (error) {
      console.error('Error fetching unseen monthly rewards:', error);
      return [];
    }
    
    return rewards || [];
  } catch (error) {
    console.error('Exception in checkMonthlyRewards:', error);
    return [];
  }
}

export async function markMonthlyRewardSeen(rewardId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const adminSb = await createAdminClient();
    const { error } = await adminSb
      .from('monthly_rewards')
      .update({ is_seen: true })
      .eq('id', rewardId)
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Failed to mark monthly reward as seen:', error);
    }
  } catch (error) {
    console.error('Exception in markMonthlyRewardSeen:', error);
  }
}

export async function getPastMonthlyRewards(userId: string): Promise<MonthlyReward[]> {
  try {
    const sb = await createClient();
    const { data: rewards, error } = await sb
      .from('monthly_rewards')
      .select('*')
      .eq('user_id', userId)
      .order('month_date', { ascending: false });
      
    if (error) {
      console.error('Error fetching past monthly rewards:', error);
      return [];
    }
    
    return rewards || [];
  } catch (error) {
    console.error('Exception in getPastMonthlyRewards:', error);
    return [];
  }
}
