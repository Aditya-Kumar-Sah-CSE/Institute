'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { User } from 'lucide-react';

export default function JoinedStudentsList({ enrollments }: { enrollments: any[] }) {
  const [showAll, setShowAll] = useState(false);

  if (!enrollments || enrollments.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>No students have joined this course yet.</p>;
  }

  const visibleEnrollments = showAll ? enrollments : enrollments.slice(0, 1);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
        {visibleEnrollments.map((enrollment: any) => (
          <Card key={enrollment.id} variant="glass" style={{ padding: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              {enrollment.profiles?.avatar_url ? (
                <img 
                  src={enrollment.profiles.avatar_url} 
                  alt={enrollment.profiles.name} 
                  style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  <User size={24} opacity={0.5} />
                </div>
              )}
              <div>
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px 0' }}>{enrollment.profiles?.name || 'Unknown User'}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 2px 0' }}>{enrollment.profiles?.email}</p>
                {enrollment.profiles?.institute_id && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 6px 0', opacity: 0.8 }}>ID: {enrollment.profiles.institute_id}</p>
                )}
                <div style={{ 
                  fontSize: '0.75rem', 
                  display: 'inline-block', 
                  padding: '2px 8px', 
                  borderRadius: 12, 
                  backgroundColor: enrollment.status === 'approved' ? 'rgba(0, 255, 0, 0.1)' : 
                                   enrollment.status === 'rejected' ? 'rgba(255, 0, 0, 0.1)' : 
                                   'rgba(255, 165, 0, 0.1)', 
                  color: enrollment.status === 'approved' ? 'var(--neon-lime)' : 
                         enrollment.status === 'rejected' ? 'var(--danger)' : 
                         'var(--neon-gold)' 
                }}>
                  {enrollment.status ? enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1) : 'Joined'}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {!showAll && enrollments.length > 1 && (
        <Button variant="secondary" onClick={() => setShowAll(true)} style={{ marginTop: 'var(--space-md)', padding: '16px', fontWeight: 'bold', width: '100%' }}>
          View all {enrollments.length} students
        </Button>
      )}

      {showAll && enrollments.length > 1 && (
        <Button variant="ghost" onClick={() => setShowAll(false)} style={{ marginTop: 'var(--space-md)', padding: '16px', fontWeight: 'bold', width: '100%', border: '1px solid var(--glass-border)' }}>
          View Less
        </Button>
      )}
    </div>
  );
}
