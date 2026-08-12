import * as fs from 'fs';
import * as path from 'path';
import postgres from 'postgres';

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

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.DIRECT_URL;

async function runRlsTests() {
  console.log('=== CODE ARENA RLS RECURSION & SECURITY REGRESSION SUITE ===');

  if (!dbUrl) {
    console.error('BLOCKED — DATABASE_URL/DIRECT_URL unavailable');
    process.exit(1);
  }

  const sql = postgres(dbUrl, { ssl: 'require' });

  // Generate deterministic UUIDs for test users
  const facultyId = 'f0000000-0000-4000-8000-000000000001';
  const student1Id = 'e0000000-0000-4000-8000-000000000001';
  const student2Id = 'e0000000-0000-4000-8000-000000000002';
  const student26Id = 'e0000000-0000-4000-8000-000000000026';

  const allTestUserIds = [
    facultyId,
    ...Array.from({ length: 26 }, (_, i) => `e0000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`)
  ];

  try {
    // 0. Pre-test cleanup of leftover test records
    await sql`DELETE FROM public.coding_battle_participants WHERE student_id = ANY(${allTestUserIds});`;
    await sql`DELETE FROM public.coding_submissions WHERE student_id = ANY(${allTestUserIds});`;
    await sql`DELETE FROM public.coding_battles WHERE created_by = ${facultyId};`;
    await sql`DELETE FROM public.coding_problem_test_cases WHERE problem_id IN (SELECT id FROM public.coding_problems WHERE created_by = ${facultyId});`;
    await sql`DELETE FROM public.coding_problems WHERE created_by = ${facultyId};`;
    await sql`DELETE FROM public.profiles WHERE id = ANY(${allTestUserIds});`;
    await sql`DELETE FROM auth.users WHERE id = ANY(${allTestUserIds});`;

    // 1. Seed auth.users and profiles
    await sql`
      INSERT INTO auth.users (id, email, instance_id, aud, role, raw_user_meta_data)
      VALUES 
        (${facultyId}, 'test_faculty@bce.edu', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${sql.json({ name: 'Faculty Test User' })}),
        (${student1Id}, 'test_student1@bce.edu', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${sql.json({ name: 'Student 1 Test User' })}),
        (${student2Id}, 'test_student2@bce.edu', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${sql.json({ name: 'Student 2 Test User' })})
      ON CONFLICT (id) DO NOTHING;
    `;

    await sql`
      INSERT INTO public.profiles (id, email, name, role)
      VALUES 
        (${facultyId}, 'test_faculty@bce.edu', 'Faculty Test User', 'instructor'),
        (${student1Id}, 'test_student1@bce.edu', 'Student 1 Test User', 'student'),
        (${student2Id}, 'test_student2@bce.edu', 'Student 2 Test User', 'student')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;
    `;

    // Ensure 26 student profiles exist for capacity testing
    const studentsBatch = Array.from({ length: 26 }, (_, i) => {
      const hex = String(i + 1).padStart(12, '0');
      const id = `e0000000-0000-4000-8000-${hex}`;
      return { id, email: `test_student_${i + 1}@bce.edu`, name: `Student ${i + 1}`, role: 'student' };
    });

    for (const s of studentsBatch) {
      await sql`
        INSERT INTO auth.users (id, email, instance_id, aud, role, raw_user_meta_data)
        VALUES (${s.id}, ${s.email}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${sql.json({ name: s.name })})
        ON CONFLICT (id) DO NOTHING;
      `;
      await sql`
        INSERT INTO public.profiles (id, email, name, role)
        VALUES (${s.id}, ${s.email}, ${s.name}, ${s.role})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;
      `;
    }

    // Create a published test problem and test cases (one public, one hidden)
    const [testProb] = await sql`
      INSERT INTO public.coding_problems (
        title, slug, description, difficulty, created_by, is_published
      ) VALUES (
        'RLS Test Problem', 'rls-test-problem-' || gen_random_uuid(), 'Problem desc', 'EASY', ${facultyId}, true
      )
      RETURNING id;
    `;

    await sql`
      INSERT INTO public.coding_problem_test_cases (problem_id, input, expected_output, is_hidden)
      VALUES 
        (${testProb.id}, '1 2', '3', false),
        (${testProb.id}, '10 20', '30', true);
    `;

    console.log('✓ Setup completed (test users, problem, and testcases initialized).');

    // ----------------------------------------------------
    // TEST 1: Faculty can create battle and update LOBBY battle
    // ----------------------------------------------------
    console.log('\nTesting Scenario 1 & 2: Faculty create & update battle under RLS...');
    let battleId: string = '';
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx.unsafe(`SET LOCAL "request.jwt.claims" = '{"sub": "${facultyId}", "role": "authenticated"}';`);

      const [b] = await tx`
        INSERT INTO public.coding_battles (
          title, duration_minutes, creator_role, join_code, visibility, status, created_by
        ) VALUES (
          'RLS Test Battle', 20, 'FACULTY', 'BCE-RLS01', 'CODE', 'LOBBY', ${facultyId}
        ) RETURNING id, title, status;
      `;
      battleId = b.id;

      // Update LOBBY battle
      await tx`
        UPDATE public.coding_battles 
        SET title = 'RLS Test Battle (Updated)' 
        WHERE id = ${battleId};
      `;
    });
    console.log('✓ Faculty battle creation and pre-start LOBBY edit succeeded!');

    // ----------------------------------------------------
    // TEST 2: Student can read permitted battle (no recursion)
    // ----------------------------------------------------
    console.log('\nTesting Scenario 3: Student battle read access (verifying no RLS recursion)...');
    let visibleBattles: any[] = [];
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx.unsafe(`SET LOCAL "request.jwt.claims" = '{"sub": "${student1Id}", "role": "authenticated"}';`);

      visibleBattles = await tx`
        SELECT id, title, status FROM public.coding_battles WHERE id = ${battleId};
      `;
    });
    if (visibleBattles.length === 1 && visibleBattles[0].id === battleId) {
      console.log('✓ Student read permitted battle successfully without RLS recursion!');
    } else {
      throw new Error('Student could not read permitted battle');
    }

    // ----------------------------------------------------
    // TEST 3: Student can join battle
    // ----------------------------------------------------
    console.log('\nTesting Scenario 4: Student join battle...');
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx.unsafe(`SET LOCAL "request.jwt.claims" = '{"sub": "${student1Id}", "role": "authenticated"}';`);

      await tx`
        INSERT INTO public.coding_battle_participants (battle_id, student_id)
        VALUES (${battleId}, ${student1Id});
      `;
    });
    console.log('✓ Student 1 successfully joined battle!');

    // ----------------------------------------------------
    // TEST 4: Student cannot modify another student\'s participant record
    // ----------------------------------------------------
    console.log('\nTesting Scenario 5: Student cannot tamper with another participant record...');
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx.unsafe(`SET LOCAL "request.jwt.claims" = '{"sub": "${student2Id}", "role": "authenticated"}';`);

      // Student 2 tries to delete Student 1\'s record
      const res = await tx`
        DELETE FROM public.coding_battle_participants 
        WHERE battle_id = ${battleId} AND student_id = ${student1Id};
      `;
      if (res.count > 0) {
        throw new Error('RLS VIOLATION: Student 2 modified Student 1 participant record!');
      }
    });
    console.log('✓ Participant tampering blocked (0 rows modified by unauthorized student)!');

    // ----------------------------------------------------
    // TEST 5: Student cannot access hidden testcases
    // ----------------------------------------------------
    console.log('\nTesting Scenario 6: Hidden testcase protection...');
    let studentCases: any[] = [];
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx.unsafe(`SET LOCAL "request.jwt.claims" = '{"sub": "${student1Id}", "role": "authenticated"}';`);

      studentCases = await tx`
        SELECT id, is_hidden, input FROM public.coding_problem_test_cases 
        WHERE problem_id = ${testProb.id};
      `;
    });
    const containsHidden = studentCases.some((tc) => tc.is_hidden);
    if (containsHidden) {
      throw new Error('RLS VIOLATION: Hidden testcases exposed to student!');
    }
    console.log(`✓ Hidden testcases isolated! (Student saw ${studentCases.length} public testcases, 0 hidden testcases).`);

    // ----------------------------------------------------
    // TEST 6: Student cannot submit for another user
    // ----------------------------------------------------
    console.log('\nTesting Scenario 7: Student submission ownership check...');
    let submissionImpersonationFailed = false;
    try {
      await sql.begin(async (tx) => {
        await tx`SET LOCAL ROLE authenticated`;
        await tx.unsafe(`SET LOCAL "request.jwt.claims" = '{"sub": "${student1Id}", "role": "authenticated"}';`);

        // Student 1 tries to submit as Student 2
        await tx`
          INSERT INTO public.coding_submissions (student_id, problem_id, language, source_code)
          VALUES (${student2Id}, ${testProb.id}, 'cpp17', 'int main(){return 0;}');
        `;
      });
    } catch (err: any) {
      submissionImpersonationFailed = true;
    }
    if (!submissionImpersonationFailed) {
      throw new Error('RLS VIOLATION: Student 1 submitted under Student 2 ID!');
    }
    console.log('✓ Submission impersonation correctly rejected by RLS policy!');

    // ----------------------------------------------------
    // TEST 7: 26th participant is rejected by 25-user limit
    // ----------------------------------------------------
    console.log('\nTesting Scenario 8: 25-participant limit enforcement (26th participant rejection)...');
    // Add participants 2 to 25 (direct DB inserts for test setup)
    for (let i = 2; i <= 25; i++) {
      const hex = String(i).padStart(12, '0');
      const sid = `e0000000-0000-4000-8000-${hex}`;
      await sql`
        INSERT INTO public.coding_battle_participants (battle_id, student_id)
        VALUES (${battleId}, ${sid})
        ON CONFLICT DO NOTHING;
      `;
    }

    let p26Rejected = false;
    try {
      await sql.begin(async (tx) => {
        await tx`SET LOCAL ROLE authenticated`;
        await tx.unsafe(`SET LOCAL "request.jwt.claims" = '{"sub": "${student26Id}", "role": "authenticated"}';`);

        await tx`
          INSERT INTO public.coding_battle_participants (battle_id, student_id)
          VALUES (${battleId}, ${student26Id});
        `;
      });
    } catch (err: any) {
      p26Rejected = true;
    }

    if (!p26Rejected) {
      throw new Error('CAPACITY VIOLATION: 26th participant was allowed into battle!');
    }
    console.log('✓ 26th participant correctly rejected by RLS policy & code_arena_can_join_battle!');

    // ----------------------------------------------------
    // Cleanup Test Data
    // ----------------------------------------------------
    await sql`DELETE FROM public.coding_battle_participants WHERE student_id = ANY(${allTestUserIds});`;
    await sql`DELETE FROM public.coding_submissions WHERE student_id = ANY(${allTestUserIds});`;
    await sql`DELETE FROM public.coding_battles WHERE created_by = ${facultyId};`;
    await sql`DELETE FROM public.coding_problem_test_cases WHERE problem_id IN (SELECT id FROM public.coding_problems WHERE created_by = ${facultyId});`;
    await sql`DELETE FROM public.coding_problems WHERE created_by = ${facultyId};`;
    await sql`DELETE FROM public.profiles WHERE id = ANY(${allTestUserIds});`;
    await sql`DELETE FROM auth.users WHERE id = ANY(${allTestUserIds});`;

    console.log('\n========================================================');
    console.log('ALL RLS RECURSION & SECURITY REGRESSION TESTS PASSED!');
    console.log('========================================================');
  } catch (err: any) {
    console.error('\n❌ RLS Regression Test Failed:', err.message || err);
    if (err.column_name) console.error('Column:', err.column_name);
    if (err.constraint_name) console.error('Constraint:', err.constraint_name);
    if (err.detail) console.error('Detail:', err.detail);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runRlsTests();
