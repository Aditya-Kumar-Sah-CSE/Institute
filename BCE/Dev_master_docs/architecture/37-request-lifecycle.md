# 37. Client & HTTP Request Lifecycle

STATUS: ✅ IMPLEMENTED

## Request Processing Chain
1. HTTP Request received by Next.js Server.
2. `src/middleware.ts` verifies auth session and tenant hostname.
3. Target API Route or Server Action invoked with validated session.
4. Database query executed under Supabase RLS context.
5. Standardized JSON response returned to client.
