import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import { headers } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

import { getTenantBySlug } from '@/lib/tenant/resolver';

export async function getTenantDb() {
  const headersList = await headers();
  let schemaName = headersList.get('x-tenant-schema');

  if (!schemaName) {
    const slug = headersList.get('x-tenant-slug');
    if (!slug) throw new Error('No tenant context found');
    
    // Resolve from Master DB since Middleware can't use node-postgres
    const tenant = await getTenantBySlug(slug);
    schemaName = tenant ? tenant.schema_name : 'public';
  }

  const db = drizzle(pool);

  // Switch to tenant's schema
  await db.execute(sql`SET search_path TO ${sql.raw(schemaName)}`);

  return db;
}
