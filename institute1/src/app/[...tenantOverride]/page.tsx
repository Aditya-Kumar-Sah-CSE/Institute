import { getTenantConfig } from '@/lib/tenant/tenantResolver';
import { resolveTenantCache } from '@/lib/tenant/tenantCache';
import InstitutionLanding from '@/components/landing/InstitutionLanding';
import '@/components/landing/InstitutionLanding.css';
import { notFound } from 'next/navigation';

import LoginPage from '../(auth)/login/page';
import SignupPage from '../(auth)/signup/page';
import ForgotPasswordPage from '../(auth)/forgot-password/page';
import ResetPasswordPage from '../(auth)/reset-password/page';

// This exists to gently satisfy Next.js App Router's strict folder-structure
// checking in LOCAL DEVELOPMENT for path-based tenant routing (/bce-bhagalpur).
// The middleware rewrites sub-paths but not the tenant root, so this handles the root.

export default async function TenantPage({
  params,
}: {
  params: Promise<{ tenantOverride: string | string[] }>;
}) {
  const { tenantOverride } = await params;

  // Next.js App Router explicitly swallows middleware rewrites if a catch-all route returns a valid
  // component. To force Next.js to honor `NextResponse.rewrite("/login")` or `/dashboard`, we
  // natively reject any URL path beyond the first segment by invoking `notFound()`.
  if (Array.isArray(tenantOverride) && tenantOverride.length > 1) {
    notFound();
  }

  // 1. Try header-based resolution first (works when middleware injects headers)
  let { tenant, routingMode } = await getTenantConfig();
  
  // 2. Fallback: extract slug directly
  const slug = Array.isArray(tenantOverride) ? tenantOverride[0] : tenantOverride;
  if (!tenant && slug) {
    tenant = await resolveTenantCache(slug, 'development');
    routingMode = 'subpath';
  }

  if (tenant) {
    return <InstitutionLanding tenant={tenant} routingMode={routingMode as any} />;
  }

  // 3. Not a valid tenant path
  notFound();
}
