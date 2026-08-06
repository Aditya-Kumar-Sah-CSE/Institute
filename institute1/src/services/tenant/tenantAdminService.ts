import { createAdminClient } from '@/lib/supabase/server';

export class TenantAdminService {
  /**
   * Fetches pending and approved instructor applications bypassing RLS.
   * Runs in the backend service layer only.
   */
  static async getInstructorApplications() {
    const adminSb = await createAdminClient();

    const { data: requests, error: requestsError } = await adminSb
      .from('instructor_applications')
      .select(`
        *,
        profiles:user_id (
          name,
          email,
          institute_id
        )
      `)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false });

    const { data: approvedRequests, error: approvedError } = await adminSb
      .from('instructor_applications')
      .select(`
        *,
        profiles:user_id (
          name,
          email,
          institute_id
        )
      `)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false });

    if (requestsError) throw requestsError;
    if (approvedError) throw approvedError;

    return {
      requests: requests || [],
      approvedRequests: approvedRequests || [],
    };
  }
}
