const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^"|"$/g, '');
});

function slugify(text) {
  let s = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'coding-sheet';
}

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function run() {
  const file = '117_coding_sheet_public_slug.sql';
  console.log(`Applying migration: ${file}...`);
  const sqlContent = fs.readFileSync(`./supabase/migrations/${file}`, 'utf8');
  try {
    await sql.unsafe(sqlContent);
    console.log("Migration 117 applied successfully!");

    // Populate existing sheets missing slugs
    const existing = await sql`SELECT id, title, slug FROM public.coding_sheets WHERE slug IS NULL;`;
    console.log(`Found ${existing.length} sheets without slugs. Populating...`);

    const usedSlugs = new Set();
    const allSlugs = await sql`SELECT slug FROM public.coding_sheets WHERE slug IS NOT NULL;`;
    allSlugs.forEach(r => usedSlugs.add(r.slug));

    for (const sheet of existing) {
      let baseSlug = slugify(sheet.title);
      let candidate = baseSlug;
      let counter = 1;
      while (usedSlugs.has(candidate)) {
        candidate = `${baseSlug}-${counter}`;
        counter++;
      }
      usedSlugs.add(candidate);
      await sql`UPDATE public.coding_sheets SET slug = ${candidate} WHERE id = ${sheet.id};`;
      console.log(`Assigned slug "${candidate}" to sheet "${sheet.title}" (${sheet.id})`);
    }

    console.log("All coding sheet slugs populated!");
  } catch (err) {
    console.error(`Failed:`, err.message);
  } finally {
    await sql.end();
  }
}
run();
