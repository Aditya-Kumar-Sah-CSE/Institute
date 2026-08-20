'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002').replace(/\/$/, '');

const RESERVED_SLUGS = new Set(['admin', 'login', 'api', 'dashboard', 'www', 'mail', 'support', 'root', 'app', 'auth']);

async function getAdminClient() {
  const { createClient: c } = await import('@supabase/supabase-js');
  return c(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function getInstitutionById(id: string) {
  const supabase = await getAdminClient();
  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export async function getAllInstitutions() {
  const supabase = await getAdminClient();
  const { data } = await supabase
    .from('institutions')
    .select('id, name, slug, primary_domain, custom_domain, status, domain_status, ssl_status, created_at, logo')
    .eq('status', 'active')
    .order('name');
  return data || [];
}

export async function updateSlug(institutionId: string, newSlug: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return { error: 'Unauthorised: Only Super Admin can modify slugs.' };
    }

    const slug = slugify(newSlug);

    // Validate
    if (!slug || slug.length < 2) return { error: 'Slug must be at least 2 characters.' };
    if (slug.length > 63) return { error: 'Slug cannot exceed 63 characters.' };
    if (RESERVED_SLUGS.has(slug)) return { error: `"${slug}" is a reserved word and cannot be used.` };
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length > 1) {
      return { error: 'Slug must start and end with alphanumeric characters.' };
    }

    const admin = await getAdminClient();

    // Check uniqueness
    const { data: existing } = await admin
      .from('institutions')
      .select('id')
      .eq('slug', slug)
      .neq('id', institutionId)
      .maybeSingle();
    if (existing) return { error: 'This slug is already taken by another institution.' };

    // Get current data for history
    const { data: current } = await admin.from('institutions').select('slug, domain_history').eq('id', institutionId).single();
    const history = (current?.domain_history || []) as any[];
    
    const newPrimaryDomain = `${SITE_URL}/${slug}`;
    history.push({
      event: 'slug_changed',
      from: current?.slug,
      to: slug,
      timestamp: new Date().toISOString(),
    });

    const { error } = await admin
      .from('institutions')
      .update({
        slug,
        primary_domain: newPrimaryDomain,
        domain_history: history,
      })
      .eq('id', institutionId);

    if (error) return { error: error.message };

    revalidatePath('/admin/domain-settings');
    revalidatePath(`/admin/domain-settings/${institutionId}`);
    return { success: true, newSlug: slug, newPrimaryDomain };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function connectCustomDomain(institutionId: string, customDomain: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorised.' };

    const domain = customDomain.toLowerCase().trim();
    if (!domain.includes('.')) return { error: 'Please enter a valid domain (e.g. lms.college.edu).' };
    if (domain.startsWith('http')) return { error: 'Enter the domain without http/https.' };

    const admin = await getAdminClient();

    // Check uniqueness
    const { data: dup } = await admin
      .from('institutions')
      .select('id, name')
      .eq('custom_domain', domain)
      .neq('id', institutionId)
      .maybeSingle();
    if (dup) return { error: `This domain is already registered to "${dup.name}".` };

    const { data: current } = await admin.from('institutions').select('domain_history').eq('id', institutionId).single();
    const history = (current?.domain_history || []) as any[];
    history.push({
      event: 'custom_domain_added',
      domain,
      timestamp: new Date().toISOString(),
    });

    const { error } = await admin
      .from('institutions')
      .update({
        custom_domain: domain,
        domain_status: 'pending',
        ssl_status: 'pending',
        domain_history: history,
      })
      .eq('id', institutionId);

    if (error) return { error: error.message };
    revalidatePath(`/admin/domain-settings/${institutionId}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function removeCustomDomain(institutionId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== SUPER_ADMIN_EMAIL) return { error: 'Unauthorised.' };

    const admin = await getAdminClient();
    const { data: current } = await admin.from('institutions').select('domain_history, custom_domain').eq('id', institutionId).single();
    const history = (current?.domain_history || []) as any[];
    history.push({
      event: 'custom_domain_removed',
      domain: current?.custom_domain,
      timestamp: new Date().toISOString(),
    });

    const { error } = await admin
      .from('institutions')
      .update({
        custom_domain: null,
        domain_status: 'pending',
        ssl_status: 'pending',
        verified_at: null,
        domain_history: history,
      })
      .eq('id', institutionId);

    if (error) return { error: error.message };
    revalidatePath(`/admin/domain-settings/${institutionId}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function verifyDomain(institutionId: string) {
  try {
    // In production, this would call a DNS verification API (e.g., Vercel API, Cloudflare)
    // For now, we simulate the process and mark as verified
    const admin = await getAdminClient();
    const { data: current } = await admin.from('institutions').select('domain_history, custom_domain').eq('id', institutionId).single();
    
    if (!current?.custom_domain) return { error: 'No custom domain configured.' };

    const history = (current?.domain_history || []) as any[];
    history.push({
      event: 'domain_verified',
      domain: current.custom_domain,
      timestamp: new Date().toISOString(),
    });

    const { error } = await admin
      .from('institutions')
      .update({
        domain_status: 'verified',
        ssl_status: 'ready',
        verified_at: new Date().toISOString(),
        domain_history: history,
      })
      .eq('id', institutionId);

    if (error) return { error: error.message };
    revalidatePath(`/admin/domain-settings/${institutionId}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updatePrimaryDomain(institutionId: string, newDomain: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return { error: 'Unauthorised: Only Super Admin can modify the primary domain directly.' };
    }

    const domain = newDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

    if (!domain) return { error: 'Primary domain cannot be empty.' };

    const admin = await getAdminClient();

    // Get current data for history
    const { data: current } = await admin.from('institutions').select('primary_domain, domain_history').eq('id', institutionId).single();
    const history = (current?.domain_history || []) as any[];
    
    history.push({
      event: 'primary_domain_updated',
      from: current?.primary_domain,
      to: domain,
      timestamp: new Date().toISOString(),
    });

    const { error } = await admin
      .from('institutions')
      .update({
        primary_domain: domain,
        domain_history: history,
      })
      .eq('id', institutionId);

    if (error) return { error: error.message };

    revalidatePath(`/admin/domain-settings/${institutionId}`);
    return { success: true, newPrimaryDomain: domain };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updateInstitutionFeatures(institutionId: string, featureFlags: Record<string, boolean>) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return { error: 'Unauthorised: Only Super Admin can modify feature flags.' };
    }

    const admin = await getAdminClient();
    const { error } = await admin
      .from('institutions')
      .update({ feature_flags: featureFlags })
      .eq('id', institutionId);

    if (error) return { error: error.message };

    revalidatePath('/admin/institutions');
    revalidatePath(`/admin/domain-settings/${institutionId}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updateInstitutionLimits(
  institutionId: string,
  maxStudents: number,
  maxFaculty: number,
  planTier?: string
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return { error: 'Unauthorised: Only Super Admin can modify limits.' };
    }

    const admin = await getAdminClient();
    const updateData: any = {
      max_students: maxStudents,
      max_faculty: maxFaculty,
    };
    if (planTier) updateData.plan_tier = planTier;

    const { error } = await admin
      .from('institutions')
      .update(updateData)
      .eq('id', institutionId);

    if (error) return { error: error.message };

    revalidatePath('/admin/institutions');
    revalidatePath(`/admin/domain-settings/${institutionId}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

