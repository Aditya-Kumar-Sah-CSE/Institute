const fs = require('fs');
const postgres = require('postgres');

const env = fs.readFileSync('.env.local', 'utf-8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL=')).replace('DATABASE_URL=', '').trim().replace(/"/g, '');

const sql = postgres(dbUrl);

async function run() {
  try {
    console.log("Applying RLS...");
    await sql`ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;`;
    
    await sql`
      CREATE POLICY "Public Read Access"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'story_media');
    `.catch(e => console.log('Read policy already exists or error:', e.message));

    await sql`
      CREATE POLICY "Insert Access to authenticated"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'story_media' AND auth.role() = 'authenticated');
    `.catch(e => console.log('Insert policy already exists or error:', e.message));

    await sql`
      CREATE POLICY "Delete Access to owner"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'story_media' AND auth.uid() = owner);
    `.catch(e => console.log('Delete policy already exists or error:', e.message));
    
    console.log("RLS applied successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
