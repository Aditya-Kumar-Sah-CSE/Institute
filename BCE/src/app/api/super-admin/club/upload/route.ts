import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { requireAdmin } from '@/lib/super-admin';
import { createAdminClient } from '@/lib/supabase/server';

const ALLOWED_MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'No image file provided.' }, { status: 400 });
    }

    const ext = ALLOWED_MIME_EXT[file.type.toLowerCase()];
    if (!ext) {
      return NextResponse.json(
        { success: false, error: 'Only PNG, JPG, WEBP, or GIF images are allowed.' },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Image must be smaller than 5 MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = `club/${crypto.randomUUID()}.${ext}`;
    const db = await createAdminClient();

    const { error: uploadError } = await db.storage
      .from('branding')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 400 });
    }

    const { data: pub } = db.storage.from('branding').getPublicUrl(storagePath);
    return NextResponse.json({ success: true, url: pub.publicUrl });
  } catch (err: any) {
    const status = err?.status || (err?.message?.includes('Forbidden') ? 403 : 401);
    return NextResponse.json({ success: false, error: err?.message || 'Unauthorized' }, { status });
  }
}

