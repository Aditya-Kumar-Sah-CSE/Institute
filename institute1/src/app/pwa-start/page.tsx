import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';

/**
 * PWA Smart Start Page
 * 
 * This page is set as the PWA start_url in manifest.json.
 * It performs a server-side auth check and instantly redirects:
 * - Logged-in users  → /dashboard  (skip landing page entirely)
 * - Logged-out users → /           (show landing page)
 * 
 * Result: PWA icon tap feels instant for returning users — 
 * no wasted landing page render for authenticated sessions.
 */
export default async function PwaStartPage() {
  const user = await getUser();
  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/');
  }
}
