import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Converts a string into a clean, URL-safe readable slug.
 * E.g., "Recursion & Backtracking (Master Sheet!)" -> "recursion-and-backtracking-master-sheet"
 */
export function slugifyTitle(title: string): string {
  if (!title) return 'coding-sheet';

  let slug = title
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^\w\s-]/g, '') // remove non-alphanumeric except whitespace & hyphen
    .replace(/[\s_-]+/g, '-')  // replace space / underscores with single hyphen
    .replace(/^-+|-+$/g, '');  // trim leading/trailing hyphens

  return slug || 'coding-sheet';
}

/**
 * Generates a unique slug for a coding sheet.
 * If candidate slug exists in DB (and is not owned by the current sheet being updated),
 * appends -1, -2, or a short hash.
 */
export async function generateUniqueSheetSlug(
  supabase: SupabaseClient,
  title: string,
  currentSheetId?: string
): Promise<string> {
  const baseSlug = slugifyTitle(title);
  let candidateSlug = baseSlug;
  let attempts = 0;

  while (attempts < 20) {
    let query = supabase
      .from('coding_sheets')
      .select('id')
      .eq('slug', candidateSlug);

    if (currentSheetId) {
      query = query.neq('id', currentSheetId);
    }

    const { data, error } = await query.maybeSingle();

    // If no existing sheet found with this slug, candidate is free to use
    if (!error && !data) {
      return candidateSlug;
    }

    attempts++;
    if (attempts < 5) {
      candidateSlug = `${baseSlug}-${attempts}`;
    } else {
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      candidateSlug = `${baseSlug}-${randomSuffix}`;
    }
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}
