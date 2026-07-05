import { dbMaster } from '@/lib/db/master';
import { sql } from 'drizzle-orm';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

export async function provisionNewTenant(
  slug: string,
  name: string,
  adminEmail: string
) {
  const schemaName = `tenant_${slug}`;

  // It's safer to use Drizzle wrapper function to avoid connection pool search_path pollution
  return await dbMaster.transaction(async (tx) => {
    // 1. Create the new schema
    await tx.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.raw(schemaName)}`);

    // 2. Set search path to new schema
    await tx.execute(sql`SET search_path TO ${sql.raw(schemaName)}`);

    // 3. Run all migration files in order (Placeholders for now)
    const migrationDir = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations');
    if (existsSync(migrationDir)) {
      // Logic to read and execute 001_ to 059_ scripts would go here
    }

    // 4. Insert into master tenants table
    await tx.execute(sql`SET search_path TO public`);
    await tx.execute(sql`
      INSERT INTO tenants (name, slug, schema_name, admin_email)
      VALUES (${name}, ${slug}, ${schemaName}, ${adminEmail})
    `);

    // 5. Create admin profile in tenant schema
    await tx.execute(sql`SET search_path TO ${sql.raw(schemaName)}`);
    await tx.execute(sql`
      UPDATE profiles SET role = 'admin'
      WHERE email = ${adminEmail}
    `);
    
    // Reset path back to public before finishing transaction
    await tx.execute(sql`SET search_path TO public`);

    return { schemaName, success: true };
  });
}
