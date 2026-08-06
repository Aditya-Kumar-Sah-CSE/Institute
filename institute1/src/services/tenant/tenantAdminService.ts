import { createAdminClient } from '@/lib/supabase/server';

export class TenantAdminService {
  /**
   * Fetches pending and approved instructor applications for a specific institution.
   * STRICT: requires institutionId to prevent cross-tenant data leakage.
   */
  static async getInstructorApplications(institutionId?: string) {
    if (!institutionId) {
      throw new Error('TenantAdminService: institutionId is required. Refusing to run unfiltered query.');
    }

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
      .eq('institution_id', institutionId)
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
      .eq('institution_id', institutionId)
      .order('approved_at', { ascending: false });

    if (requestsError) throw requestsError;
    if (approvedError) throw approvedError;

    return {
      requests: requests || [],
      approvedRequests: approvedRequests || [],
    };
  }
}
