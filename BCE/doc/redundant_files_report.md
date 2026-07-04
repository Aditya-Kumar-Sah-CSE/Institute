# Codebase Analysis Report

I have run a deep static analysis of your entire codebase using `knip`. Here are the redundant (unused) files, dependencies, and code exports that are currently safe to remove or refactor.

## 📁 Unused Files (19 Files)
These files are not imported or executed by the Next.js application. Most of these appear to be one-off database migration or testing scripts that are cluttering your root directory.

- `add_github_username.js`
- `check_submissions.js`
- `check_user.js`
- `confirm_email.js`
- `create_avatar_bucket.js`
- `create_bucket.js`
- `migrate_admin.js`
- `migrate_instructor.js`
- `migrate.js`
- `public/sw.js` *(Service Worker, seemingly unregistered)*
- `run_migration_004.js`
- `run_migration_005.js`
- `run_migration_006.js`
- `seed_curriculum.js`
- `src/components/ui/Spinner.tsx` *(A UI component never used)*
- `trigger_badges.js`
- `trigger.js`
- `trigger.ts`
- `update_trigger.js`

## 📦 Unused Dependencies
These packages are installed in `package.json` but never imported anywhere in the code.
- **Dependencies:** `pg`
- **DevDependencies:** `postgres`

## 🚀 Unused Code Exports
These functions, types, and constants are exported from their files but never imported or used by any other file.

### Functions & Constants
- `signOut` (in `src/features/auth/actions/auth.ts`) - *Note: If this is a Server Action used in a form directly via action attribute, knip might flag it as unused. Ensure it's not before deleting.*
- `getProfile` (in `src/features/auth/actions/auth.ts`)
- `LEVEL_THRESHOLDS` (in `src/lib/constants.ts`)
- `DEFAULT_BADGES` (in `src/lib/constants.ts`)
- `formatNumber`, `getRelativeTime`, `isValidGitHubUrl`, `isValidUrl` (in `src/lib/utils.ts`)

### Types
12 types in `src/types/database.ts` are declared and exported but never used (e.g. `MCQQuestion`, `AdminStats`, `Enrollment`, `LessonProgress`).

---

> [!TIP]
> **Recommendation:**
> You can safely delete the 17 `.js` and `.ts` migration/test scripts from the root directory to clean up the project. You can also uninstall `pg` and `postgres` to reduce your bundle and `node_modules` size.
> 
> **Shall I go ahead and delete the root-level script files and unused dependencies for you?**
