import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./src/lib/db/schema/master-schema.ts', './src/lib/db/schema/tenant-schema.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
});
