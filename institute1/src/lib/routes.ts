/**
 * Centralized tenant-aware route helpers.
 * Every internal navigation MUST use these helpers to ensure
 * the tenant slug is always preserved in the URL.
 */

export const routes = {
  // ─── Landing ───
  tenantHome: (t: string) => `/${t}`,

  // ─── Auth ───
  login: (t: string) => `/${t}/login`,
  signup: (t: string) => `/${t}/signup`,
  forgotPassword: (t: string) => `/${t}/forgot-password`,
  resetPassword: (t: string) => `/${t}/reset-password`,

  // ─── Student / Dashboard ───
  dashboard: (t: string) => `/${t}/dashboard`,
  courses: (t: string) => `/${t}/courses`,
  courseDetail: (t: string, courseId: string) => `/${t}/courses/${courseId}`,
  lessonDetail: (t: string, courseId: string, lessonId: string) => `/${t}/courses/${courseId}/${lessonId}`,
  doubts: (t: string) => `/${t}/doubts`,
  doubtDetail: (t: string, id: string) => `/${t}/doubts/${id}`,
  notices: (t: string) => `/${t}/notices`,
  leaderboard: (t: string) => `/${t}/leaderboard`,
  profile: (t: string) => `/${t}/profile`,
  chat: (t: string) => `/${t}/dashboard/chat`,
  sqlEditor: (t: string) => `/${t}/dashboard/sql-editor`,
  feedbacks: (t: string) => `/${t}/feedbacks`,
  shareDoubt: (t: string) => `/${t}/share-doubt`,
  userProfile: (t: string, userId: string) => `/${t}/users/${userId}`,
  batch: (t: string, batchId: string) => `/${t}/batch/${batchId}/doubts`,
  certificates: (t: string, id: string) => `/${t}/certificates/${id}`,

  // ─── Admin ───
  admin: (t: string) => `/${t}/admin`,
  adminCourses: (t: string) => `/${t}/admin/courses`,
  adminCourseBuilder: (t: string, courseId: string) => `/${t}/admin/courses/${courseId}/builder`,
  adminEnrollments: (t: string) => `/${t}/admin/enrollments`,
  adminStudents: (t: string) => `/${t}/admin/students`,
  adminSubmissions: (t: string) => `/${t}/admin/submissions`,
  adminNotices: (t: string) => `/${t}/admin/notices`,
  adminFeedback: (t: string) => `/${t}/admin/feedback`,
  adminInstitutions: (t: string) => `/${t}/admin/institutions`,
  adminDomainSettings: (t: string) => `/${t}/admin/domain-settings`,
  adminDomainDetail: (t: string, instId: string) => `/${t}/admin/domain-settings/${instId}`,
  adminInstructorRequests: (t: string) => `/${t}/admin/instructor-requests`,
  adminPayment: (t: string) => `/${t}/admin/payment-model`,

  // ─── Instructor ───
  instructor: (t: string) => `/${t}/instructor`,
  instructorCourses: (t: string) => `/${t}/instructor/courses`,
  instructorCourseBuilder: (t: string, courseId: string) => `/${t}/instructor/courses/${courseId}/builder`,
  instructorEnrollments: (t: string) => `/${t}/instructor/enrollments`,
  instructorSubmissions: (t: string) => `/${t}/instructor/submissions`,
  instructorNotices: (t: string) => `/${t}/instructor/notices`,
  instructorFeedback: (t: string) => `/${t}/instructor/feedback`,
  instructorStudents: (t: string) => `/${t}/instructor/students`,
  instructorShareUpload: (t: string) => `/${t}/instructor/share-upload`,

  // ─── Public (no tenant) ───
  applyInstitution: () => `/apply-institution`,
  applyInstructor: () => `/apply-instructor`,
  institutionNotFound: () => `/institution-not-found`,
};

/** Get role-based home route for a given tenant */
export function getRoleHome(tenantSlug: string, role: string, status?: string): string {
  if (role === 'admin' || role === 'super_admin') return routes.admin(tenantSlug);
  if (role === 'instructor' && status === 'active') return routes.instructor(tenantSlug);
  return routes.dashboard(tenantSlug);
}
