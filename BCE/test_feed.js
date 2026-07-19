const { createClient } = require('@supabase/supabase-js');

async function testFetch() {
  const supabase = createClient(
    'https://myubfyfnovlvlzvglryv.supabase.co', 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dWJmeWZub3Zsdmx6dmdscnl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzEzNzg1OSwiZXhwIjoyMDk4NzEzODU5fQ.09xExBoCF_EedvA6txDVAT6OMAgmfcEaChbXlmYEd4A'
  );
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
    
  console.log('Error:', error);
  console.log('Profiles check count:', data ? data.length : 0);
}

testFetch();
