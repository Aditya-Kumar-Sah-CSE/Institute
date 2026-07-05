import { getTenantDb } from '@/lib/db/tenant';
import { profiles, enrollments, submissions, user_badges, instructor_applications, courses, company_settings } from '@/lib/db/schema/tenant-schema';
import { eq, and, desc, count } from 'drizzle-orm';

// All these actions assume `getTenantDb()` uses the Next.js execution context to infer schema via headers.

export async function getDashboardData(userId: string) {
  const db = await getTenantDb();

  // 1. Get Profile
  const profileRows = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  const profile = profileRows[0] || null;

  // 2. Get Enrollments with Course details
  // Note: For Drizzle relations (without query API configured), inner/left joins are explicit
  const userEnrollments = await db
    .select({
      progress: enrollments.progress,
      status: enrollments.id, // Replace with actual status column if present, assuming implicit active for now
      course_id: enrollments.course_id,
      course: courses,
    })
    .from(enrollments)
    .leftJoin(courses, eq(enrollments.course_id, courses.id))
    .where(eq(enrollments.user_id, userId))
    .orderBy(desc(enrollments.enrolled_at));

  // 3. Quick stats: Completed Assignments
  const completedAssignmentsRes = await db
    .select({ count: count() })
    .from(submissions)
    .where(and(eq(submissions.user_id, userId), eq(submissions.status, 'approved')));
  const completedAssignments = completedAssignmentsRes[0].count;

  // 4. Quick stats: Earned Badges
  const earnedBadgesRes = await db
    .select({ count: count() })
    .from(user_badges)
    .where(eq(user_badges.user_id, userId));
  const earnedBadges = earnedBadgesRes[0].count;

  // 5. Settings
  const settingsRows = await db.select().from(company_settings).limit(1);
  const settings = settingsRows[0] || null;

  // 6. Instructor Application Status
  const appDataRows = await db
    .select({ status: instructor_applications.status })
    .from(instructor_applications)
    .where(eq(instructor_applications.user_id, userId))
    .orderBy(desc(instructor_applications.submitted_at))
    .limit(1);
  const appData = appDataRows[0] || null;

  return {
    profile,
    enrollments: userEnrollments,
    completedAssignments,
    earnedBadges,
    settings,
    appData
  };
}
