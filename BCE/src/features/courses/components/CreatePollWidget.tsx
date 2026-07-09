'use client';

import React, { useState } from 'react';
import { createCoursePoll } from '../actions/polls';
import { Send, Plus, X, BarChart2 } from 'lucide-react';

interface CreatePollWidgetProps {
  courseId: string;
}

export default function CreatePollWidget({ courseId }: CreatePollWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAddOption = () => {
    if (options.length < 10) setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    if (!question.trim()) return;
    
    const validOptions = options.filter(o => o.trim() !== '');
    if (validOptions.length < 2) {
      setError('Provide at least 2 valid options');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await createCoursePoll(courseId, question.trim(), validOptions, isMultipleChoice, expiresInDays);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Poll created successfully.');
        setQuestion('');
        setOptions(['', '']);
        setIsMultipleChoice(false);
        setIsExpanded(false); // collapse on success
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Course Polls</h2>
        {!isExpanded && (
          <button 
            onClick={() => setIsExpanded(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 16px', 
              background: 'rgba(10, 132, 255, 0.1)', 
              color: '#0a84ff', 
              border: '1px solid rgba(10, 132, 255, 0.2)', 
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            <BarChart2 size={18} />
            Create Poll
          </button>
        )}
      </div>

      {isExpanded && (
        <div style={{ marginBottom: 'var(--space-xl)', background: 'rgba(10, 132, 255, 0.03)', border: '1px solid rgba(10, 132, 255, 0.15)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
              <h3 style={{ color: '#0a84ff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={20} /> Create Course Poll
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-body)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(10, 132, 255, 0.2)' }}>
                  <button 
                    type="button"
                    onClick={() => setIsMultipleChoice(!isMultipleChoice)}
                    disabled={isSubmitting}
                    style={{ 
                      padding: '4px 12px', 
                      borderRadius: '4px', 
                      border: 'none', 
                      background: isMultipleChoice ? '#0a84ff' : 'transparent',
                      color: isMultipleChoice ? '#fff' : 'var(--text-muted)',
                      fontWeight: 'bold',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    Multiple Choice
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 0, 0, 0.2)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Expires (days):</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="30" 
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 2)}
                    style={{ width: '40px', border: 'none', background: 'transparent', color: 'inherit', outline: 'none', textAlign: 'right' }}
                    disabled={isSubmitting}
                  />
                </div>
                
                <button 
                  onClick={() => setIsExpanded(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {error && <div style={{ color: 'var(--text-danger)', fontSize: 'var(--text-sm)' }}>{error}</div>}
            {success && <div style={{ color: 'var(--neon-green)', fontSize: 'var(--text-sm)' }}>{success}</div>}

            {/* Options UI */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 8px' }}>
              {options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>
                    {idx + 1}
                  </div>
                  <input 
                    value={opt}
                    onChange={e => handleOptionChange(idx, e.target.value)}
                    disabled={isSubmitting}
                    placeholder={`Option ${idx + 1}`}
                    style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.1)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: 'inherit',
                      outline: 'none',
                      transition: 'border 0.2s'
                    }}
                  />
                  {options.length > 2 && (
                    <button 
                      onClick={() => handleRemoveOption(idx)}
                      disabled={isSubmitting}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-danger)', cursor: 'pointer', padding: '4px' }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 10 && (
                <button 
                  onClick={handleAddOption}
                  disabled={isSubmitting}
                  style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: '#0a84ff', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.85rem', padding: '4px 8px', marginTop: '4px' }}
                >
                  <Plus size={14} /> Add Option
                </button>
              )}
            </div>

            {/* Main Input equivalent to WhatsApp */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              background: 'rgba(0, 0, 0, 0.2)', 
              borderRadius: '24px', 
              padding: '6px 6px 6px 16px',
              border: '1px solid rgba(10, 132, 255, 0.3)',
              gap: '8px',
              marginTop: 'var(--space-xs)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}>
              <input 
                placeholder="Ask your question here..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCreatePoll();
                  }
                }}
                style={{ 
                  flex: 1, 
                  background: 'transparent', 
                  border: 'none', 
                  outline: 'none', 
                  color: 'inherit',
                  fontSize: '1rem'
                }}
              />
              <button 
                onClick={handleCreatePoll}
                disabled={isSubmitting || !question.trim() || options.filter(o => o.trim()).length < 2}
                style={{
                  background: (question.trim() && options.filter(o => o.trim()).length >= 2) ? '#0a84ff' : 'rgba(255, 255, 255, 0.1)',
                  color: (question.trim() && options.filter(o => o.trim()).length >= 2) ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (question.trim() && options.filter(o => o.trim()).length >= 2 && !isSubmitting) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
              >
                <Send size={18} style={{ marginLeft: '-2px' }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
