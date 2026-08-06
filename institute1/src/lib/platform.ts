/**
 * lib/platform.ts
 *
 * Single source of truth for resolving the Platform Institution.
 *
 * Rules:
 *  - Authorization is always via `is_platform = true`, NEVER by slug comparison.
 *  - The UUID is database-generated; it is never hardcoded here.
 *  - Results are memoized per-request via React cache().
 *  - This module must never be imported from middleware.ts (no Node-Postgres / Supabase
 *    auth calls in the edge runtime).
 */

import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/server';

export type PlatformInstitution = {
  id: string;
  name: string;
  slug: string;
  is_platform: true;
};

/**
 * Resolves the Platform Institution row from Supabase.
 * Uses `is_platform = true` as the selector — slug is NOT used for auth decisions.
 * Result is memoized per React render tree via cache().
 *
 * Throws if the Platform Institution has not been created (run migration 092).
 */
export const getPlatformInstitution = cache(async (): Promise<PlatformInstitution> => {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('institutions')
    .select('id, name, slug, is_platform')
    .eq('is_platform', true)   // authorization decision — never .eq('slug', 'smart-learning')
    .single();

  if (error || !data) {
    throw new Error(
      '[Platform] Platform Institution not found. ' +
      'Ensure migration 092_platform_institution.sql has been applied to your Supabase project.'
    );
  }

  return data as PlatformInstitution;
});

/**
 * Convenience wrapper — returns just the Platform Institution UUID.
 * Cached per-request via cache().
 */
export const getPlatformId = cache(async (): Promise<string> => {
  const platform = await getPlatformInstitution();
  return platform.id;
});
