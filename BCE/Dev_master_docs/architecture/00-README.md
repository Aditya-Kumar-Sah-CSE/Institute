# 00. Smart Learn Architecture Documentation System

STATUS: ✅ IMPLEMENTED

Welcome to the official, code-grounded **Smart Learn Architecture Documentation System**. This directory contains comprehensive technical specifications, component data flows, database schemas, API inventories, engine specifications, security designs, and system relationship maps for the Smart Learn platform.

## Documentation Navigation Index

| Index | Document Title | Description | Primary Code References |
| ----- | -------------- | ----------- | ----------------------- |
| 00 | [00-README.md](file:///d:/Institute/BCE/docs/architecture/00-README.md) | Index & Documentation System Overview | System Entry Point |
| 01 | [01-system-overview.md](file:///d:/Institute/BCE/docs/architecture/01-system-overview.md) | Smart Learn Platform Overview & Core Objectives | `package.json`, `src/app/page.tsx` |
| 02 | [02-high-level-architecture.md](file:///d:/Institute/BCE/docs/architecture/02-high-level-architecture.md) | High-Level System Architecture & Layer Diagram | Entire Stack Map |
| 03 | [03-folder-structure.md](file:///d:/Institute/BCE/docs/architecture/03-folder-structure.md) | Source Code Repository Tree & Module Directory | `src/`, `supabase/` |
| 04 | [04-application-flow.md](file:///d:/Institute/BCE/docs/architecture/04-application-flow.md) | User Application Flow & Navigation Lifecycle | App Router, Layouts |
| 05 | [05-authentication-authorization.md](file:///d:/Institute/BCE/docs/architecture/05-authentication-authorization.md) | Supabase Auth, RBAC & RLS Security System | `src/lib/auth.ts`, `src/middleware.ts` |
| 06 | [06-database-architecture.md](file:///d:/Institute/BCE/docs/architecture/06-database-architecture.md) | PostgreSQL Database Architecture & Schema | `supabase/migrations/` |
| 07 | [07-api-architecture.md](file:///d:/Institute/BCE/docs/architecture/07-api-architecture.md) | Next.js API Routes & Server Action Architecture | `src/app/api/`, `src/features/*/actions/` |
| 08 | [08-ai-agent-architecture.md](file:///d:/Institute/BCE/docs/architecture/08-ai-agent-architecture.md) | Smart AI Agent Core Architecture | `src/lib/ai/agent.ts`, `agent-controller.ts` |
| 09 | [09-ai-provider-architecture.md](file:///d:/Institute/BCE/docs/architecture/09-ai-provider-architecture.md) | BYOK AI Provider Subsystem (Gemini & Grok) | `src/lib/ai/providers/` |
| 10 | [10-agent-tool-system.md](file:///d:/Institute/BCE/docs/architecture/10-agent-tool-system.md) | Agent Tool Registry & Dynamic Selection | `src/lib/ai/agent-tools.ts` |
| 11 | [11-ui-accessibility-agent.md](file:///d:/Institute/BCE/docs/architecture/11-ui-accessibility-agent.md) | Live DOM & UI Accessibility Reader | `src/lib/ai/live-dom-reader.ts` |
| 12 | [12-voice-stt-tts.md](file:///d:/Institute/BCE/docs/architecture/12-voice-stt-tts.md) | Realtime Voice, VAD, WebSpeech & Gemini Audio | `src/lib/ai/gemini-live-session.ts` |
| 13 | [13-conversation-memory.md](file:///d:/Institute/BCE/docs/architecture/13-conversation-memory.md) | Session Memory & Context Window Management | `src/lib/ai/agent-memory.ts` |
| 14 | [14-latex-engine.md](file:///d:/Institute/BCE/docs/architecture/14-latex-engine.md) | In-Browser LaTeX Parser & Document Engine | `src/lib/latex/` |
| 15 | [15-monaco-editor.md](file:///d:/Institute/BCE/docs/architecture/15-monaco-editor.md) | Monaco Code Editor Integration | `src/lib/monacoInit.ts` |
| 16 | [16-code-editor-engine.md](file:///d:/Institute/BCE/docs/architecture/16-code-editor-engine.md) | Multi-language Code Execution & Judge Engine | `src/features/code-arena/` |
| 17 | [17-sql-engine.md](file:///d:/Institute/BCE/docs/architecture/17-sql-engine.md) | In-Browser SQL Lexer, Parser & Execution Engine | `src/lib/sql/` |
| 18 | [18-recommendation-engine.md](file:///d:/Institute/BCE/docs/architecture/18-recommendation-engine.md) | Personalization & Learning Recommendation Engine | `src/features/analytics/services/` |
| 19 | [19-learning-gap-engine.md](file:///d:/Institute/BCE/docs/architecture/19-learning-gap-engine.md) | Learning Gap & Weakness Detection Engine | `student-intelligence.ts` |
| 20 | [20-student-awareness-analytics.md](file:///d:/Institute/BCE/docs/architecture/20-student-awareness-analytics.md) | Student 360 Awareness & Intelligence | `src/features/analytics/` |
| 21 | [21-chart-analytics-system.md](file:///d:/Institute/BCE/docs/architecture/21-chart-analytics-system.md) | Visual Charting & Performance Telemetry | Analytics Components |
| 22 | [22-leaderboard-system.md](file:///d:/Institute/BCE/docs/architecture/22-leaderboard-system.md) | XP, Ranking & Hall of Fame System | `src/features/leaderboard/` |
| 23 | [23-battle-system.md](file:///d:/Institute/BCE/docs/architecture/23-battle-system.md) | Realtime Multiplayer Code Battle & Anti-Cheat | `src/features/code-arena/` |
| 24 | [24-course-system.md](file:///d:/Institute/BCE/docs/architecture/24-course-system.md) | Course Builder, Lessons & Content Engine | `src/features/courses/` |
| 25 | [25-doubt-system.md](file:///d:/Institute/BCE/docs/architecture/25-doubt-system.md) | Doubts Forum, Likes & Media Uploads | `src/features/doubts/` |
| 26 | [26-poll-system.md](file:///d:/Institute/BCE/docs/architecture/26-poll-system.md) | Course & Platform-Wide Poll System | `src/features/polls/` |
| 27 | [27-assessment-system.md](file:///d:/Institute/BCE/docs/architecture/27-assessment-system.md) | MCQ & Assignment Assessment Engine | Course MCQs, Submissions |
| 28 | [28-progress-tracking.md](file:///d:/Institute/BCE/docs/architecture/28-progress-tracking.md) | Daily Routines, Goals & Stopwatch System | `src/features/goals/` |
| 29 | [29-notification-system.md](file:///d:/Institute/BCE/docs/architecture/29-notification-system.md) | Realtime Notification Dispatcher & Triggers | `src/features/notifications/` |
| 30 | [30-role-based-panels.md](file:///d:/Institute/BCE/docs/architecture/30-role-based-panels.md) | Student, Instructor, Admin & Super Admin Dashboards | `src/features/admin/`, `instructor/` |
| 31 | [31-settings-system.md](file:///d:/Institute/BCE/docs/architecture/31-settings-system.md) | User Profile, Tags, Certificates & BYOK Settings | `src/features/ai-settings/` |
| 32 | [32-storage-system.md](file:///d:/Institute/BCE/docs/architecture/32-storage-system.md) | Supabase Storage Buckets & Attachment Engine | `src/features/storage/` |
| 33 | [33-external-integrations.md](file:///d:/Institute/BCE/docs/architecture/33-external-integrations.md) | Third-Party Coding Platform Integration | `src/lib/coding-platforms/` |
| 34 | [34-environment-configuration.md](file:///d:/Institute/BCE/docs/architecture/34-environment-configuration.md) | Environment Variables & Credentials Config | Configuration Files |
| 35 | [35-security-architecture.md](file:///d:/Institute/BCE/docs/architecture/35-security-architecture.md) | AES-256 BYOK, RLS & Application Security | `src/lib/security/encryption.ts` |
| 36 | [36-data-flow.md](file:///d:/Institute/BCE/docs/architecture/36-data-flow.md) | System Data Flow Architecture | End-to-End Traces |
| 37 | [37-request-lifecycle.md](file:///d:/Institute/BCE/docs/architecture/37-request-lifecycle.md) | Client HTTP & Action Request Lifecycle | Middleware & Handlers |
| 38 | [38-component-dependency-map.md](file:///d:/Institute/BCE/docs/architecture/38-component-dependency-map.md) | Cross-Module Component Dependency Matrix | Component Imports |
| 39 | [39-database-relationship-map.md](file:///d:/Institute/BCE/docs/architecture/39-database-relationship-map.md) | Database Entity-Relationship (ER) Schema Map | Migration Traces |
| 40 | [40-api-inventory.md](file:///d:/Institute/BCE/docs/architecture/40-api-inventory.md) | Complete 90 Route & 39 Action Inventory | `src/app/api/` |
| 41 | [41-engine-inventory.md](file:///d:/Institute/BCE/docs/architecture/41-engine-inventory.md) | Subsystem Engine & Parser Inventory | System Engines |
| 42 | [42-known-issues.md](file:///d:/Institute/BCE/docs/architecture/42-known-issues.md) | Discovered Codebase Edge Cases & Bugs | Code Audit |
| 43 | [43-technical-debt.md](file:///d:/Institute/BCE/docs/architecture/43-technical-debt.md) | Technical Debt & Refactoring Roadmap | Code Audit |
| 44 | [44-performance-architecture.md](file:///d:/Institute/BCE/docs/architecture/44-performance-architecture.md) | Database Caching, Indexing & Bundle Tuning | Optimization Strategy |
| 99 | [99-complete-system-map.md](file:///d:/Institute/BCE/docs/architecture/99-complete-system-map.md) | Master Architecture Map & System Summary | Full Architecture Diagram |
