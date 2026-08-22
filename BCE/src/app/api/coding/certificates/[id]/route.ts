import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user, isInstructor } = await getCodeArenaActor();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch certificate
    const { data: cert, error: certError } = await supabase
      .from('certificates')
      .select('*, courses(created_by), coding_battles(created_by), coding_sheets(created_by)')
      .eq('id', id)
      .maybeSingle();

    if (certError || !cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    // 2. Check authorization
    // Creator of the course/battle/sheet or admin/instructor
    const isCreator = 
      (cert.courses && cert.courses.created_by === user.id) ||
      (cert.coding_battles && (cert.coding_battles as any).created_by === user.id) ||
      (cert.coding_sheets && (cert.coding_sheets as any).created_by === user.id) ||
      cert.user_id === user.id; // Also allow the student to custom sign if they are authorized

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';

    if (!isInstructor && !isAdmin && !isCreator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Update signature fields
    const body = await request.json();
    const { signatureType, signatureName, signatureDesignation, signatureImageUrl } = body;

    const updates: any = {};
    if (signatureType !== undefined) updates.signature_type = signatureType;
    if (signatureName !== undefined) updates.signature_name = signatureName.trim() || 'Aditya Kumar Sah';
    if (signatureDesignation !== undefined) updates.signature_designation = signatureDesignation.trim() || 'The Developer & The Coder';
    
    // Safely replace signature image URL (which can be a Base64 string or public upload link)
    if (signatureImageUrl !== undefined) {
      updates.signature_image_url = signatureImageUrl || null;
    }

    const { data: updatedCert, error: updateError } = await supabase
      .from('certificates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updatedCert });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
