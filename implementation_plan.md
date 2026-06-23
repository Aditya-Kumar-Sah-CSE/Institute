# Add Roll Number Requirement for Students

This plan outlines the steps to add a mandatory "Roll No / Registration No" field for student sign-ups and display this information to instructors when they review course join requests.

## User Review Required

Please review the proposed changes below. The roll number field will be added to the signup form and will be mandatory. Since the current signup form is only used for students (admins/instructors are typically created via other means or manually assigned), it will apply to all registrations through this form. If an instructor or admin registers through this form, they will also need to provide a roll number unless we create a separate form for them later.

## Open Questions

- Is "Roll No / Registration No" text input sufficient, or should we restrict it to numbers only? (I will implement it as a standard text input for now to allow alphanumeric registration numbers like "2023CS01").

## Proposed Changes

### Database Changes

#### [NEW] [020_add_roll_number.sql](file:///d:/Institute/institute1/supabase/migrations/020_add_roll_number.sql)
Create a new migration script to:
1. Add `roll_number` column (TEXT) to the `profiles` table.
2. Update the `handle_new_user()` trigger function to extract `roll_number` from `raw_user_meta_data` and insert it into the `profiles` table during sign-up.

### Authentication & UI

#### [MODIFY] [SignupForm.tsx](file:///d:/Institute/institute1/src/features/auth/components/SignupForm.tsx)
Add a new required `<Input>` component for "Roll No / Registration No" before the email field.

#### [MODIFY] [auth.ts](file:///d:/Institute/institute1/src/features/auth/actions/auth.ts)
Update the `signUp` function to extract the `roll_number` from the `FormData` and pass it inside the `options.data` payload of the Supabase `signUp` call.

### Instructor Dashboard

#### [MODIFY] [enrollments.ts](file:///d:/Institute/institute1/src/features/instructor/actions/enrollments.ts)
Update the `getPendingEnrollments()` query to fetch `profiles!inner(name, email, roll_number)`.

#### [MODIFY] [page.tsx (Instructor Enrollments)](file:///d:/Institute/institute1/src/app/(instructor)/instructor/enrollments/page.tsx)
Update the `PendingEnrollmentReq` interface to include `roll_number` and display it in the UI next to the student's name and email.

## Verification Plan

### Automated Tests
None

### Manual Verification
1. Sign up as a new student and provide a roll number.
2. Verify the new user's profile in the Supabase database contains the roll number.
3. As the new student, request to join a course.
4. Log in as an instructor and view the "Enrollment Requests" page to ensure the roll number is displayed alongside the student's name.
