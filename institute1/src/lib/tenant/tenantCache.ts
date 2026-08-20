import { createClient } from '@/lib/supabase/server';

export const resolveTenantCache = async (slug: string, routingMode: string) => {
  if (!slug) {
    return null;
  }

  try {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabaseAdmin
      .from('institutions')
      .select('id, name, slug, status, is_platform, plan_id, primary_domain, custom_domain, logo');

    if (routingMode === 'custom') {
      query = query.eq('custom_domain', slug);
    } else {
      query = query.eq('slug', slug);
    }

    let { data, error } = await query.single();

    // Fallback 1: If slug query failed or returned nothing, check if slug is 'smart-learning' or fetch default platform institution
    if ((error || !data) && (slug === 'smart-learning' || slug === '__platform__')) {
      const { data: platformData } = await supabaseAdmin
        .from('institutions')
        .select('id, name, slug, status, is_platform, plan_id, primary_domain, custom_domain, logo')
        .eq('is_platform', true)
        .maybeSingle();

      if (platformData) {
        data = platformData;
        error = null;
      }
    }

    // Fallback 2: Virtual Platform Tenant for zero-downtime bootstrap
    if (!data && (slug === 'smart-learning' || slug === '__platform__')) {
      return {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Smart Learn',
        slug: 'smart-learning',
        status: 'active',
        is_platform: true,
        plan_id: null,
        primary_domain: null,
        custom_domain: null,
        logo: null
      };
    }

    if (data && !data.is_platform && data.status !== 'active') {
      return null;
    }
    
    if (error || !data) {
      return null;
    }

    return data;
  } catch (e) {
    console.warn('resolveTenantCache error:', e);
    if (slug === 'smart-learning' || slug === '__platform__') {
      return {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Smart Learn',
        slug: 'smart-learning',
        status: 'active',
        is_platform: true,
        plan_id: null,
        primary_domain: null,
        custom_domain: null,
        logo: null
      };
    }
    return null;
  }
};
