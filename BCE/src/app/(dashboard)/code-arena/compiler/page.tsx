import { redirect } from 'next/navigation';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { isFeatureAllowed } from '@/lib/feature-flags';
import LockedFeatureScreen from '@/components/ui/LockedFeatureScreen';
import PersonalCompiler from '@/features/code-arena/components/PersonalCompiler';
import MobileCodeArenaToggle from '@/features/code-arena/components/MobileCodeArenaToggle';
import '@/features/code-arena/components/CodeArena.css';

export default async function CompilerPage() {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) redirect('/login');

  // Check Feature Flag / Emergency Kill Switch
  const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isAllowed = isFeatureAllowed('compiler', null, null, null, user.email, userProfile?.role);
  if (!isAllowed) {
    return <LockedFeatureScreen featureName="Compiler" />;
  }

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
      <MobileCodeArenaToggle />
      <PersonalCompiler initialSnippets={snippets} />
    </div>
  );
}
