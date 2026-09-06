'use server';

import { getUser } from '@/lib/supabase/server';
import { getStudent360Profile, Student360Profile } from '../services/student-intelligence';

export async function refreshStudentAnalyticsAction(): Promise<{
  success: boolean;
  profile?: Student360Profile;
  error?: string;
}> {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User authentication required' };
    }

    const profile = await getStudent360Profile(user.id);
    return { success: true, profile };
  } catch (error: any) {
    console.error('Error refreshing student analytics:', error);
    return {
      success: false,
      error: error.message || 'Failed to refresh student analytics profile'
    };
  }
}
