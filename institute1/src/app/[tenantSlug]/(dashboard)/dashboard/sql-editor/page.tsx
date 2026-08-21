import SQLEditor from '@/components/sql/SQLEditor';

export const metadata = {
  title: 'Interactive SQL Editor | Workspace',
  description: 'Full-featured SQL workspace with real-time query execution engine, schema explorer, sample datasets, and data export.'
};

export default function SQLEditorPage() {
  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6">
      <SQLEditor height="calc(100vh - 120px)" />
    </div>
  );
}
