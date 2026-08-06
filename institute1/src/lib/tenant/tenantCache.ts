import { createClient } from '@/lib/supabase/server';

export const resolveTenantCache = async (slug: string, routingMode: string) => {
    if (!slug) {
      return null;
    }

    // Create an admin client bypassing RLS specifically for fetching basic tenant info.
    // We shouldn't use the standard Server Component client if RLS expects user session to fetch institution,
    // because unauthenticated users (e.g. login page) also need this data!
    
    // We'll dynamically impart the service role purely for fast cached reading of public institution data.
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Include is_platform so callers can distinguish platform from customer tenants.
    // For the platform institution, skip the status filter (is_platform is the authoritative flag).
    let query = supabaseAdmin
      .from('institutions')
      .select('id, name, slug, status, is_platform, plan_id, primary_domain, custom_domain, logo');

    if (routingMode === 'custom') {
      query = query.eq('custom_domain', slug);
    } else {
      query = query.eq('slug', slug);
    }

    const { data, error } = await query.single();

    // For customer tenants, enforce active status after resolution.
    // Platform institution (is_platform = true) is always reachable.
    if (data && !data.is_platform && data.status !== 'active') {
      return null;
    }
    
    if (error || !data) {
      return null;
    }

    return data;
};
