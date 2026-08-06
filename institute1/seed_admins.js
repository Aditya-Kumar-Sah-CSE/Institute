const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();

async function run() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 5000
  });

  try {
    await client.connect();
    console.log('Connected to PG');
    const res = await client.query("SELECT id, email FROM auth.users WHERE email IN ('iambestadi@gmail.com', 'adityakumarsah@gmail.com')");
    console.log('Found users in auth.users:', res.rows);

    const superUser = res.rows.find(r => r.email === 'iambestadi@gmail.com');
    const bceUser = res.rows.find(r => r.email === 'adityakumarsah@gmail.com');

    // Fetch platform inst ID
    const instRes = await fetch(`${url}/rest/v1/institutions?slug=eq.smart-learning`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const insts = await instRes.json();
    const platformInstId = insts[0]?.id;

    // Fetch BCE inst ID
    const bceRes = await fetch(`${url}/rest/v1/institutions?slug=eq.bce-bhagalpur`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const bces = await bceRes.json();
    const bceInstId = bces[0]?.id;

    if (superUser) {
      await client.query(`
        INSERT INTO public.platform_users (id, role, is_active, status)
        VALUES ('${superUser.id}', 'super_admin', true, 'active')
        ON CONFLICT (id) DO UPDATE SET role = 'super_admin', is_active = true, status = 'active';
      `);
      await client.query(`
        INSERT INTO public.profiles (id, name, email, role, institution_id, status)
        VALUES ('${superUser.id}', 'Platform Super Admin', 'iambestadi@gmail.com', 'admin', '${platformInstId}', 'active')
        ON CONFLICT (id) DO UPDATE SET role = 'admin', institution_id = '${platformInstId}';
      `);
      console.log('✅ Super Admin platform_users and profiles records created!');
    }

    if (bceUser) {
      const instId = bceInstId || platformInstId;
      await client.query(`
        INSERT INTO public.profiles (id, name, email, role, institution_id, status)
        VALUES ('${bceUser.id}', 'BCE Bhagalpur Admin', 'adityakumarsah@gmail.com', 'admin', '${instId}', 'active')
        ON CONFLICT (id) DO UPDATE SET role = 'admin', institution_id = '${instId}';
      `);
      console.log('✅ BCE Bhagalpur Admin profiles record created!');
    }

    await client.end();
    if (fs.existsSync('seed_admins.js')) fs.unlinkSync('seed_admins.js');
  } catch (err) {
    console.error('PG Error:', err.message);
    await client.end();
  }
}

run();
