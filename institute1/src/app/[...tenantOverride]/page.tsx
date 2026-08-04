import { getTenantConfig } from '@/lib/tenant/tenantResolver';
import { resolveTenantCache } from '@/lib/tenant/tenantCache';
import InstitutionLanding from '@/components/landing/InstitutionLanding';
import '@/components/landing/InstitutionLanding.css';
import { notFound } from 'next/navigation';

import LoginPage from '../(auth)/login/page';
import SignupPage from '../(auth)/signup/page';
import ForgotPasswordPage from '../(auth)/forgot-password/page';
import ResetPasswordPage from '../(auth)/reset-password/page';

// This catch-all exists to satisfy Next.js App Router's strict folder-structure
// checking in LOCAL DEVELOPMENT for path-based tenant routing (/bce-bhagalpur).
// The middleware rewrites sub-paths but not the tenant root, so this handles it.

export default async function TenantCatchAllPage({
  params,
}: {
  params: Promise<{ tenantOverride: string[] }>;
}) {
  const { tenantOverride } = await params;

  // 1. Try header-based resolution first (works when middleware injects headers)
  let { tenant, routingMode } = await getTenantConfig();
  
  // 2. Fallback: extract slug from the URL path segments directly
  const slug = tenantOverride?.[0];
  if (!tenant && slug) {
    tenant = await resolveTenantCache(slug, 'development');
    routingMode = 'subpath';
  }

  // Next.js App Router strict matching fallback:
  // Middleware rewrites to explicit routes can be shadowed by catch-all routes
  // in Next.js 13/14+. We manually delegate known sub-paths.
  const subroute = tenantOverride?.[1];
  if (subroute === 'login') return <LoginPage tenantOverride={tenant} />;
  if (subroute === 'signup') return <SignupPage tenantOverride={tenant} />;
  if (subroute === 'forgot-password') return <ForgotPasswordPage tenantOverride={tenant} />;
  if (subroute === 'reset-password') return <ResetPasswordPage />;

  if (tenant) {
    return <InstitutionLanding tenant={tenant} routingMode={routingMode as any} />;
  }

  // 3. Not a valid tenant path
  notFound();
}
