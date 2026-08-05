const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('d:/Institute/institute1/.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/) || envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function check() {
  const emails = ['imbestadi@gmail.com', 'saurav@gmail.com', 'absk@gmail.com', 'test@gmail.com'];
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('email', emails);
    
  const { data: instData } = await supabase
    .from('institutions')
    .select('id, name, slug')
    .limit(10);
    
  fs.writeFileSync('profiles_out.json', JSON.stringify({ profiles: data, institutions: instData }, null, 2));
  console.log('Saved to profiles_out.json');
}

check().catch(console.error);
