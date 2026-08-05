import { createClient } from '@/lib/supabase/server';

export const resolveTenantCache = async (slug: string, routingMode: string) => {
    // Phase 1: Intercept virtual platform tenant
    if (slug === '__platform__') {
      return {
        id: 'platform',
        name: 'Smart Learning Platform',
        slug: '__platform__',
        status: 'active',
        plan_id: 'enterprise',
        primary_domain: null,
        custom_domain: null,
        logo: null,
        routingMode: 'platform',
        isPlatform: true
      };
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

    let query = supabaseAdmin
      .from('institutions')
      .select('id, name, slug, status, plan_id, primary_domain, custom_domain, logo')
      .eq('status', 'active');
      
    if (routingMode === 'custom') {
      query = query.eq('custom_domain', slug);
    } else {
      query = query.eq('slug', slug);
    }

    const { data, error } = await query.single();
    
    if (error || !data) {
      return null;
    }

    return data;
};
