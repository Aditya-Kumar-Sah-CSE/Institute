const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...value] = line.split('=');
    env[key.trim()] = value.join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function setupBucket() {
  const { data: bucket, error } = await supabase.storage.createBucket('branding', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'],
    fileSizeLimit: 10485760 // 10MB
  });
  
  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Bucket already exists.');
    } else {
      console.error('Error creating bucket:', error);
      return;
    }
  } else {
    console.log('Bucket created:', bucket);
  }
  
  // Try to create policies using SQL via rpc if possible, but service_role bypasses RLS anyway!
  // Since the UI uses client-side or server-side?
  // Let's check admin/page.tsx:
  // "const sb = await createClient();" - this is the authenticated user's client, not service role.
  // Wait, in Next.js Server Actions (`use server`), `createClient` from `@/lib/supabase/server` creates an authenticated client!
  // So RLS applies!
  // If we can't create policies via JS client easily, maybe we should just execute the SQL migration.
}

setupBucket();
