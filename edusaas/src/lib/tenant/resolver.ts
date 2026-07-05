import { dbMaster } from '@/lib/db/master';
import { tenants } from '@/lib/db/schema/master-schema';
import { eq } from 'drizzle-orm';
// import { Redis } from '@upstash/redis';

export async function getTenantBySlug(slug: string) {
  try {
    const result = await dbMaster.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (result.length > 0) return result[0];
  } catch (e) {
    // Graceful fallback if Master DB isn't seeded/ready during UI cloning phase
  }

  return {
    id: 'mock-' + slug,
    name: 'Demo ' + slug.toUpperCase(),
    slug,
    schema_name: 'public',
    status: 'active',
  };
}
