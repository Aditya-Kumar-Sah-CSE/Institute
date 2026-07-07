'use client';

import React, { useState } from 'react';
import { createCourseAlert } from '../actions/alerts';

interface CreateAlertSectionProps {
  courseId: string;
}

export default function CreateAlertSection({ courseId }: CreateAlertSectionProps) {
  const [description, setDescription] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(12);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreateAlert = async (type: 'cancel' | 'asap') => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await createCourseAlert(courseId, type, description, expiresInHours);
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
      <h3 style={{ color: 'var(--text-danger)', marginTop: 0, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.2em' }}>🚨</span> Emergency Alert System
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <textarea 
          placeholder="Today Class is cancelled due ...."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-base"
          style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
          disabled={isSubmitting}
        />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Expires in (hours):</label>
          <input 
            type="number" 
            min="1" 
            max="168" 
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(parseInt(e.target.value) || 12)}
            className="input-base"
            style={{ width: '80px', padding: '4px 8px' }}
            disabled={isSubmitting}
          />
        </div>

        {error && <div style={{ color: 'var(--text-danger)', fontSize: 'var(--text-sm)' }}>{error}</div>}
        {success && <div style={{ color: 'var(--neon-green)', fontSize: 'var(--text-sm)' }}>{success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
          <button 
            onClick={() => handleCreateAlert('cancel')}
            disabled={isSubmitting}
            className="btn btn-danger"
            style={{ width: '100%', minHeight: '60px', fontSize: '1.05rem', fontWeight: 'bold' }}
          >
            ❌ Class Cancelled
          </button>
          
          <button 
            onClick={() => handleCreateAlert('asap')}
            disabled={isSubmitting}
            className="btn btn-warning"
            style={{ width: '100%', minHeight: '60px', fontSize: '1.05rem', fontWeight: 'bold', backgroundColor: '#ff9500', color: '#fff', border: 'none' }}
          >
            ⚠️ Come Class ASAP
          </button>
        </div>
      </div>
    </div>
  );
}
