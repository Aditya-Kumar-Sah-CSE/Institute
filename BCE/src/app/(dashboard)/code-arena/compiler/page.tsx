import { redirect } from 'next/navigation';
import { getCodeArenaActor } from '@/features/code-arena/server';
import PersonalCompiler from '@/features/code-arena/components/PersonalCompiler';
import '@/features/code-arena/components/CodeArena.css';

export default async function CompilerPage() {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) redirect('/login');

  let snippets: any[] = [];
  try {
    const { data, error } = await supabase
      .from('student_code_snippets')
      .select('*')
      .eq('student_id', user.id)
      .order('updated_at', { ascending: false });

    if (data && !error) {
      snippets = data;
    }
  } catch (e) {
    console.warn('Notice fetching student_code_snippets:', e);
  }

  return (
    <div className="code-arena-page">
      <header>
        <h1 className="text-gradient">BCE Code Playground</h1>
        <p className="text-secondary">Your private workspace. Save code snippets and run interactive code cleanly.</p>
      </header>
      <PersonalCompiler initialSnippets={snippets} />
    </div>
  );
}
