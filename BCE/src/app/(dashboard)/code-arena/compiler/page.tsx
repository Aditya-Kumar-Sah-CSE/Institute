import { redirect } from 'next/navigation';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { isFeatureAllowed } from '@/lib/feature-flags';
import LockedFeatureScreen from '@/components/ui/LockedFeatureScreen';
import PersonalCompiler from '@/features/code-arena/components/PersonalCompiler';
import MobileCodeArenaToggle from '@/features/code-arena/components/MobileCodeArenaToggle';
import Link from 'next/link';
import { ArrowLeft, Trophy } from 'lucide-react';
import UserAvatar from '@/components/shared/UserAvatar';
import '@/features/code-arena/components/CodeArena.css';

export default async function CompilerPage() {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) redirect('/login');

  // Check Feature Flag / Emergency Kill Switch
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role, full_name, display_name, avatar_url')
    .eq('id', user.id)
    .single();

  const isAllowed = await isFeatureAllowed('compiler', null, null, null, user.email, userProfile?.role);
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

  const profileName = userProfile?.display_name || userProfile?.full_name || 'Coder';
  const profileAvatar = userProfile?.avatar_url || '';

  return (
    <div className="code-arena-page ide-mode">
      <MobileCodeArenaToggle />
      
      {/* Compact IDE Header Bar */}
      <header className="code-arena-header-compact" style={{ marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            href="/code-arena"
            className="oj-icon-btn"
            title="Back to Code Arena"
            style={{ display: 'inline-flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}
          >
            <ArrowLeft size={16} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--neon-cyan)', background: 'rgba(6,182,212,0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            <Trophy size={13} /> Personal Sandbox Compiler
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            href="/code-arena/profile"
            className="oj-icon-btn profile-avatar-btn"
            style={{ overflow: 'hidden', position: 'relative', width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0 }}
            title={`View Profile: ${profileName}`}
            aria-label="View Profile"
          >
            <UserAvatar url={profileAvatar} name={profileName} size={30} />
          </Link>
        </div>
      </header>

      <div className="code-arena-workspace-container" style={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
        <PersonalCompiler initialSnippets={snippets} />
      </div>
    </div>
  );
}
