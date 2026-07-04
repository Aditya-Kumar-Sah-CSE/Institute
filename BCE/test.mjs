import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.from('enrollments').select('progress, status, course_id, courses(id, title, thumbnail_url, description, difficulty, total_xp, is_published, profiles:created_by(name))');
  console.log(JSON.stringify({data, error}, null, 2));
}

main();
