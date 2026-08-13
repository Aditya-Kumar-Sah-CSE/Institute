'use client';

import React, { useState } from 'react';
import { createCoursePoll } from '../actions/polls';
import { Send, Plus, X, BarChart2 } from 'lucide-react';
import './Polls.css';

interface CreatePollWidgetProps {
  courseId: string;
  hideHeading?: boolean;
}

export default function CreatePollWidget({ courseId, hideHeading = false }: CreatePollWidgetProps) {
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
      <div className={`create-poll-widget-header ${hideHeading ? 'create-poll-widget-header-compact' : ''}`} style={{ display: 'flex', justifyContent: hideHeading ? 'flex-end' : 'space-between', alignItems: 'center', marginBottom: hideHeading ? 0 : 'var(--space-lg)' }}>
        {!hideHeading && <h2 className="section-title" style={{ margin: 0 }}>Course Polls</h2>}
        {!isExpanded && (
          <button 
            onClick={() => setIsExpanded(true)}
            className="create-poll-trigger"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.5rem 1rem', 
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
            Create
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="create-poll-form" style={{ marginBottom: 'var(--space-xl)', background: 'rgba(10, 132, 255, 0.03)', border: '1px solid rgba(10, 132, 255, 0.15)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="create-poll-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
              <h3 style={{ color: '#0a84ff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={20} /> Create Course Poll
              </h3>
              
              <div className="create-poll-controls" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-body)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(10, 132, 255, 0.2)' }}>
                  <button 
                    type="button"
                    onClick={() => setIsMultipleChoice(!isMultipleChoice)}
                    disabled={isSubmitting}
                    className="multiple-choice-control"
                    style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '0.25rem', 
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0, 0, 0, 0.2)', padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Expires (days):</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="30" 
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 2)}
                    className="poll-expiry-input"
                    style={{ width: '2.5rem', border: 'none', background: 'transparent', color: 'inherit', outline: 'none', textAlign: 'right' }}
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
            <div className="create-poll-options" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 8px' }}>
              {options.map((opt, idx) => (
                <div key={idx} className="create-poll-option-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                    {idx + 1}
                  </div>
                  <input 
                    value={opt}
                    onChange={e => handleOptionChange(idx, e.target.value)}
                    disabled={isSubmitting}
                    placeholder={`Option ${idx + 1}`}
                    className="create-poll-option-input"
                    style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.1)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.5rem 0.75rem',
                      color: 'inherit',
                      outline: 'none',
                      transition: 'border 0.2s'
                    }}
                  />
                  {options.length > 2 && (
                    <button 
                      onClick={() => handleRemoveOption(idx)}
                      disabled={isSubmitting}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-danger)', cursor: 'pointer', padding: '0.25rem' }}
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
                  style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: '#0a84ff', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.85rem', padding: '0.25rem 0.5rem', marginTop: '0.25rem' }}
                >
                  <Plus size={14} /> Add Option
                </button>
              )}
            </div>

            {/* Main Input equivalent to WhatsApp */}
            <div className="create-poll-question-row" style={{
              display: 'flex', 
              alignItems: 'center', 
              background: 'rgba(0, 0, 0, 0.2)', 
              borderRadius: '1.5rem', 
              padding: '0.375rem 0.375rem 0.375rem 1rem',
              border: '1px solid rgba(10, 132, 255, 0.3)',
              gap: '0.5rem',
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
                className="create-poll-question-input"
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
                  width: '2.5rem',
                  height: '2.5rem',
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
