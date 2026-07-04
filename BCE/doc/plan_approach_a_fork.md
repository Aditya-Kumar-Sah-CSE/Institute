# Approach A: Complete Fork (Separate Repo + Separate Database)

## Overview
We duplicate the entire SkillArena codebase into a new folder and connect it to a brand new Supabase database. The institute gets a fully independent copy of the platform with its own branding, users, and data.

> [!TIP]
> **Best For:** Quick deployment for a single institute. Maximum customization freedom. Complete data isolation.

## Open Questions

> [!IMPORTANT]
> 1. What is the **name of the new institute**? (e.g., "CodeAcademy", "TechVidya")
> 2. What are the **brand colors**? (Primary color, background color, accent color)
> 3. Do you have a **logo image file** ready?
> 4. What **domain/URL** will this be deployed on?

---

## Phase 1: Repository Setup

### Step 1.1 — Copy the codebase
Open PowerShell and run:
```powershell
# Copy the entire project (excluding node_modules and .next build cache)
robocopy "d:\TechPlatform\skillarena" "d:\TechPlatform\institute_name" /E /XD node_modules .next .git
```

### Step 1.2 — Initialize fresh Git
```powershell
cd "d:\TechPlatform\institute_name"
git init
git add .
git commit -m "Initial commit: Fork of SkillArena for [Institute Name]"
```

### Step 1.3 — Connect to new GitHub repo
```powershell
# Create the repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/institute_name.git
git push -u origin main
```

### Step 1.4 — Install dependencies
```powershell
cd "d:\TechPlatform\institute_name"
npm install
```

---

## Phase 2: Database Setup (New Supabase Project)

### Step 2.1 — Create new Supabase Project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in: Name = `institute-name`, Password = (save it!), Region = closest to you
4. Wait for project to be created (~2 minutes)

### Step 2.2 — Run the migration SQL files
Your entire database schema is already saved in `supabase/migrations/`. You need to run these 17 files **in order** in the new project's SQL Editor.

Go to **SQL Editor** in your new Supabase dashboard, and paste + run each file one by one:

| Order | File | What it creates |
|:------|:-----|:----------------|
| 1 | `001_create_tables.sql` | All core tables: `profiles`, `courses`, `lessons`, `assignments`, `submissions`, `badges`, `user_badges`, `xp_log`, `enrollments`, `lesson_progress`, `company_settings` |
| 2 | `002_rls_policies.sql` | Row Level Security policies for all tables + `is_admin()` helper function |
| 3 | `003_seed_data.sql` | Initial seed data |
| 4 | `004_course_badges.sql` | Course completion badge column |
| 5 | `005_course_stats_triggers.sql` | Auto-update triggers for course statistics |
| 6 | `006_instructor_role.sql` | Instructor role tables and policies |
| 7 | `007_enrollment_approval.sql` | Enrollment approval workflow |
| 8 | `008_feedbacks.sql` | Feedback table |
| 9 | `009_feedback_replies.sql` | Feedback reply system |
| 10 | `010_notices.sql` | Notices/announcements system |
| 11 | `011_prune_old_data.sql` | Data cleanup functions |
| 12 | `012_security_triggers.sql` | Security trigger functions |
| 13 | `013_performance_indexes.sql` | Performance indexes for fast queries |
| 14 | `014_instructor_builder_rls.sql` | RLS for instructor course builder |
| 15 | `015_add_week_to_lessons.sql` | Week column for lessons |
| 16 | `016_instructor_course_select.sql` | Instructor course select policies |
| 17 | `017_add_is_deleted_to_courses.sql` | Soft delete for courses |

**Alternative (CLI Method — Faster):**
```powershell
# Install Supabase CLI if not installed
npm install -g supabase

# Link to the NEW project (get project-ref from Supabase dashboard URL)
supabase link --project-ref YOUR_NEW_PROJECT_REF

# Push all 17 migrations at once
supabase db push
```

### Step 2.3 — Update `.env.local`
In the new project folder (`d:\TechPlatform\institute_name\.env.local`), replace:

```env
# Get these from: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_new_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_NEW_PROJECT.supabase.co:5432/postgres
```

### Step 2.4 — Create the first Admin user
1. Run `npm run dev` in the new project
2. Sign up with your email on the new site
3. Go to Supabase Dashboard → Table Editor → `profiles` table
4. Find your user and change `role` from `student` to `admin`

---

## Phase 3: Branding Changes (Exact Files to Modify)

Below is the **complete list** of every file you need to change, with exact line numbers and what to replace.

### 3.1 — Theme Colors
#### [MODIFY] [variables.css](file:///d:/TechPlatform/skillarena/src/styles/variables.css)
Update the CSS custom properties to match the institute's branding:
```css
/* Change these values to the institute's colors */
--neon-cyan: #NEW_PRIMARY_COLOR;      /* Was: #00f0ff */
--neon-magenta: #NEW_ACCENT_COLOR;    /* Was: #ff00e5 */
--bg-primary: #NEW_BG_COLOR;          /* Was: #06060f */
--gradient-xp: linear-gradient(90deg, #NEW_ACCENT, #NEW_PRIMARY);
--gradient-button: linear-gradient(135deg, #NEW_PRIMARY, #NEW_ACCENT);
```

### 3.2 — Platform Name (15 locations)
These are ALL the places where "SkillArena" or "Techglaz Labs" is hardcoded:

#### [MODIFY] [layout.tsx](file:///d:/TechPlatform/skillarena/src/app/layout.tsx)
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 13 | `title: 'SkillArena \| Gamified Full Stack Learning Platform'` | `title: '[Institute Name] \| Learning Platform'` |
| 24 | `title: 'SkillArena'` | `title: '[Institute Name]'` |

#### [MODIFY] [page.tsx](file:///d:/TechPlatform/skillarena/src/app/page.tsx) (Landing Page)
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 37 | `<span className="logo-text">SkillArena</span>` | `<span className="logo-text">[Institute Name]</span>` |
| 123 | `<span className="logo-text">SkillArena</span>` | `<span className="logo-text">[Institute Name]</span>` |
| 125 | `A Techglaz Labs Pvt. Ltd. Initiative.` | `[Institute's tagline]` |
| 141 | `© {year} Techglaz Labs Pvt. Ltd.` | `© {year} [Institute Name]` |

#### [MODIFY] [Sidebar.tsx](file:///d:/TechPlatform/skillarena/src/components/layout/Sidebar.tsx)
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 39 | `<span className="sidebar-logo-text">SkillArena</span>` | `<span className="sidebar-logo-text">[Institute Name]</span>` |

#### [MODIFY] [SignupForm.tsx](file:///d:/TechPlatform/skillarena/src/features/auth/components/SignupForm.tsx)
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 77 | `<h1 className="auth-title">Join SkillArena</h1>` | `<h1 className="auth-title">Join [Institute Name]</h1>` |

#### [MODIFY] [signup/page.tsx](file:///d:/TechPlatform/skillarena/src/app/(auth)/signup/page.tsx)
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 5 | `title: 'Sign Up \| SkillArena'` | `title: 'Sign Up \| [Institute Name]'` |
| 6 | `description: 'Join SkillArena and start...'` | `description: 'Join [Institute Name]...'` |

#### [MODIFY] [login/page.tsx](file:///d:/TechPlatform/skillarena/src/app/(auth)/login/page.tsx)
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 6 | `title: 'Login \| SkillArena'` | `title: 'Login \| [Institute Name]'` |
| 7 | `description: 'Sign in to SkillArena...'` | `description: 'Sign in to [Institute Name]...'` |

#### [MODIFY] [PWAInstallPrompt.tsx](file:///d:/TechPlatform/skillarena/src/components/pwa/PWAInstallPrompt.tsx)
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 105 | `<h3>Install SkillArena</h3>` | `<h3>Install [Institute Name]</h3>` |

#### [MODIFY] [route.ts](file:///d:/TechPlatform/skillarena/src/app/api/github/validate/route.ts)
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 30 | `'User-Agent': 'SkillArena-App'` | `'User-Agent': '[InstituteName]-App'` |

#### [MODIFY] [notices/page.tsx (admin)](file:///d:/TechPlatform/skillarena/src/app/(admin)/admin/notices/page.tsx)
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 8 | `title: 'Manage Notices \| Admin \| SkillArena'` | `title: 'Manage Notices \| Admin \| [Institute Name]'` |

#### [MODIFY] [notices/page.tsx (instructor)](file:///d:/TechPlatform/skillarena/src/app/(instructor)/instructor/notices/page.tsx)
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 8 | `title: 'Manage Notices \| Instructor \| SkillArena'` | `title: 'Manage Notices \| Instructor \| [Institute Name]'` |

#### [MODIFY] [notices/page.tsx (dashboard)](file:///d:/TechPlatform/skillarena/src/app/(dashboard)/notices/page.tsx)
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 7 | `title: 'Notices \| SkillArena'` | `title: 'Notices \| [Institute Name]'` |

### 3.3 — Super Admin Email
#### [MODIFY] [constants.ts](file:///d:/TechPlatform/skillarena/src/lib/constants.ts)
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 9 | `export const SUPER_ADMIN_EMAIL = 'adityakumarsah8709@gmail.com'` | `export const SUPER_ADMIN_EMAIL = '[institute_admin_email]'` |

### 3.4 — Logo & Icons
#### [MODIFY] `public/` directory
Replace these files with the institute's logo:
- `public/icon-192x192.png` — App icon (192x192)
- `public/favicon.ico` — Browser tab icon
- `public/manifest.json` — Update `name` and `short_name` fields

### 3.5 — Database Seed Data
#### [MODIFY] [001_create_tables.sql](file:///d:/TechPlatform/skillarena/supabase/migrations/001_create_tables.sql)
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 47 | `company_name TEXT NOT NULL DEFAULT 'Techglaz Labs Pvt. Ltd.'` | `company_name TEXT NOT NULL DEFAULT '[Institute Name]'` |
| 170 | `INSERT INTO company_settings (company_name) VALUES ('Techglaz Labs Pvt. Ltd.')` | `INSERT INTO company_settings (company_name) VALUES ('[Institute Name]')` |

---

## Phase 4: Verification

### Step 4.1 — Run locally
```powershell
cd "d:\TechPlatform\institute_name"
npm run dev
```

### Step 4.2 — Check these things
- [ ] Landing page shows new institute name and logo
- [ ] Sidebar shows new institute name
- [ ] Sign up page shows "Join [Institute Name]"
- [ ] Browser tab title shows new name
- [ ] New Supabase DB has all tables (check Table Editor)
- [ ] Can sign up a new user → appears in new DB only
- [ ] Original SkillArena DB is untouched (no new user there)
- [ ] Theme colors are updated throughout the UI
- [ ] Admin can login and see the admin panel

---

## Summary: Total Effort

| Category | Files to Change | Estimated Time |
|:---------|:----------------|:---------------|
| Environment Setup | `.env.local` | 5 min |
| Database | 17 SQL files (copy-paste or CLI push) | 15 min |
| Branding Text | ~12 files | 20 min |
| Theme Colors | 1 file (`variables.css`) | 10 min |
| Logo/Icons | 3 files in `public/` | 5 min |
| **Total** | | **~55 min** |
