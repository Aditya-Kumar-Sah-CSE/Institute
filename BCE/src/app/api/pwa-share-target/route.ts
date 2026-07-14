import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
// 'after' allows running async processes safely after sending a response on Vercel without blocking.
import { after } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get('content-length');
    
    // Safety check BEFORE reading formData which will crash if it's too large.
    // Set to 15MB to fulfill maximum size requirements gracefully.
    if (contentLength && parseInt(contentLength, 10) > 15 * 1024 * 1024) {
      console.warn('Share target rejected because payload is too large (> 15MB).');
      // We don't have the user yet so we just redirect to the home/dashboard with an error message
      // and they'll naturally route appropriately if they log in.
      const errorUrl = new URL('/dashboard?error=FileTooLarge', req.url);
      return NextResponse.redirect(errorUrl, { status: 303 });
    }

    const formData = await req.formData();
    
    // Web Share Target fields typically include: title, text, url, file
    const title = formData.get('title') as string || '';
    const text = formData.get('text') as string || '';
    const url = formData.get('url') as string || '';
    const files = formData.getAll('file') as File[];
    
    if (files.length === 0 && !url && !text) {
      // If no file and no text/url, redirect to root
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

    const attachments: { url: string; name: string }[] = [];

    if (files.length > 0) {
      files.forEach((file, index) => {
        if (file.size > 0 && file.name) {
          const fileExt = file.name.split('.').pop() || 'pdf';
          const filePath = `temp/${user.id}/${Date.now()}_${index}.${fileExt}`;

          // Compute public URL instantly without waiting for upload
          const publicUrl = supabase.storage
            .from('lesson_notes')
            .getPublicUrl(filePath).data.publicUrl;
            
          attachments.push({
            url: publicUrl,
            name: file.name || title || `Shared File ${index + 1}`
          });
          
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
        }
      });
    }

    // If no valid files were processed, but we have text/url
    if (attachments.length === 0 && (url || text)) {
      attachments.push({
        url: url || text || '',
        name: title || 'Shared Link'
      });
    }
      
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let redirectUrl: URL;
    const isStudent = profile?.role === 'user' || profile?.role === 'student';

    if (isStudent) {
      redirectUrl = new URL('/share-doubt', req.url);
    } else {
      // Redirect to the Share Upload UI for instructors
      redirectUrl = new URL('/instructor/share-upload', req.url);
    }
    
    redirectUrl.searchParams.set('files', encodeURIComponent(JSON.stringify(attachments)));
    
    return NextResponse.redirect(redirectUrl, { status: 303 });

  } catch (err) {
    console.error('Share Target Error:', err);
    return NextResponse.redirect(new URL('/instructor?error=ShareFailed', req.url), { status: 303 });
  }
}
