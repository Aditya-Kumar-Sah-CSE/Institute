const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function fixBug() {
  try {
    console.log("Dropping existing broken tables...");
    await sql.unsafe(`
      DROP TABLE IF EXISTS public.story_views CASCADE;
      DROP TABLE IF EXISTS public.story_reactions CASCADE;
      DROP TABLE IF EXISTS public.story_replies CASCADE;
    `);

    console.log("Re-creating tables with correct foreign keys...");
    await sql.unsafe(`
      CREATE TABLE public.story_views (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          story_item_id UUID NOT NULL REFERENCES public.story_items(id) ON DELETE CASCADE,
          viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(story_item_id, viewer_id)
      );

      CREATE TABLE public.story_reactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          story_item_id UUID NOT NULL REFERENCES public.story_items(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          emoji TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(story_item_id, user_id)
      );

      CREATE TABLE public.story_replies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          story_item_id UUID NOT NULL REFERENCES public.story_items(id) ON DELETE CASCADE,
          sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.story_replies ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Anyone can view views" ON public.story_views FOR SELECT USING (auth.role() = 'authenticated');
      CREATE POLICY "Authenticated users can view" ON public.story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

      CREATE POLICY "Anyone can view reactions" ON public.story_reactions FOR SELECT USING (auth.role() = 'authenticated');
      CREATE POLICY "Users can add reactions" ON public.story_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Users can remove reactions" ON public.story_reactions FOR DELETE USING (auth.uid() = user_id);
      CREATE POLICY "Users can update reactions" ON public.story_reactions FOR UPDATE USING (auth.uid() = user_id);

      CREATE POLICY "Anyone can view replies" ON public.story_replies FOR SELECT USING (auth.role() = 'authenticated');
      CREATE POLICY "Users can add replies" ON public.story_replies FOR INSERT WITH CHECK (auth.uid() = sender_id);
    `);
    
    console.log("Triggering PostgREST Cache Webhook Reload...");
    // Calling an undocumented explicit cache buster function if it exists, otherwise standard trigger
    try {
      // Create a dummy table and drop it. This forces a schema change which ALWAYS triggers 
      // Supabase's internal webhook to reload PostgREST schemas immediately.
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS public._pgrst_schema_buster (id INT);
        DROP TABLE IF EXISTS public._pgrst_schema_buster;
      `);
    } catch(e) { }
    
    console.log("Fixed! Tables correctly mapped to story_items.");
  } catch(e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}

fixBug();
