'use client';

import React, { useState } from 'react';
import { Qualification } from '@/types/database';
import { updateQualificationsAction } from '@/features/profile/actions/profile';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { GraduationCap, Plus, Trash2, Edit3, Save, X, School } from 'lucide-react';

interface QualificationsManagerProps {
  initialQualifications?: Qualification[];
}

export default function QualificationsManager({ initialQualifications = [] }: QualificationsManagerProps) {
  const [qualifications, setQualifications] = useState<Qualification[]>(initialQualifications);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [degree, setDegree] = useState('');
  const [institution, setInstitution] = useState('');
  const [year, setYear] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [grade, setGrade] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setDegree('');
    setInstitution('');
    setYear('');
    setFieldOfStudy('');
    setGrade('');
    setIsEditing(true);
  };

  const handleOpenEdit = (q: Qualification) => {
    setEditingId(q.id);
    setDegree(q.degree);
    setInstitution(q.institution);
    setYear(q.year);
    setFieldOfStudy(q.fieldOfStudy || '');
    setGrade(q.grade || '');
    setIsEditing(true);
  };

  const handleSaveItem = async () => {
    if (!degree.trim() || !institution.trim()) {
      setError('Degree and Institution are required.');
      return;
    }

    setError('');
    let updated: Qualification[];

    if (editingId) {
      updated = qualifications.map(q => q.id === editingId ? {
        id: editingId,
        degree: degree.trim(),
        institution: institution.trim(),
        year: year.trim(),
        fieldOfStudy: fieldOfStudy.trim(),
        grade: grade.trim()
      } : q);
    } else {
      const newItem: Qualification = {
        id: crypto.randomUUID(),
        degree: degree.trim(),
        institution: institution.trim(),
        year: year.trim(),
        fieldOfStudy: fieldOfStudy.trim(),
        grade: grade.trim()
      };
      updated = [...qualifications, newItem];
    }

    setIsLoading(true);
    const res = await updateQualificationsAction(updated);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setQualifications(updated);
      setIsEditing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this qualification?')) return;

    const updated = qualifications.filter(q => q.id !== id);
    setIsLoading(true);
    const res = await updateQualificationsAction(updated);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setQualifications(updated);
    }
  };

  return (
    <Card variant="glass" className="profile-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
        <h2 className="section-title-sm" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GraduationCap size={18} style={{ color: 'var(--neon-cyan)' }} /> Qualifications
        </h2>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={handleOpenAdd} style={{ color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={14} /> Add Qualification
          </Button>
        )}
      </div>

      {error && <p style={{ color: 'var(--neon-red)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-sm)' }}>{error}</p>}

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', padding: 'var(--space-md)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
          <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--neon-cyan)' }}>
            {editingId ? 'Edit Qualification' : 'Add New Qualification'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            <Input 
              placeholder="Degree / Qualification (e.g. B.Tech CS)" 
              value={degree} 
              onChange={e => setDegree(e.target.value)} 
              disabled={isLoading}
            />
            <Input 
              placeholder="Institution / University" 
              value={institution} 
              onChange={e => setInstitution(e.target.value)} 
              disabled={isLoading}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
            <Input 
              placeholder="Field of Study (e.g. CSE)" 
              value={fieldOfStudy} 
              onChange={e => setFieldOfStudy(e.target.value)} 
              disabled={isLoading}
            />
            <Input 
              placeholder="Year (e.g. 2020-2024)" 
              value={year} 
              onChange={e => setYear(e.target.value)} 
              disabled={isLoading}
            />
            <Input 
              placeholder="Grade / CGPA (e.g. 8.5 / 10)" 
              value={grade} 
              onChange={e => setGrade(e.target.value)} 
              disabled={isLoading}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
            <Button size="sm" onClick={handleSaveItem} isLoading={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Save size={14} /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isLoading}>
              <X size={14} /> Cancel
            </Button>
          </div>
        </div>
      ) : qualifications.length === 0 ? (
        <div style={{ padding: 'var(--space-md)', textDecoration: 'none', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--glass-border)' }}>
          <p className="text-muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>No educational qualifications added yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {qualifications.map(q => (
            <div 
              key={q.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-md)',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <School size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{q.degree}</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--neon-cyan)' }}>{q.institution}</p>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {q.fieldOfStudy && <span>Field: {q.fieldOfStudy}</span>}
                    {q.year && <span>Year: {q.year}</span>}
                    {q.grade && <span>Grade: {q.grade}</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(q)} disabled={isLoading} style={{ padding: '6px' }}>
                  <Edit3 size={14} style={{ color: 'var(--text-secondary)' }} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(q.id)} disabled={isLoading} style={{ padding: '6px' }}>
                  <Trash2 size={14} style={{ color: 'var(--neon-red)' }} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
