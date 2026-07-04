# Supabase Authentication & Workflows Guide

This guide explains common authentication issues encountered during development and outlines the different user role workflows in the SkillArena platform.

## 1. Why "Email not confirmed" error happens?

Supabase has a built-in security feature called **"Confirm email"** which is turned **ON** by default. 
Whenever a new user (Student, Instructor, or Admin) signs up, Supabase sends a verification link to their email address. **Until the user clicks that link, Supabase will block them from logging in.**

Because you are likely using fake emails (e.g., `test1@example.com`) for testing, you cannot receive or click those verification links. When you try to log in with that fake email, Supabase rejects the login with the error: *"Email not confirmed"*.

## 2. Why "Email rate limit exceeded" error happens?

Because the "Confirm email" setting is active, Supabase attempts to send an email on every signup. If you test multiple signups rapidly from the same IP address, or repeatedly try to sign up the same email, Supabase's spam filters temporarily block further requests to protect the system. This triggers the *"Email rate limit exceeded"* error.

## 3. How to fix these issues for local testing?

To test the application smoothly without needing real emails, you must turn off the email confirmation requirement in your Supabase project.

### Steps to disable Email Confirmation:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. In the left sidebar, click on **Authentication** (the 🔒 icon).
4. Go to **Providers** (or Auth Providers) and click on **Email**.
5. Find the **"Confirm email"** toggle switch and turn it **OFF**.
6. Click **Save** at the bottom.

*Once disabled, any new signup will immediately be treated as verified, allowing you to log in instantly without checking any emails.*

---

## 4. Workflows by Role

### Student Workflow
1. **Sign Up:** Student goes to `/signup` and creates an account.
2. **Auto-Redirect:** They are successfully registered and redirected to the login page.
3. **Login:** Student logs in at `/login` and is taken straight to their `/dashboard` where they can browse and enroll in courses.
*(No admin approval required).*

### Instructor Workflow
1. **Apply:** A user goes to `/apply-instructor` and fills out their Name, Email, Password, Bio, and Experience.
2. **Pending State:** Their account is created, but their role is set to `instructor` and status is set to `pending`. If they try to log in, they are blocked and shown an *"Awaiting Admin Approval"* screen.
3. **Super Admin Approval:** The Super Admin (`adityakumarsah8709@gmail.com`) logs in, navigates to the Admin Panel -> **Instructors**, reviews the application, and clicks **Approve**.
4. **Access Granted:** The next time the instructor logs in, they are redirected to their exclusive Instructor Dashboard (`/instructor`) to manage their curriculum.

### Regular Admin Workflow
1. **Apply:** A user goes to `/apply-admin` to request administrative access.
2. **Pending State:** Similar to instructors, their account is set to `admin` with a `pending` status. They cannot access the dashboard yet.
3. **Super Admin Approval:** The Super Admin logs in, goes to Admin Panel -> **Admins**, and approves the request.
4. **Access Granted:** The newly approved Regular Admin logs in and can access the `/admin` dashboard to manage courses, students, and submissions. **However, they cannot see or manage other Admins or Instructors.**

### Super Admin Workflow
- The Super Admin is hardcoded by email (`adityakumarsah8709@gmail.com`). 
- They have complete access to the entire platform, including the exclusive ability to approve or reject Instructor and Admin applications.
