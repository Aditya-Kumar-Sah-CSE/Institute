# 04. Application Flow & Lifecycle

STATUS: ✅ IMPLEMENTED

## Route Lifecycle & Middleware Interception
Every incoming HTTP request passes through `src/middleware.ts` for authentication and role verification before route execution.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant MW as src/middleware.ts
    participant SupaAuth as Supabase Auth Cookie
    participant Router as App Router Page / API
    participant DB as PostgreSQL DB

    User->>MW: HTTP Request (e.g. /settings/ai-agent)
    MW->>SupaAuth: Refresh session token & verify claims
    alt Unauthenticated & Protected Route
        MW-->>User: Redirect to /login
    else Authenticated
        MW->>DB: Check user role & permissions
        MW->>Router: Forward Request with Auth Headers
        Router-->>User: Render Response HTML / JSON
    end
```
