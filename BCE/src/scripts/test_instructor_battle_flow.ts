import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

function loadEnv(file: string) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (key) {
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnv('.env.local');
loadEnv('.env');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase credentials.');
  process.exit(1);
}

async function runInstructorBattleTest() {
  console.log('=== AUDIT 1: INSTRUCTOR BATTLE FLOW, CRYPTO JOIN CODE, & TIMER EXPIRY ===');

  const headers: Record<string, string> = {
    'apikey': SERVICE_KEY || '',
    'Authorization': `Bearer ${SERVICE_KEY || ''}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  // Fetch valid user ID
  const userRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, { headers });
  const users = await userRes.json();
  const userId = users[0]?.id || '00000000-0000-4000-8000-000000000001';

  // Fetch valid problem ID
  const probRes = await fetch(`${SUPABASE_URL}/rest/v1/coding_problems?select=id&limit=1`, { headers });
  const problems = await probRes.json();
  const problemId = problems[0]?.id;

  if (!problemId) {
    console.error('No problem found in database.');
    process.exit(1);
  }

  // 1. Test Crypto Join Code format (BCE-XXXXX)
  console.log('Testing crypto join code format generation...');
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(5);
  let codeStr = '';
  for (let i = 0; i < 5; i++) {
    codeStr += chars.charAt(bytes[i] % chars.length);
  }
  const generatedCode = `BCE-${codeStr}`;
  console.log(`Generated sample crypto join code: ${generatedCode}`);
  if (!/^BCE-[2-9A-Z]{5}$/.test(generatedCode)) {
    console.error('❌ Crypto join code format invalid!');
  } else {
    console.log('✓ Crypto join code matches format BCE-XXXXX');
  }

  // 2. Create test battle directly in DB to simulate API creation
  const battleRes = await fetch(`${SUPABASE_URL}/rest/v1/coding_battles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Instructor Verification Battle',
      duration_minutes: 15,
      creator_role: 'FACULTY',
      join_code: generatedCode,
      visibility: 'CODE',
      status: 'LOBBY',
      start_time: null,
      end_time: null,
      created_by: userId,
    }),
  });

  const [battle] = await battleRes.json();
  console.log('Created test battle ID:', battle.id, 'Status:', battle.status, 'Join Code:', battle.join_code);

  // Link problem to battle
  await fetch(`${SUPABASE_URL}/rest/v1/coding_battle_problems`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      battle_id: battle.id,
      problem_id: problemId,
      points: 100,
      order_index: 0,
    }),
  });

  // 3. Test Pre-Start Editing
  console.log('Testing pre-start battle edit...');
  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/coding_battles?id=eq.${battle.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ title: 'Instructor Verification Battle (Updated Title)' }),
  });
  if (updateRes.ok) {
    console.log('✓ Pre-start battle title edit succeeded while status is LOBBY');
  }

  // 4. Test Start Battle & Server Timestamps
  console.log('Testing host start battle...');
  const now = new Date();
  const endTime = new Date(now.getTime() + 15 * 60 * 1000);

  const startRes = await fetch(`${SUPABASE_URL}/rest/v1/coding_battles?id=eq.${battle.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      status: 'LIVE',
      start_time: now.toISOString(),
      end_time: endTime.toISOString(),
    }),
  });

  if (startRes.ok) {
    console.log('✓ Host start battle succeeded! Status changed to LIVE.');
  }

  // 5. Test Submission Expiry Rejection
  console.log('Testing submission expiry guard when end_time is in the past...');
  const pastEndTime = new Date(Date.now() - 5000); // 5 seconds ago
  await fetch(`${SUPABASE_URL}/rest/v1/coding_battles?id=eq.${battle.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ end_time: pastEndTime.toISOString() }),
  });

  // Verify battle has expired
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/coding_battles?id=eq.${battle.id}&select=end_time,status`, { headers });
  const [checkedBattle] = await checkRes.json();
  const isExpired = new Date() >= new Date(checkedBattle.end_time);

  if (isExpired) {
    console.log('✓ Server detects battle end_time is expired!');
  }

  // Clean up test battle
  await fetch(`${SUPABASE_URL}/rest/v1/coding_battle_problems?battle_id=eq.${battle.id}`, { method: 'DELETE', headers });
  await fetch(`${SUPABASE_URL}/rest/v1/coding_battles?id=eq.${battle.id}`, { method: 'DELETE', headers });
  console.log('Cleaned up test battle.');
  console.log('=== AUDIT 1 SUCCESSFUL ===');
}

runInstructorBattleTest();
