import pg from 'pg';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrlMatch = envFile.match(/^DATABASE_URL=(.*)$/m);
const dbUrl = dbUrlMatch ? dbUrlMatch[1] : null;

const { Client } = pg;

async function testApply() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    
    // We will test updating a profile as if we are the user adityakumarsah8709@gmail.com
    const res = await client.query(`SELECT id FROM profiles WHERE email = 'adityakumarsah8709@gmail.com'`);
    const userId = res.rows[0].id;

    console.log('Testing profile update...');
    try {
      await client.query(`UPDATE profiles SET role = 'instructor', status = 'pending' WHERE id = $1`, [userId]);
      console.log('Profile update successful!');
    } catch (e) {
      console.error('Profile update failed:', e.message);
    }

    console.log('Testing instructor_applications insert...');
    try {
      await client.query(`
        INSERT INTO instructor_applications (user_id, bio, experience, status) 
        VALUES ($1, 'Test bio', 'Test exp', 'pending')
      `, [userId]);
      console.log('Application insert successful!');
    } catch (e) {
      console.error('Application insert failed:', e.message);
    }

    // Clean up test data
    await client.query(`DELETE FROM instructor_applications WHERE user_id = $1`, [userId]);
    await client.query(`UPDATE profiles SET role = 'student', status = 'active' WHERE id = $1`, [userId]);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

testApply();
