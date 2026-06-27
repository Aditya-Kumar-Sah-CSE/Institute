# Audit Fix Tasks

## 🔴 Phase 1: Critical Security Fixes
- [/] **CRITICAL-02**: Fix XSS in LessonView.tsx — sanitize HTML
- [ ] **CRITICAL-03**: Fix SSRF in deploy validation — add URL allowlist
- [ ] **CRITICAL-04**: Move super admin email to env variable
- [ ] **HIGH-01**: Add authorization checks to server actions (builder, course, feedback)
- [ ] **HIGH-03**: Fix feedbacks RLS — restrict INSERT
- [ ] **HIGH-05**: Fix open redirect in auth callback
- [ ] **MED-02**: Add rate limiting to signIn / signUp
- [ ] **MED-03**: Remove debug console.log from auth callback

## 🟡 Phase 2: Bugs
- [ ] **BUG-01**: Fix duplicate migration number 020
- [ ] **BUG-HIGH-01**: Fix XP race condition — use atomic update
- [ ] **BUG-MED-01**: Fix createAdminClient unnecessary cookies

## ⚡ Phase 3: Performance
- [ ] **PERF-HIGH-01**: Replace SELECT * with explicit columns (key files)
- [ ] **PERF-MED-02**: Add missing database indexes
- [ ] **PERF-MED-01**: Fix rate limiter memory leak
- [ ] **PERF-MED-04**: Reduce bodySizeLimit
