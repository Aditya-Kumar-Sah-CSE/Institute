'use client';

import React, { useState } from 'react';
import { createCourseAlert } from '../actions/alerts';
import { Send } from 'lucide-react';

interface CreateAlertSectionProps {
  courseId: string;
}

export default function CreateAlertSection({ courseId }: CreateAlertSectionProps) {
  const [description, setDescription] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(12);
  const [alertType, setAlertType] = useState<'cancel' | 'asap'>('cancel');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreateAlert = async () => {
    if (!description.trim()) return;
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await createCourseAlert(courseId, alertType, description, expiresInHours);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess('Alert created successfully and students notified.');
        setDescription('');
        setExpiresInHours(12);
        
        // Hide success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ marginBottom: 'var(--space-xl)', background: 'rgba(255, 59, 48, 0.05)', border: '1px solid rgba(255, 59, 48, 0.2)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          <h3 style={{ color: 'var(--text-danger)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2em' }}>🚨</span> Emergency Alert System
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%', flexWrap: 'nowrap' }}>
            <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-body)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 59, 48, 0.2)', flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <button 
                type="button"
                onClick={() => setAlertType('cancel')}
                disabled={isSubmitting}
                style={{ 
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '4px', 
                  borderRadius: '4px', 
                  border: 'none', 
                  background: alertType === 'cancel' ? '#ff3b30' : 'transparent',
                  color: alertType === 'cancel' ? '#fff' : 'var(--text-muted)',
                  fontWeight: 'bold',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Cancel Class
              </button>
              <button 
                type="button"
                onClick={() => setAlertType('asap')}
                disabled={isSubmitting}
                style={{ 
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '4px', 
                  borderRadius: '4px', 
                  border: 'none', 
                  background: alertType === 'asap' ? '#ff9500' : 'transparent',
                  color: alertType === 'asap' ? '#fff' : 'var(--text-muted)',
                  fontWeight: 'bold',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Come ASAP
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1px', background: 'rgba(0, 0, 0, 0.2)', padding: '4px 6px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.1)', flex: '0 0 auto' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Expires (hrs):</label>
              <input 
                type="number" 
                min="1" 
                max="168" 
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(parseInt(e.target.value) || 12)}
                style={{ width: '28px', border: 'none', background: 'transparent', color: 'inherit', outline: 'none', textAlign: 'right', fontSize: '0.8rem', padding: '0' }}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
        
        {error && <div style={{ color: 'var(--text-danger)', fontSize: 'var(--text-sm)' }}>{error}</div>}
        {success && <div style={{ color: 'var(--neon-green)', fontSize: 'var(--text-sm)' }}>{success}</div>}

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          background: 'rgba(0, 0, 0, 0.2)', 
          borderRadius: '24px', 
          padding: '6px 6px 6px 16px',
          border: '1px solid rgba(255, 59, 48, 0.3)',
          gap: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <input 
            placeholder={alertType === 'cancel' ? "Today Class is cancelled due ...." : "Please come to class ASAP because...."}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCreateAlert();
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
            onClick={handleCreateAlert}
            disabled={isSubmitting || !description.trim()}
            style={{
              background: description.trim() ? (alertType === 'cancel' ? '#ff3b30' : '#ff9500') : 'rgba(255, 255, 255, 0.1)',
              color: description.trim() ? '#fff' : 'rgba(255, 255, 255, 0.3)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: description.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
          >
            <Send size={18} style={{ marginLeft: '-2px' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
