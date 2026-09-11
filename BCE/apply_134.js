const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^"|"$/g, '');
});

const dbUrl = env.POSTGRES_URL || env.DATABASE_URL || env.SUPABASE_DB_URL || env.DIRECT_URL;
if (!dbUrl) {
  console.error("Error: No connection string found in .env.local");
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require' });

async function run() {
  console.log("Updating user_ai_providers_provider_check and user_ai_settings_active_provider_check constraints...");
  try {
    await sql.unsafe(`
      ALTER TABLE public.user_ai_providers DROP CONSTRAINT IF EXISTS user_ai_providers_provider_check;
      ALTER TABLE public.user_ai_providers ADD CONSTRAINT user_ai_providers_provider_check CHECK (provider IN ('gemini', 'grok', 'groq'));

      ALTER TABLE public.user_ai_settings DROP CONSTRAINT IF EXISTS user_ai_settings_active_provider_check;
      ALTER TABLE public.user_ai_settings ADD CONSTRAINT user_ai_settings_active_provider_check CHECK (active_provider IN ('gemini', 'grok', 'groq'));

      NOTIFY pgrst, 'reload schema';
    `);
    console.log("SUCCESS: user_ai_providers and user_ai_settings constraints updated for groq!");
  } catch (err) {
    console.error("Failed:", err.message);
  } finally {
    await sql.end();
  }
}
run();
