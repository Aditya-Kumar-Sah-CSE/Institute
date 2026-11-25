const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BCE_ROOT = path.join('d:', 'smart learn', 'BCE');
const env = {};
for (const line of fs.readFileSync(path.join(BCE_ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

const sql = postgres(env.DATABASE_URL, { max: 1 });

(async () => {
  const [course] = await sql`
    SELECT id, title, difficulty, lesson_count, total_xp, is_published, enrollment_restriction, tags
    FROM public.courses
    WHERE title = 'JavaScript Mastery Workbook (Zero to Interview-Ready)' AND is_deleted = false
  `;
  assert(course, 'Course not found in DB');

  const lessons = await sql`
    SELECT id, title, week_number, sort_order, xp_reward, notes, interactive_steps, created_at
    FROM public.lessons
    WHERE course_id = ${course.id}
    ORDER BY sort_order ASC
  `;
  assert.strictEqual(lessons.length, 39, 'Expected 39 lessons');

  let totalInteractiveSteps = 0;
  for (const l of lessons) {
    assert(Array.isArray(l.interactive_steps) && l.interactive_steps.length >= 3, `Missing interactive_steps for ${l.title}`);
    totalInteractiveSteps += l.interactive_steps.length;
  }

  const distinctDates = new Set(lessons.map(l => new Date(l.created_at).toISOString().slice(0, 10)));
  const distinctWeeks = new Set(lessons.map(l => l.week_number));
  assert.strictEqual(distinctDates.size, 12, 'Expected 12 distinct dates (Weeks 1-12)');
  assert.strictEqual(distinctWeeks.size, 12, 'Expected 12 week_numbers');

  const allNotes = lessons.map(l => l.notes).join('\n');
  for (let q = 1; q <= 593; q++) {
    assert(allNotes.includes(`Q${q}.`), `Missing Interview Question Q${q}`);
  }
  for (let t = 1; t <= 16; t++) {
    for (let s = 1; s <= 6; s++) {
      assert(allNotes.includes(`${t}.${s} —`), `Missing Part A task ${t}.${s}`);
    }
  }
  for (let p = 1; p <= 12; p++) {
    assert(allNotes.includes(`Project ${p}:`), `Missing Project ${p}`);
  }
  assert(!/<script\b/i.test(allNotes), 'Raw <script> tag leaked into HTML notes');

  const assigns = await sql`
    SELECT a.id, a.title, a.type, a.xp_reward, a.requires_github, a.requires_deploy
    FROM public.assignments a
    JOIN public.lessons l ON l.id = a.lesson_id
    WHERE l.course_id = ${course.id}
  `;
  assert.strictEqual(assigns.length, 17, 'Expected 17 assignments');

  const mcqStats = await sql`
    SELECT category, count(*)::int as cnt, min(display_order)::int as mn, max(display_order)::int as mx
    FROM public.course_mcqs
    WHERE course_id = ${course.id} AND is_active = true
    GROUP BY category
    ORDER BY mn ASC
  `;
  const totalMcqs = mcqStats.reduce((s, r) => s + r.cnt, 0);
  assert.strictEqual(totalMcqs, 150, 'Expected 150 active MCQs');

  const [noticesCount] = await sql`SELECT count(*)::int as c FROM public.course_notices WHERE course_id = ${course.id}`;
  const [pollsCount] = await sql`SELECT count(*)::int as c FROM public.course_polls WHERE course_id = ${course.id}`;
  const [instCount] = await sql`SELECT count(*)::int as c FROM public.course_instructors WHERE course_id = ${course.id}`;

  assert.strictEqual(noticesCount.c, 2);
  assert.strictEqual(pollsCount.c, 1);
  assert.strictEqual(instCount.c, 1);

  console.log('VERIFICATION PASSED:', JSON.stringify({
    courseId: course.id,
    title: course.title,
    lessonCount: course.lesson_count,
    totalInteractiveSteps,
    totalXp: course.total_xp,
    distinctWeeks: distinctWeeks.size,
    distinctDates: distinctDates.size,
    assignments: assigns.length,
    mcqSections: mcqStats,
    totalMcqs,
    interviewQuestionsVerified: 593,
    partATasksVerified: 96,
    projectsVerified: 12,
    notices: noticesCount.c,
    polls: pollsCount.c,
    instructors: instCount.c
  }, null, 2));

  await sql.end();
})();

