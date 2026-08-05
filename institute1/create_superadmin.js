const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('d:/Institute/institute1/.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/) || envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const email = 'imbestadi@gmail.com';
  
  // Try to create the user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'Password123!',
    email_confirm: false
  });
  
  if (authError && authError.message !== 'User already registered') {
    console.error("Auth creation error:", authError);
    return;
  }
  
  // fetch the user id (if already exists, get from admin list Users or find by email?)
  // Actually admin listUsers is better if they existed but no profile
  let userId = authData?.user?.id;
  if (!userId) {
     const { data: users } = await supabase.auth.admin.listUsers();
     const existing = users.users.find(u => u.email === email);
     if (existing) {
         userId = existing.id;
         console.log("User already in auth.users, id:", userId);
     }
  } else {
     console.log("Created user in auth.users, id:", userId);
  }
  
  if (userId) {
     // Check if profile was created by trigger
     const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
     
     if (!profile) {
         await supabase.from('profiles').insert({
             id: userId,
             email,
             name: 'Imbestadi Superadmin',
             role: 'super_admin',
             institution_id: null,
             status: 'active'
         });
         console.log("Inserted profile manually and set as super_admin");
     } else {
         await supabase.from('profiles').update({
             role: 'super_admin',
             institution_id: null
         }).eq('id', userId);
         console.log("Updated profile role to super_admin");
     }
  }
}

run().catch(console.error);
