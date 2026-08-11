import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_SIZE = 15 * 1024 * 1024; // 15 MB
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function redirectTo(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url), {
    status: 303,
  });
}

export async function POST(req: NextRequest) {
  try {
    // ---------------------------------------------------------
    // 1. Reject oversized request before parsing multipart data
    // ---------------------------------------------------------
    const contentLength = req.headers.get('content-length');

    if (
      contentLength &&
      Number.parseInt(contentLength, 10) > MAX_REQUEST_SIZE
    ) {
      return redirectTo(
        req,
        '/dashboard?error=FileTooLarge'
      );
    }

    // ---------------------------------------------------------
    // 2. Read Android Share Target payload
    // ---------------------------------------------------------
    const formData = await req.formData();

    const title =
      typeof formData.get('title') === 'string'
        ? String(formData.get('title')).trim()
        : '';

    const text =
      typeof formData.get('text') === 'string'
        ? String(formData.get('text')).trim()
        : '';

    const sharedUrl =
      typeof formData.get('url') === 'string'
        ? String(formData.get('url')).trim()
        : '';

    const files = formData
      .getAll('file')
      .filter(
        (value): value is File =>
          typeof File !== 'undefined' && value instanceof File
      );

    // ---------------------------------------------------------
    // 3. Empty share
    // ---------------------------------------------------------
    if (files.length === 0 && !text && !sharedUrl) {
      return redirectTo(req, '/');
    }

    // ---------------------------------------------------------
    // 4. Validate files
    // ---------------------------------------------------------
    for (const file of files) {
      if (file.size <= 0) {
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        return redirectTo(
          req,
          '/dashboard?error=FileTooLarge'
        );
      }

      if (!ALLOWED_FILE_TYPES.has(file.type)) {
        return redirectTo(
          req,
          '/dashboard?error=UnsupportedFileType'
        );
      }
    }

    // ---------------------------------------------------------
    // 5. Supabase server client
    // ---------------------------------------------------------
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
              cookiesToSet.forEach(
                ({ name, value, options }) => {
                  cookieStore.set(name, value, options);
                }
              );
            } catch {
              // Cookie mutation may not be available
              // in every Next.js execution context.
            }
          },
        },
      }
    );

    // ---------------------------------------------------------
    // 6. Authenticate user
    // ---------------------------------------------------------
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return redirectTo(req, '/login');
    }

    // ---------------------------------------------------------
    // 7. Get role from existing profiles table
    // ---------------------------------------------------------
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        '[PWA SHARE] Profile lookup failed:',
        profileError
      );

      return redirectTo(
        req,
        '/dashboard?error=ProfileNotFound'
      );
    }

    const role = String(profile.role || '')
      .trim()
      .toLowerCase();

    const isInstructor =
      role === 'instructor' ||
      role === 'admin' ||
      role === 'developer';

    // ---------------------------------------------------------
    // 8. Prepare attachments
    // ---------------------------------------------------------
    const attachments: Array<{
      id: string;
      name: string;
      type: string;
      size: number;
      url: string;
    }> = [];

    // ---------------------------------------------------------
    // 9. Upload files
    // ---------------------------------------------------------
    for (const file of files) {
      if (!file.size || !file.name) {
        continue;
      }

      const attachmentId = randomUUID();

      const originalName = file.name;

      const extension =
        originalName.includes('.')
          ? originalName
              .split('.')
              .pop()
              ?.toLowerCase() || 'bin'
          : 'bin';

      // Unique path for every uploaded file.
      const storagePath =
        `temp/${user.id}/${attachmentId}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from('lesson_notes')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

      if (uploadError) {
        console.error(
          '[PWA SHARE] Storage upload failed:',
          uploadError
        );

        return redirectTo(
          req,
          '/dashboard?error=ShareUploadFailed'
        );
      }

      // Generate URL only AFTER successful upload.
      const { data: publicUrlData } =
        supabase.storage
          .from('lesson_notes')
          .getPublicUrl(storagePath);

      attachments.push({
        id: attachmentId,
        name: originalName,
        type: file.type,
        size: file.size,
        url: publicUrlData.publicUrl,
      });
    }

    // ---------------------------------------------------------
    // 10. Text / URL sharing
    // ---------------------------------------------------------
    if (
      attachments.length === 0 &&
      (sharedUrl || text)
    ) {
      attachments.push({
        id: randomUUID(),
        name: title || 'Shared Link',
        type: 'text/plain',
        size: 0,
        url: sharedUrl || text,
      });
    }

    // ---------------------------------------------------------
    // 11. Safety check
    // ---------------------------------------------------------
    if (attachments.length === 0) {
      return redirectTo(
        req,
        '/dashboard?error=InvalidShare'
      );
    }

    // ---------------------------------------------------------
    // 12. Redirect based on authenticated role
    // ---------------------------------------------------------
    const destination = isInstructor
      ? '/instructor/share-upload'
      : '/share-doubt';

    const redirectUrl = new URL(
      destination,
      req.url
    );

    redirectUrl.searchParams.set(
      'files',
      JSON.stringify(attachments)
    );

    return NextResponse.redirect(
      redirectUrl,
      {
        status: 303,
      }
    );
  } catch (error) {
    console.error(
      '[PWA SHARE] Unexpected error:',
      error
    );

    return redirectTo(
      req,
      '/dashboard?error=ShareFailed'
    );
  }
}