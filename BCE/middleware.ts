import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next static assets
     * - _next image optimization
     * - _next data prefetch routes
     * - favicon.ico
     * - public files (images, json, etc.)
     */
    '/((?!_next/static|_next/image|_next/data|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)',
  ],
};
