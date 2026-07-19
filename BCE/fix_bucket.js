const { createClient } = require('@supabase/supabase-js');

async function fixBucket() {
  const supabase = createClient(
    'https://myubfyfnovlvlzvglryv.supabase.co', 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dWJmeWZub3Zsdmx6dmdscnl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzEzNzg1OSwiZXhwIjoyMDk4NzEzODU5fQ.09xExBoCF_EedvA6txDVAT6OMAgmfcEaChbXlmYEd4A'
  );
  
  const { data, error } = await supabase.storage.updateBucket('story_media', {
    public: true
  });
  
  if (error) {
    console.error('Failed to update bucket:', error);
  } else {
    console.log('Bucket is now PUBLIC!', data);
  }
}

fixBucket();
