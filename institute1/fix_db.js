const { createClient } = require('@supabase/supabase-js');
const url = 'https://cmvvlshtrouyqxdrvlth.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdnZsc2h0cm91eXF4ZHJ2bHRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkzMzc4NiwiZXhwIjoyMDk3NTA5Nzg2fQ.7FIwiu7BOD47gZ0N4XcUrwU0-b3Tulzn3crhxPNpOHc';
const supabase = createClient(url, key);

async function main() {
  const { data: inst } = await supabase.from('institutions').select('id').eq('slug', 'bce-bhagalpur').single();
  if (inst) {
    const { data: updateRes, error } = await supabase
      .from('profiles')
      .update({ institution_id: inst.id })
      .eq('email', 'adityakumarsah@gmail.com')
      .select();
    if (error) console.error("Error updating:", error);
    else console.log("Success updated profile for adityakumarsah@gmail.com! Data:", JSON.stringify(updateRes));
  } else {
    console.log("Institution not found!");
  }
}
main();
