import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';

/**
 * PWA Smart Start
 *
 * Purpose:
 * - Keep PWA startup as lightweight as possible.
 * - Do NOT query the profiles table here.
 * - Do NOT call getOrCreateProfile().
 * - Use the authenticated Supabase user's server-controlled app_metadata
 *   only for initial routing.
 *
 * Final authorization is still handled by middleware/protected pages.
 *
 * Routes:
 *   ADMIN / DEVELOPER  -> /admin
 *   INSTRUCTOR         -> /instructor
 *   STUDENT / unknown  -> /dashboard
 *   Logged out         -> /
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PwaStartPage() {
  try {
    const user = await getUser();

    // No authenticated session → landing page
    if (!user) {
      redirect('/');
    }

    // app_metadata is server-controlled.
    // Do NOT use user_metadata for authorization.
    const role =
      typeof user.app_metadata?.role === 'string'
        ? user.app_metadata.role.trim().toLowerCase()
        : 'student';

    // Admin / Developer
    if (role === 'admin' || role === 'developer') {
      redirect('/admin');
    }

    // Instructor
    if (role === 'instructor') {
      redirect('/instructor');
    }

    // Student / unknown role
    redirect('/dashboard');
  } catch (e: any) {
    // If redirect throws (Next.js redirect throws NEXT_REDIRECT), rethrow it
    if (e?.digest?.startsWith?.('NEXT_REDIRECT')) throw e;
    // Auth failed or server error — redirect to landing
    redirect('/');
  }
}