import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/lib/db/schema/master-schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function seed() {
  console.log('🌱 Seeding demo tenants...');
  try {
    await db.insert(schema.tenants).values([
      {
        name: 'Bihar College of Engineering',
        slug: 'bce',
        schema_name: 'public', // Using public schema for demo since it's already migrated
        domain: 'bce.localhost:3000',
        admin_email: 'admin@bce.edu',
        plan_type: 'pro',
        billing_status: 'active',
        status: 'active'
      },
      {
        name: 'Institute 1',
        slug: 'institute1',
        schema_name: 'public', // Maps to public for local dev
        domain: 'institute1.localhost:3000',
        admin_email: 'admin@inst1.edu',
        plan_type: 'basic',
        billing_status: 'active',
        status: 'active'
      }
    ]).onConflictDoNothing();
    
    console.log('✅ Demo tenants added!');
    
    // Seed a default Admin User into the profiles table
    console.log('🌱 Seeding demo admin user for BCE...');
    // We import bcrypt dynamically or standard since it's a seed
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // We need to use tenant-schema to insert into profiles
    const tenantSchema = require('../src/lib/db/schema/tenant-schema');
    
    const crypto = require('crypto');
    
    await db.insert(tenantSchema.profiles).values({
      id: crypto.randomUUID(),
      email: 'admin@bce.edu',
      name: 'Aditya (Super Admin)',
      password_hash: passwordHash,
      role: 'admin',
      level: 10,
      xp: 5000,
      admission_filled: true,
      created_at: new Date()
    }).onConflictDoNothing();
    
    console.log('✅ Demo Admin User created!');
    console.log('👉 Login URL: http://bce.localhost:3000/login');
    console.log('👉 Email: admin@bce.edu');
    console.log('👉 Password: password123');
    
  } catch (error) {
    console.error('Error seeding tenants:', error);
  } finally {
    process.exit(0);
  }
}

seed();
