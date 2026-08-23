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

export interface TenantLandingContent {
  tagline?: string | null;
  heroBadge?: string | null;
  heroHeading?: string | null;
  heroHighlight?: string | null;
  heroDescription?: string | null;
  heroImageUrl?: string | null;
  heroCtaText?: string | null;
  heroCtaLink?: string | null;
  logoUrl?: string | null;
  cards: Array<{ id: string; image_url: string; title: string; description?: string | null }>;
  features: Array<{ id: string; title: string; description?: string | null; icon?: string | null; image_url?: string | null }>;
}

export async function getTenantLandingContent(tenant: Tenant): Promise<TenantLandingContent> {
  const db = await createClient();
  const [settings, content, cards, features, globalContent, globalCards, globalFeatures] = await Promise.all([
    db.from('company_settings').select('logo_url').maybeSingle(),
    db.from('tenant_landing_content').select('*').eq('institution_id', tenant.id).maybeSingle(),
    db.from('tenant_landing_gallery').select('id,image_url,title,description').eq('institution_id', tenant.id).eq('is_active', true).order('sort_order'),
    db.from('tenant_landing_features').select('id,title,description,icon,image_url').eq('institution_id', tenant.id).eq('is_active', true).order('sort_order'),
    db.from('landing_content').select('*').eq('id', 'default').maybeSingle(),
    db.from('landing_gallery').select('id,image_url,title,description').eq('is_active', true).order('sort_order'),
    db.from('landing_core_features').select('id,title,description,icon,image_url').eq('is_active', true).order('sort_order'),
  ]);
  const local = content.data || {};
  const global = globalContent.data || {};
  return {
    tagline: local.tagline || global.tagline || null,
    heroBadge: local.hero_badge || global.hero_badge || null,
    // Institution identity is never inherited from the global platform hero.
    // The configured institution name remains the authoritative tenant heading.
    heroHeading: local.hero_heading || null,
    heroHighlight: local.hero_highlight || tenant.name,
    heroDescription: local.hero_description || global.hero_description || tenant.description || null,
    heroImageUrl: tenant.coverImage || local.hero_image_url || global.hero_image_url || null,
    heroCtaText: local.hero_cta_text || global.hero_cta_text || null,
    heroCtaLink: local.hero_cta_link || global.hero_cta_link || null,
    logoUrl: tenant.logo || settings.data?.logo_url || null,
    cards: cards.data?.length ? cards.data : (globalCards.data || []),
    features: features.data?.length ? features.data : (globalFeatures.data || []),
  };
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
