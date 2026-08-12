import { notFound } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { saveTestCase, deleteTestCase } from '@/features/code-arena/actions';

export default async function InstructorProblemCasesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return null;
  const { data: problem } = await supabase.from('coding_problems').select('id,title').eq('id', id).eq('created_by', user.id).single();
  if (!problem) notFound();
  const { data: cases } = await supabase.from('coding_problem_test_cases').select('*').eq('problem_id', id).order('order_index');
  return <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-xl)' }}>
    <div><h1 className="text-gradient">{problem.title}</h1><p className="text-secondary">Test cases — hidden inputs and expected output are only visible to instructors.</p></div>
    <Card variant="glass"><h2 style={{ fontSize:'var(--text-xl)' }}>Add test case</h2><form action={async (formData) => { 'use server'; await saveTestCase(formData); }} style={{ display:'grid', gap:'var(--space-md)', marginTop:'var(--space-md)' }}><input type="hidden" name="problem_id" value={id} /><input className="input-field" name="sample_name" placeholder="Test Case 1" /><textarea className="input-field textarea-field" name="input" placeholder="Input" required /><textarea className="input-field textarea-field" name="expected_output" placeholder="Expected Output" required /><label className="input-label"><input name="is_hidden" type="checkbox" value="true" /> Hidden from students</label><input className="input-field" name="order_index" type="number" defaultValue="0" /><Button type="submit" variant="primary">+ Add Test Case</Button></form></Card>
    <div style={{ display:'grid', gap:'var(--space-md)' }}>{cases?.map((testCase, index) => <Card key={testCase.id} variant="glass"><div style={{ display:'flex', justifyContent:'space-between', gap:'var(--space-md)', flexWrap:'wrap' }}><div><h2 style={{ fontSize:'var(--text-lg)' }}>{testCase.sample_name || `Test Case ${index + 1}`} <span className={testCase.is_hidden ? 'text-neon-pink' : 'text-neon-lime'} style={{ fontSize:'var(--text-xs)' }}>{testCase.is_hidden ? 'HIDDEN' : 'PUBLIC'}</span></h2><pre style={{ whiteSpace:'pre-wrap' }}>{testCase.is_hidden ? 'Input hidden from students\nExpected output hidden' : `Input\n${testCase.input}\n\nExpected Output\n${testCase.expected_output}`}</pre></div><form action={async () => { 'use server'; await deleteTestCase(testCase.id, id); }}><Button variant="danger" size="sm">Delete</Button></form></div></Card>)}</div>
  </div>;
}
