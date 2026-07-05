'use client';

import React, { useState, useTransition } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createCoursePoll } from '../actions/polls';

interface CreatePollModalProps {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatePollModal({ courseId, isOpen, onClose }: CreatePollModalProps) {
  const [isPending, startTransition] = useTransition();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']); // Start with 2 options
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(2); // Default to 2 days as requested

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() === '') {
      alert('Question cannot be empty');
      return;
    }
    
    const validOptions = options.filter(o => o.trim() !== '');
    if (validOptions.length < 2) {
      alert('You must provide at least 2 valid options');
      return;
    }

    startTransition(async () => {
      const result = await createCoursePoll(courseId, question.trim(), validOptions, isMultipleChoice, expiresInDays);
      if (result.error) {
        alert(result.error);
      } else {
        onClose();
        // Reset form
        setQuestion('');
        setOptions(['', '']);
        setIsMultipleChoice(false);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Course Poll" size="md">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div>
          <label style={{ display: 'block', marginBottom: 'var(--space-xs)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Poll Question</label>
          <Input 
            placeholder="e.g. How many students are present in the college campus?" 
            value={question}
            onChange={e => setQuestion(e.target.value)}
            disabled={isPending}
            autoFocus
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 'var(--space-xs)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Options</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {options.map((opt, index) => (
              <div key={index} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <Input 
                    placeholder={`Option ${index + 1}`} 
                    value={opt}
                    onChange={e => handleOptionChange(index, e.target.value)}
                    disabled={isPending}
                  />
                </div>
                {options.length > 2 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveOption(index)}
                    disabled={isPending}
                    style={{ background: 'transparent', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', padding: 'var(--space-xs)' }}
                    title="Remove option"
                  >
                    ✖
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 10 && (
            <Button 
              type="button" 
              variant="secondary" 
              size="sm" 
              onClick={handleAddOption}
              disabled={isPending}
              style={{ marginTop: 'var(--space-sm)' }}
            >
              + Add Option
            </Button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            <input 
              type="checkbox" 
              checked={isMultipleChoice}
              onChange={e => setIsMultipleChoice(e.target.checked)}
              disabled={isPending}
            />
            Allow Multiple Answers
          </label>
        </div>

        <div style={{ marginTop: 'var(--space-sm)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--space-xs)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Poll Expires In</label>
          <select 
            value={expiresInDays}
            onChange={e => setExpiresInDays(Number(e.target.value))}
            disabled={isPending}
            style={{ 
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-border)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              width: '100%',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value={1}>1 Day</option>
            <option value={2}>2 Days</option>
            <option value={3}>3 Days</option>
            <option value={5}>5 Days</option>
            <option value={7}>1 Week</option>
            <option value={14}>2 Weeks</option>
            <option value={30}>1 Month</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Poll'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
