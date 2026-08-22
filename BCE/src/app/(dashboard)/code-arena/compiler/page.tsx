import { redirect } from 'next/navigation';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { isFeatureAllowed } from '@/lib/feature-flags';
import LockedFeatureScreen from '@/components/ui/LockedFeatureScreen';
import PersonalCompiler from '@/features/code-arena/components/PersonalCompiler';
import MobileCodeArenaToggle from '@/features/code-arena/components/MobileCodeArenaToggle';
import Link from 'next/link';
import { ArrowLeft, Trophy } from 'lucide-react';
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
    <div className="code-arena-page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <MobileCodeArenaToggle />
      
      {/* Compact IDE Header Bar */}
      <header className="code-arena-header-compact" style={{ marginBottom: '12px' }}>
        <div className="code-arena-header-left">
          <Link
            href="/code-arena"
            style={{
              display: 'grid',
              placeItems: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            title="Back to Code Arena"
            aria-label="Back to Code Arena"
            className="oj-icon-btn"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="code-arena-header-title">
              Code Arena
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--neon-cyan)', background: 'rgba(6,182,212,0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            <Trophy size={13} /> Personal Sandbox Compiler
          </div>
        </div>
      </header>

      <PersonalCompiler initialSnippets={snippets} />
    </div>
  );
}
