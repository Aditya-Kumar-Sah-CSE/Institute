import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  shortName?: string | null;
  logo?: string | null;
  favicon?: string | null;
  coverImage?: string | null;
  description?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  domain?: string | null;
  subdomain?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// In-memory cache for fast server-side tenant lookup
const tenantCache = new Map<string, { tenant: Tenant; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  if (!slug) return null;
  
  const cacheKey = `slug:${slug.toLowerCase()}`;
  const cached = tenantCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenant;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('slug', slug.toLowerCase())
      .single();

    if (error || !data) return null;

    const tenant: Tenant = {
      id: data.id,
      slug: data.slug,
      name: data.name,
      shortName: data.short_name,
      logo: data.logo,
      favicon: data.favicon,
      coverImage: data.cover_image,
      description: data.description,
      primaryColor: data.primary_color || '#4F46E5',
      secondaryColor: data.secondary_color || '#06B6D4',
      website: data.website,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      address: data.address,
      domain: data.domain,
      subdomain: data.subdomain,
      isActive: data.is_active ?? true,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    tenantCache.set(cacheKey, { tenant, expiresAt: Date.now() + CACHE_TTL_MS });
    return tenant;
  } catch (err) {
    console.error('Error in getTenantBySlug:', err);
    return null;
  }
}

export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  if (!domain) return null;
  
  const cacheKey = `domain:${domain.toLowerCase()}`;
  const cached = tenantCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenant;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .or(`domain.eq.${domain.toLowerCase()},subdomain.eq.${domain.toLowerCase()}`)
      .single();

    if (error || !data) return null;

    const tenant: Tenant = {
      id: data.id,
      slug: data.slug,
      name: data.name,
      shortName: data.short_name,
      logo: data.logo,
      favicon: data.favicon,
      coverImage: data.cover_image,
      description: data.description,
      primaryColor: data.primary_color || '#4F46E5',
      secondaryColor: data.secondary_color || '#06B6D4',
      website: data.website,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      address: data.address,
      domain: data.domain,
      subdomain: data.subdomain,
      isActive: data.is_active ?? true,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    tenantCache.set(cacheKey, { tenant, expiresAt: Date.now() + CACHE_TTL_MS });
    return tenant;
  } catch (err) {
    console.error('Error in getTenantByDomain:', err);
    return null;
  }
}

export async function getTenantFromHeaders(): Promise<{ tenantId: string | null; tenantSlug: string | null; routingMode: string | null }> {
  try {
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id');
    const tenantSlug = headersList.get('x-tenant-slug');
    const routingMode = headersList.get('x-routing-mode');

    return { tenantId, tenantSlug, routingMode };
  } catch {
    return { tenantId: null, tenantSlug: null, routingMode: null };
  }
}

export async function getCurrentTenant(): Promise<Tenant | null> {
  const { tenantSlug } = await getTenantFromHeaders();
  if (!tenantSlug) return null;
  return await getTenantBySlug(tenantSlug);
}

export function generateTenantBaseUrl(slug: string, origin?: string): string {
  if (!slug) return origin || '';
  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    if (currentOrigin.includes('localhost')) {
      return `${currentOrigin}/${slug}`;
    }
    return `https://${slug}.smartlearn.in`;
  }
  return origin ? `${origin}/${slug}` : `/${slug}`;
}
