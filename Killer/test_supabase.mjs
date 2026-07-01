import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m);
const keyMatch = envFile.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)$/m);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  console.log('Testing SignIn with iambestadi@gmail.com');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'iambestadi@gmail.com',
    password: 'wrongpassword123'
  });

  if (error) {
    console.error('SignIn Error status:', error.status);
    console.error('SignIn Error message:', error.message);
  } else {
    console.log('SignIn Success (wait, with wrong password?)');
  }
}

testLogin();
