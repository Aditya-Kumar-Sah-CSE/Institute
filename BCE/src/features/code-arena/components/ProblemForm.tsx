'use client';
import { useState } from 'react';
import { saveCodingProblem } from '../actions';
import Button from '@/components/ui/Button';
import Input, { TextArea, Select } from '@/components/ui/Input';

export default function ProblemForm() {
  const [message, setMessage] = useState(''); const [pending, setPending] = useState(false);
  return <form action={async form => { setPending(true); const result = await saveCodingProblem(form); setMessage('error' in result ? result.error : 'Problem saved.'); setPending(false); }} style={{ display:'grid', gap:'var(--space-md)' }}>
    <Input name="title" label="Title" required /><Input name="slug" label="Slug (optional)" placeholder="two-sum" />
    <Select name="difficulty" label="Difficulty" options={[{ value:'EASY', label:'Easy' }, { value:'MEDIUM', label:'Medium' }, { value:'HARD', label:'Hard' }]} />
    <Input name="tags" label="Tags" placeholder="arrays, math" /><TextArea name="description" label="Description" required /><TextArea name="constraints" label="Constraints" /><TextArea name="input_format" label="Input format" /><TextArea name="output_format" label="Output format" /><TextArea name="explanation" label="Explanation" />
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'var(--space-md)' }}><Input name="time_limit_ms" label="Time limit (ms)" type="number" defaultValue="2000" min="1" required /><Input name="memory_limit_mb" label="Memory (MB)" type="number" defaultValue="256" min="1" required /></div>
    <label className="input-label"><input name="is_published" type="checkbox" value="true" /> Publish for students</label>{message && <p className={message.includes('saved') ? 'text-neon-lime' : 'text-neon-pink'}>{message}</p>}<Button type="submit" variant="primary" isLoading={pending}>Create problem</Button>
  </form>;
}
