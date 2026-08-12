'use client';

import { useState } from 'react';
import { saveCodingProblem } from '../actions';
import Button from '@/components/ui/Button';
import Input, { TextArea, Select } from '@/components/ui/Input';

interface ProblemFormProps {
  onSuccess?: (problem: any) => void;
}

export default function ProblemForm({ onSuccess }: ProblemFormProps) {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (form) => {
        setPending(true);
        setMessage('');
        const result = await saveCodingProblem(form);
        setPending(false);

        if ('error' in result && result.error) {
          setMessage(result.error);
        } else if ('problem' in result) {
          setMessage('Problem saved successfully.');
          if (onSuccess) {
            onSuccess(result.problem);
          }
        }
      }}
      style={{ display: 'grid', gap: 'var(--space-md)' }}
    >
      <Input name="title" label="Title" required placeholder="e.g. Binary Tree Inorder Traversal" />
      <Input name="slug" label="Slug (optional)" placeholder="binary-tree-inorder" />
      <Select
        name="difficulty"
        label="Difficulty"
        options={[
          { value: 'EASY', label: 'Easy' },
          { value: 'MEDIUM', label: 'Medium' },
          { value: 'HARD', label: 'Hard' },
        ]}
      />
      <Input name="tags" label="Tags (comma-separated)" placeholder="trees, dfs, stack" />
      <TextArea name="description" label="Description" required placeholder="Given the root of a binary tree..." />
      <TextArea name="constraints" label="Constraints" placeholder="1 <= Node.val <= 100" />
      <TextArea name="input_format" label="Input format" placeholder="Root array representation" />
      <TextArea name="output_format" label="Output format" placeholder="List of integers" />
      <TextArea name="explanation" label="Explanation" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 'var(--space-md)' }}>
        <Input name="time_limit_ms" label="Time limit (ms)" type="number" defaultValue="2000" min="1" required />
        <Input name="memory_limit_mb" label="Memory (MB)" type="number" defaultValue="256" min="1" required />
      </div>

      <label className="input-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <input name="is_published" type="checkbox" value="true" defaultChecked /> Publish for students
      </label>

      {message && <p className={message.includes('successfully') ? 'text-neon-lime' : 'text-neon-pink'}>{message}</p>}

      <Button type="submit" variant="primary" isLoading={pending}>
        Save Problem
      </Button>
    </form>
  );
}
