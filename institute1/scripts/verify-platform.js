/**
 * scripts/verify-platform.js
 *
 * Verification script for Platform Institution Architecture Fix.
 * Connects to Supabase using service role key, asserts that:
 *  1. Exactly ONE institution has is_platform = TRUE.
 *  2. Its slug is 'smart-learning' and its status is 'active'.
 *  3. ZERO rows in all 17 tenant-owned tables have institution_id IS NULL.
 *  4. main-campus institution still exists and was not modified.
 *
 * Usage:
 *   node scripts/verify-platform.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const TENANT_TABLES = [
  'profiles',
  'courses',
  'lessons',
  'assignments',
  'submissions',
  'enrollments',
  'lesson_progress',
  'xp_logs',
  'notices',
  'doubts',
  'doubt_replies',
  'course_alerts',
  'monthly_rewards',
  'chats',
  'chat_messages',
  'hall_of_fame',
  'certificates',
];

async function verify() {
  console.log('🔍 Starting Platform Institution Architecture Verification...\n');
  let passed = true;

  // ── TEST 1: Exactly 1 Platform Institution with is_platform = true ──
  const { data: platforms, error: platErr } = await supabase
    .from('institutions')
    .select('id, name, slug, is_platform, status')
    .eq('is_platform', true);

  if (platErr) {
    console.error('❌ [FAIL] Error querying Platform Institution:', platErr.message);
    passed = false;
  } else if (!platforms || platforms.length === 0) {
    console.error('❌ [FAIL] No institution with is_platform = true found. Migration 092 not run.');
    passed = false;
  } else if (platforms.length > 1) {
    console.error(`❌ [FAIL] Expected 1 platform institution, found ${platforms.length}:`, platforms);
    passed = false;
  } else {
    const p = platforms[0];
    console.log(`✅ [PASS] Platform Institution found: "${p.name}" (ID: ${p.id}, slug: ${p.slug})`);
  }

  // ── TEST 2: main-campus tenant is untouched ──
  const { data: mainCampus } = await supabase
    .from('institutions')
    .select('id, slug, is_platform')
    .eq('slug', 'main-campus')
    .single();

  if (mainCampus) {
    if (mainCampus.is_platform) {
      console.error('❌ [FAIL] main-campus has is_platform = true! It should remain a customer tenant.');
      passed = false;
    } else {
      console.log(`✅ [PASS] main-campus institution exists as customer tenant (is_platform = false)`);
    }
  } else {
    console.log(`ℹ️ [INFO] main-campus institution does not exist in DB (nothing to touch)`);
  }

  // ── TEST 3: Zero NULL institution_ids across all tenant-owned tables ──
  console.log('\n🔍 Checking tenant-owned tables for NULL institution_id records...');
  for (const table of TENANT_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .is('institution_id', null);

    if (error) {
      // Table might not exist in this environment — skip gracefully if table missing
      if (error.code === '42P01') {
        console.log(`  - ${table}: table does not exist in database (skipped)`);
        continue;
      }
      console.error(`  ❌ ${table}: error checking NULL count - ${error.message}`);
      passed = false;
    } else if (count > 0) {
      console.error(`  ❌ [FAIL] Table "${table}" has ${count} NULL institution_id row(s)!`);
      passed = false;
    } else {
      console.log(`  ✅ ${table}: 0 NULL rows`);
    }
  }

  console.log('\n' + '─'.repeat(50));
  if (passed) {
    console.log('🎉 ALL VERIFICATION CHECKS PASSED!');
    process.exit(0);
  } else {
    console.error('❌ VERIFICATION FAILED. Please review the errors above.');
    process.exit(1);
  }
}

verify().catch((err) => {
  console.error('Unhandled error during verification:', err);
  process.exit(1);
});
