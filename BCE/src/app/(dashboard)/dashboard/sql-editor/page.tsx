import SQLEditor from '@/components/sql/SQLEditor';

export const metadata = {
  title: 'SQL Editor | SkillArena',
};

export default function SQLEditorPage() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <SQLEditor />
    </div>
  );
}
