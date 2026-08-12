import { notFound } from 'next/navigation';
import Card from '@/components/ui/Card';
import { getCodeArenaActor } from '@/features/code-arena/server';
import CodeEditor from '@/features/code-arena/components/CodeEditor';
import '@/features/code-arena/components/CodeArena.css';

export default async function CodeProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { supabase, user } = await getCodeArenaActor(); if (!user) return null;
  const { data: problem } = await supabase.from('coding_problems').select('*').eq('id', id).eq('is_published', true).single(); if (!problem) notFound();
  const { data: samples } = await supabase.from('coding_problem_test_cases').select('input,expected_output,sample_name,order_index').eq('problem_id', id).eq('is_hidden', false).order('order_index');
  return <div className="code-arena-page"><div className="code-problem-layout"><Card variant="glass" className="code-statement"><span className={`difficulty-${problem.difficulty}`} style={{ fontWeight:700 }}>{problem.difficulty}</span><h1 style={{ fontSize:'var(--text-2xl)' }}>{problem.title}</h1><p style={{ whiteSpace:'pre-wrap' }}>{problem.description}</p>{problem.constraints && <section><h2>Constraints</h2><p style={{ whiteSpace:'pre-wrap' }}>{problem.constraints}</p></section>}{problem.input_format && <section><h2>Input</h2><p style={{ whiteSpace:'pre-wrap' }}>{problem.input_format}</p></section>}{problem.output_format && <section><h2>Output</h2><p style={{ whiteSpace:'pre-wrap' }}>{problem.output_format}</p></section>}<section><h2>Examples</h2>{samples?.map((sample, index) => <div key={index}><h3 style={{ fontSize:'var(--text-sm)' }}>{sample.sample_name || `Example ${index + 1}`}</h3><pre>Input{`\n`}{sample.input}{`\n\n`}Output{`\n`}{sample.expected_output}</pre></div>) || <p>No public examples yet.</p>}</section></Card><CodeEditor problemId={problem.id} supportedLanguages={problem.supported_languages} samples={samples || []} /></div></div>;
}
