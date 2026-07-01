const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  const sql = `
DROP POLICY IF EXISTS "Instructors can view their own courses" ON courses;
CREATE POLICY "Instructors can view their own courses" 
  ON courses FOR SELECT 
  USING (
    auth.uid() = created_by 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
      AND profiles.status = 'active'
    )
  );
`;
  try {
    await client.query(sql);
    console.log("Policy added successfully.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
