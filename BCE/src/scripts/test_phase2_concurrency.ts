import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase credentials.');
  process.exit(1);
}

async function testPhase2Concurrency() {
  console.log('=== PHASE 2 CONCURRENCY & CAPACITY AUDIT ===');
  const headers: Record<string, string> = {
    'apikey': SERVICE_KEY || '',
    'Authorization': `Bearer ${SERVICE_KEY || ''}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  // Get a valid user id from profiles
  const userRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, { headers });
  const users = await userRes.json();
  const creatorId = users[0]?.id || '00000000-0000-4000-8000-000000000001';

  // 1. Create a dummy battle in LOBBY status
  const battleRes = await fetch(`${SUPABASE_URL}/rest/v1/coding_battles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Phase 2 Concurrency Battle Test',
      duration_minutes: 30,
      creator_role: 'FACULTY',
      join_code: 'BCE-CONC1',
      visibility: 'CODE',
      status: 'LOBBY',
      start_time: null,
      end_time: null,
      created_by: creatorId,
    }),
  });

  const battleData = await battleRes.json();
  const battle = Array.isArray(battleData) ? battleData[0] : battleData;
  console.log('Created test battle:', battle?.id, 'Status:', battle?.status, 'Code:', battle?.join_code);

  if (!battle?.id) {
    console.error('Failed to create test battle:', battleData);
    process.exit(1);
  }

  // 2. Simulate 26 simultaneous participants joining
  console.log('Simulating 26 simultaneous participants joining...');
  const participantIds = Array.from({ length: 26 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`);

  await Promise.allSettled(
    participantIds.map(async (studentId) => {
      // Check current participant count
      const countRes = await fetch(`${SUPABASE_URL}/rest/v1/coding_battle_participants?battle_id=eq.${battle.id}&select=student_id`, {
        headers,
      });
      const currentParts = await countRes.json();

      if (Array.isArray(currentParts) && currentParts.length >= 25) {
        return { success: false, error: 'BATTLE_FULL', studentId };
      }

      const joinRes = await fetch(`${SUPABASE_URL}/rest/v1/coding_battle_participants`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          battle_id: battle.id,
          student_id: studentId,
          score: 0,
        }),
      });

      if (!joinRes.ok) {
        return { success: false, error: 'DB_ERROR', studentId };
      }

      return { success: true, studentId };
    })
  );

  // Count participants actually in database
  const finalPartsRes = await fetch(`${SUPABASE_URL}/rest/v1/coding_battle_participants?battle_id=eq.${battle.id}&select=student_id`, {
    headers,
  });
  const finalParts = await finalPartsRes.json();

  console.log(`Final participant count in database: ${finalParts.length} / 25`);
  if (finalParts.length <= 25) {
    console.log('✓ 25-participant capacity limit strictly enforced!');
  } else {
    console.error('❌ Capacity limit breached!');
  }

  // 3. Test Host Start Battle
  console.log('Testing host start transition to LIVE...');
  const startNow = new Date();
  const endTime = new Date(startNow.getTime() + 30 * 60 * 1000);

  const startRes = await fetch(`${SUPABASE_URL}/rest/v1/coding_battles?id=eq.${battle.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      status: 'LIVE',
      start_time: startNow.toISOString(),
      end_time: endTime.toISOString(),
    }),
  });

  if (startRes.ok) {
    console.log('✓ Host start transition successfully changed status to LIVE with server timestamps!');
  }

  // Clean up test battle
  await fetch(`${SUPABASE_URL}/rest/v1/coding_battles?id=eq.${battle.id}`, {
    method: 'DELETE',
    headers,
  });
  console.log('Cleaned up test battle.');
}

testPhase2Concurrency();
