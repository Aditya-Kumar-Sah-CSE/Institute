const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testQuery() {
  const { data, error } = await supabase
    .from('pricing_plans')
    .select('id, name, subscriptions(id, status, institutions(name, logo))')
    .eq('is_deleted', false);
    
  if (error) console.error("Error:", error);
  else console.log(JSON.stringify(data, null, 2));
}
testQuery();
