# Implementation Plan - Admin Student Details & Enrollment Deletion

This plan introduces an enhancement to the Admin Student Tracking panel:
1. Clicking on a student in the leaderboard opens a details modal.
2. The modal displays student stats and their enrolled courses (with progress and status).
3. The admin can delete a student's individual course enrollment from the modal.
4. The admin can delete the student's entire account from the modal or row actions.

---

## Proposed Changes

### Component: Server Actions

#### [MODIFY] [adminActions.ts](file:///d:/TechPlatform/skillarena/src/features/admin/actions/adminActions.ts)
- Add a new server action `deleteEnrollment(enrollmentId: string)` that deletes an enrollment record from the `enrollments` table.
- Verify that the calling user is an authorized admin before executing.
- Call `revalidatePath('/admin/students')` and `revalidatePath('/', 'layout')` to purge caches.

---

### Component: Admin Dashboard UI

#### [MODIFY] [students/page.tsx](file:///d:/TechPlatform/skillarena/src/app/(admin)/admin/students/page.tsx)
- Modify the database query to select `id`, `progress`, `status`, and `courses(title)` from `enrollments` (instead of just `progress`).
- Extract the student leaderboard table and detail modal into a new Client Component `StudentLeaderboardTable`.
- Render `<StudentLeaderboardTable students={students} isInstructor={isInstructor} />` in place of the static table markup.

#### [NEW] [StudentLeaderboardTable.tsx](file:///d:/TechPlatform/skillarena/src/app/(admin)/admin/students/components/StudentLeaderboardTable.tsx)
- Create a new Client Component that accepts `students` and `isInstructor`.
- Support a search filter (search by name/email) to make searching large cohorts easier.
- Support selecting a student to view details.
- Render the table of students:
  - Clicking on a student's row opens a `<Modal>` with their detailed status.
- In the `<Modal>`:
  - Show student info: Level, XP, joined/active time.
  - List all enrolled courses:
    - Display Course Title, Progress, and Status (Pending / Approved).
    - Provide a "Remove Enrollment" button for each course (for admins only, disabled for instructors) that triggers `deleteEnrollment`.
  - Provide a "Delete Student Account" button in the footer for admins.

---

## Verification Plan

### Manual Verification
1. Go to the Admin Student Tracking page `/admin/students`.
2. Click on a student's row.
3. Verify that the modal opens showing their name, email, level, XP, and list of enrolled courses.
4. Verify that clicking "Remove Enrollment" next to a course prompts for confirmation, deletes the enrollment, closes the modal (or updates it), and re-fetches updated data.
5. Verify that the overall progress of the student updates instantly on the leaderboard.
