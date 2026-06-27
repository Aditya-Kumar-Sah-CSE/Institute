import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as any;

  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard';
  const redirectTo = searchParams.get('redirect_to') ?? next;

  // Prevent open redirect: only allow relative paths starting with /
  const safeRedirect = (redirectTo.startsWith('/') && !redirectTo.startsWith('//'))
    ? redirectTo
    : '/dashboard';

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${safeRedirect}`);
    }
  } else if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeRedirect}`);
    }
  }

  // return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/login?message=Could not authenticate user. Please try requesting a new link.`);
}
