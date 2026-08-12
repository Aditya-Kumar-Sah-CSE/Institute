import Link from 'next/link';
import Card from '@/components/ui/Card';
import { getCodeArenaActor } from '@/features/code-arena/server';
import '@/features/code-arena/components/CodeArena.css';

export default async function CodeArenaPage() {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return null;
  const { data: problems } = await supabase.from('coding_problems').select('id,title,slug,difficulty,tags,source_type,created_at').eq('is_published', true).order('created_at', { ascending: false }).limit(50);
  return <div className="code-arena-page"><header className="code-arena-header"><div><h1 className="text-gradient">BCE Code Arena</h1><p className="text-secondary">Practice curated problems and submit through the secure judge queue.</p></div><Link className="btn btn-secondary" href="/code-arena/battles">Battles</Link></header><div className="problem-grid">{problems?.length ? problems.map(problem => <Link key={problem.id} href={`/code-arena/problems/${problem.id}`} style={{ textDecoration:'none' }}><Card variant="glass" className="problem-card"><div className={`difficulty-${problem.difficulty}`} style={{ fontWeight:700 }}>{problem.difficulty}</div><h2 style={{ fontSize:'var(--text-lg)', margin:0 }}>{problem.title}</h2><div className="problem-meta"><span>{problem.source_type}</span>{problem.tags?.slice(0,3).map((tag: string) => <span key={tag}>#{tag}</span>)}</div></Card></Link>) : <Card variant="glass" style={{ gridColumn:'1/-1', textAlign:'center' }}><h2 style={{ fontSize:'var(--text-xl)' }}>No problems published yet</h2><p>Check back when your instructors publish Code Arena problems.</p></Card>}</div></div>;
}
