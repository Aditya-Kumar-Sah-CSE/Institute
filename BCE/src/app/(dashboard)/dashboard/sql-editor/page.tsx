import { Suspense } from 'react';
import SQLEditor from '@/components/sql/SQLEditor';

export const metadata = {
  title: 'SQL Editor | SkillArena',
};

export default function SQLEditorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading SQL Editor...</div>}>
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <SQLEditor />
      </div>
    </Suspense>
  );
}
