import { getTenantDb } from '@/lib/db/tenant';
import { courses, enrollments } from '@/lib/db/schema/tenant-schema';
import { eq, and } from 'drizzle-orm';

/**
 * Fetch all published courses dynamically from the current tenant's database schema.
 * Supports Drizzle ORM routing based on tenant request headers.
 */
export async function getPublishedCourses() {
  const db = await getTenantDb();
  
  // Select all published and non-deleted courses
  const courseList = await db.select()
    .from(courses)
    .where(and(eq(courses.is_published, true), eq(courses.is_deleted, false)));
    
  return courseList;
}

/**
 * Check if the user is enrolled in a specific course
 */
export async function checkUserEnrollment(userId: string, courseId: string) {
  const db = await getTenantDb();
  
  const enrollment = await db.select()
    .from(enrollments)
    .where(and(eq(enrollments.user_id, userId), eq(enrollments.course_id, courseId)))
    .limit(1);
    
  return enrollment.length > 0;
}

/**
 * Enroll a user into a course
 */
export async function enrollUser(userId: string, courseId: string) {
  const db = await getTenantDb();
  
  // Verify course exists and doesn't require approval
  const course = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course[0] || course[0].enrollment_restriction === 'approval') {
    throw new Error('Course requires approval or does not exist');
  }

  // Check existing
  const existing = await checkUserEnrollment(userId, courseId);
  if (existing) {
    throw new Error('Already enrolled');
  }

  await db.insert(enrollments).values({
    user_id: userId,
    course_id: courseId,
  });

  return { success: true };
}
