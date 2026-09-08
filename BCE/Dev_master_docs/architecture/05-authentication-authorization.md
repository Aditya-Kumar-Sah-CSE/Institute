# 05. Authentication & Authorization Architecture

STATUS: ✅ IMPLEMENTED

## Auth Strategy
Smart Learn uses Supabase Authentication with HTTP-Only SSR Cookies managed via `@supabase/ssr`.

## Role Hierarchy & Permissions Matrix
Roles are defined in `src/lib/auth/agent-permissions.ts` and enforced in database RLS policies.

| Role | Access Level | Description |
| ---- | ------------ | ----------- |
| `guest` | Public | View landing page, course previews, public sheets, login/signup. |
| `student` | User | Enroll in courses, submit code, participate in battles, use AI BYOK Agent. |
| `instructor` | Creator | Build courses, view student submissions, manage batch doubts & polls. |
| `admin` | Manager | Manage institution enrollment, users, notices, NPTEL sync. |
| `super_admin` | Platform Admin | Multi-tenant CMS, audit logs, feature flags, global overview. |
| `developer` | System | Schema debugging and system configuration. |
