const { Client } = require('pg');

async function fixConstraint() {
  const client = new Client({
    connectionString: 'postgresql://postgres:A6jfXvAJNF2dPuyk@db.cmvvlshtrouyqxdrvlth.supabase.co:5432/postgres'
  });
  
  try {
    await client.connect();
    
    // First, update existing data to comply with the new constraint
    await client.query("UPDATE courses SET difficulty = 'sem 1' WHERE difficulty = 'beginner'");
    await client.query("UPDATE courses SET difficulty = 'sem 3' WHERE difficulty = 'intermediate'");
    await client.query("UPDATE courses SET difficulty = 'sem 5' WHERE difficulty = 'advanced'");

    // Drop the old constraint (it might have been dropped already, so we ignore errors or use IF EXISTS)
    await client.query('ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_difficulty_check');
    
    // Add the new constraint
    await client.query("ALTER TABLE courses ADD CONSTRAINT courses_difficulty_check CHECK (difficulty IN ('sem 1', 'sem 2', 'sem 3', 'sem 4', 'sem 5', 'sem 6', 'sem 7', 'sem 8'))");
    
    console.log('Existing rows updated and constraint applied successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

fixConstraint();
