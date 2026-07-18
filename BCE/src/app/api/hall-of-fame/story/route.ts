import { NextResponse } from 'next/server';
import { createStory } from '@/features/hall-of-fame/actions/stories';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const referenceId = formData.get('referenceId') as string;
    const category = formData.get('category') as any;
    const caption = formData.get('caption') as string;
    const image = formData.get('image') as File | null;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const fileName = `${user.id}/${Date.now()}.webp`;
    
    // Secure server-side upload bypassing payload limits since it traverses FormData
    const { error: uploadError } = await supabase.storage
      .from('stories_bucket')
      .upload(fileName, image, { contentType: 'image/webp' });

    if (uploadError) throw new Error(`Upload Error: ${uploadError.message}`);

    const { data: publicUrlData } = supabase.storage.from('stories_bucket').getPublicUrl(fileName);
    
    await createStory(referenceId, category, caption, publicUrlData.publicUrl);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Story API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
