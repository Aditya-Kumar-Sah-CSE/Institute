import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function GET() {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data, error } = await supabase
      .from('student_code_snippets')
      .select('*')
      .eq('student_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      if (error.message?.includes('schema cache') || error.code === 'PGRST205') {
        return NextResponse.json({ data: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ data: data || [] });
  } catch {
    return NextResponse.json({ data: [] });
  }
}

export async function POST(request: Request) {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const payload = {
      student_id: user.id,
      title: String(body.title || 'Untitled snippet').slice(0, 120),
      language: body.language,
      source_code: String(body.sourceCode || ''),
      stdin: String(body.stdin || '')
    };

    const query = body.id
      ? supabase.from('student_code_snippets').update(payload).eq('id', body.id).eq('student_id', user.id)
      : supabase.from('student_code_snippets').insert(payload);

    const { data, error } = await query.select().single();
    if (error) {
      if (error.message?.includes('schema cache') || error.code === 'PGRST205') {
        return NextResponse.json({
          data: {
            id: body.id || 'temp-' + Date.now(),
            ...payload,
            updated_at: new Date().toISOString()
          }
        });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ data }, { status: body.id ? 200 : 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Save failed' }, { status: 500 });
  }
}
