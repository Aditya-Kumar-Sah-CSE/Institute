import { redirect } from 'next/navigation';
import { getTenantConfig, generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';
import { getUser } from '@/lib/supabase/server';

/**
 * PWA Smart Start Page
 *
 * Set as start_url in the PWA manifest. Performs a server-side auth
 * check and immediately redirects:
 *   - Logged-in users  → /<slug>/dashboard (or /dashboard)
 *   - Logged-out users → /login            (direct, not landing page)
 *
 * IMPORTANT: This page is NOT pre-cached by the Service Worker.
 * It must always be served fresh from the network so the auth check
 * reflects the real current session state.
 */
export default async function PwaStartPage() {
  let user = null;
  let baseUrl = '';

  try {
    const [userResult, tenantResult] = await Promise.all([
      getUser(),
      getTenantConfig(),
    ]);
    user = userResult;
    const { tenant, routingMode } = tenantResult;
    baseUrl = generateTenantBaseUrl(tenant?.slug || null, routingMode);
  } catch {
    // If anything fails (e.g. Supabase unreachable), redirect to /login
    // This is safe — /login always works and shows the form
    redirect('/login');
  }

  // Redirect logged-in users to dashboard, logged-out to login (not /)
  // Using /login instead of / avoids any potential middleware redirect chain
  // from / → middleware checks session → redirect to /login anyway.
  if (user) {
    redirect(`${baseUrl}/dashboard`);
  } else {
    redirect(`${baseUrl}/login`);
  }
}
