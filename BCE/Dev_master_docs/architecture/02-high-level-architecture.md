# 02. High-Level Architecture

STATUS: ✅ IMPLEMENTED

## Overview
Smart Learn follows a modern Next.js App Router architecture leveraging Server Components, Client Contexts, Server Actions, API Routes, and Supabase BaaS.

```mermaid
flowchart TD
    subgraph Client Layer
        Browser[Browser Client]
        Drawer[SmartAgentDrawer.tsx]
        DOMReader[live-dom-reader.ts]
        SQLEngine[In-Browser SQL Engine]
    end

    subgraph Middleware & Auth
        MW[src/middleware.ts]
        Tenant[src/lib/tenant/]
        Auth[src/lib/auth.ts]
    end

    subgraph Server Layer
        Actions[Server Actions
src/features/*/actions/]
        APIs[90 API Routes
src/app/api/]
        Agent[src/lib/ai/agent.ts]
    end

    subgraph Storage & DB
        Supa[(Supabase PostgreSQL)]
        RLS[RLS Security Policies]
        Buckets[10 Storage Buckets]
    end

    subgraph External APIs
        Gemini[Google Gemini 3.6 Flash]
        Grok[xAI Grok 2]
        Platforms[Codeforces / LeetCode]
    end

    Browser --> MW
    MW --> Tenant
    MW --> Auth
    Browser --> Actions
    Browser --> APIs
    Drawer --> Agent
    Agent --> Gemini
    Agent --> Grok
    Actions --> Supa
    APIs --> Supa
    Supa --> RLS
    Supa --> Buckets
```
