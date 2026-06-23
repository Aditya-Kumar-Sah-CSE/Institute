# Platform Customization Guide

This document outlines all the hardcoded values that need to be changed to convert the platform for any institute-specific educational platform.

## 1. Platform Name & Text Replacements

These are ALL the places where "SkillArena" or "Techglaz Labs" is hardcoded and needs to be replaced with the specific institute's details.

### [MODIFY] `src/app/layout.tsx`
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 13 | `title: 'SkillArena \| Gamified Full Stack Learning Platform'` | `title: '[Institute Name] \| Learning Platform'` |
| 24 | `title: 'SkillArena'` | `title: '[Institute Name]'` |

### [MODIFY] `src/app/page.tsx` (Landing Page)
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 37 | `<span className="logo-text">SkillArena</span>` | `<span className="logo-text">[Institute Name]</span>` |
| 123 | `<span className="logo-text">SkillArena</span>` | `<span className="logo-text">[Institute Name]</span>` |
| 125 | `A Techglaz Labs Pvt. Ltd. Initiative.` | `[Institute's tagline]` |
| 141 | `© {year} Techglaz Labs Pvt. Ltd.` | `© {year} [Institute Name]` |

### [MODIFY] `src/components/layout/Sidebar.tsx`
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 39 | `<span className="sidebar-logo-text">SkillArena</span>` | `<span className="sidebar-logo-text">[Institute Name]</span>` |

### [MODIFY] `src/features/auth/components/SignupForm.tsx`
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 77 | `<h1 className="auth-title">Join SkillArena</h1>` | `<h1 className="auth-title">Join [Institute Name]</h1>` |

### [MODIFY] `src/app/(auth)/signup/page.tsx`
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 5 | `title: 'Sign Up \| SkillArena'` | `title: 'Sign Up \| [Institute Name]'` |
| 6 | `description: 'Join SkillArena and start...'` | `description: 'Join [Institute Name]...'` |

### [MODIFY] `src/app/(auth)/login/page.tsx`
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 6 | `title: 'Login \| SkillArena'` | `title: 'Login \| [Institute Name]'` |
| 7 | `description: 'Sign in to SkillArena...'` | `description: 'Sign in to [Institute Name]...'` |

### [MODIFY] `src/components/pwa/PWAInstallPrompt.tsx`
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 105 | `<h3>Install SkillArena</h3>` | `<h3>Install [Institute Name]</h3>` |

### [MODIFY] `src/app/api/github/validate/route.ts`
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 30 | `'User-Agent': 'SkillArena-App'` | `'User-Agent': '[InstituteName]-App'` |

### [MODIFY] `src/app/(admin)/admin/notices/page.tsx`
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 8 | `title: 'Manage Notices \| Admin \| SkillArena'` | `title: 'Manage Notices \| Admin \| [Institute Name]'` |

### [MODIFY] `src/app/(instructor)/instructor/notices/page.tsx`
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 8 | `title: 'Manage Notices \| Instructor \| SkillArena'` | `title: 'Manage Notices \| Instructor \| [Institute Name]'` |

### [MODIFY] `src/app/(dashboard)/notices/page.tsx`
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 7 | `title: 'Notices \| SkillArena'` | `title: 'Notices \| [Institute Name]'` |

---

## 2. Super Admin Email

### [MODIFY] `src/lib/constants.ts`
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 9 | `export const SUPER_ADMIN_EMAIL = 'adityakumarsah8709@gmail.com'` | `export const SUPER_ADMIN_EMAIL = '[institute_admin_email]'` |

---

## 3. Logo & Icons

### [MODIFY] `public/` directory
Replace these files with the respective institute's logo and assets:
- `public/icon-192x192.png` — App icon (192x192)
- `public/favicon.ico` — Browser tab icon
- `public/manifest.json` — Update `name` and `short_name` fields to match the institute.

---

## 4. Database Seed Data

### [MODIFY] `supabase/migrations/001_create_tables.sql`
| Line | Current Text | Change To |
|:-----|:-------------|:----------|
| 47 | `company_name TEXT NOT NULL DEFAULT 'Techglaz Labs Pvt. Ltd.'` | `company_name TEXT NOT NULL DEFAULT '[Institute Name]'` |
| 170 | `INSERT INTO company_settings (company_name) VALUES ('Techglaz Labs Pvt. Ltd.')` | `INSERT INTO company_settings (company_name) VALUES ('[Institute Name]')` |
