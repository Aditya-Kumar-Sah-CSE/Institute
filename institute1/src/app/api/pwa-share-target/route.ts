import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
// 'after' allows running async processes safely after sending a response on Vercel without blocking.
import { after } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Web Share Target fields typically include: title, text, url, file
    const title = formData.get('title') as string || '';
    const text = formData.get('text') as string || '';
    const url = formData.get('url') as string || '';
    const file = formData.get('file') as File | null;
    
    if (!file) {
      // If no file, just redirect to the app root or handle text appropriately
      return NextResponse.redirect(new URL('/', req.url), { status: 303 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignored
            }
          },
        },
      }
    );

    // Fetch user and profile concurrently to save time
    const [userRes] = await Promise.all([
      supabase.auth.getUser()
    ]);
    
    const user = userRes.data.user;
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url), { status: 303 });
    }

    const fileExt = file.name.split('.').pop() || 'pdf';
    const filePath = `temp/${user.id}/${Date.now()}.${fileExt}`;

    // Compute public URL instantly without waiting for upload
    const { data: { publicUrl } } = supabase.storage
      .from('lesson_notes')
      .getPublicUrl(filePath);

    // Start background upload using 'after'
    after(async () => {
      console.log('Starting background upload for:', filePath);
      const { error } = await supabase.storage
        .from('lesson_notes')
        .upload(filePath, file, { upsert: true });
        
      if (error) {
        console.error('Background upload error:', error);
      } else {
        console.log('Background upload completed successfully.');
      }
    });
      
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let redirectUrl: URL;
    const isStudent = profile?.role === 'user' || profile?.role === 'student';

    if (isStudent) {
      redirectUrl = new URL('/dashboard/share-doubt', req.url);
    } else {
      // Redirect to the Share Upload UI for instructors
      redirectUrl = new URL('/instructor/share-upload', req.url);
    }
    
    redirectUrl.searchParams.set('fileUrl', publicUrl);
    redirectUrl.searchParams.set('fileName', file.name || title || 'Shared File');
    
    return NextResponse.redirect(redirectUrl, { status: 303 });

  } catch (err) {
    console.error('Share Target Error:', err);
    return NextResponse.redirect(new URL('/instructor?error=ShareFailed', req.url), { status: 303 });
  }
}
