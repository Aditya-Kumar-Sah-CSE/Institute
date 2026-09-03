'use client';

import React, { useState } from 'react';
import { WorkExperience } from '@/types/database';
import { updateWorkExperienceAction } from '@/features/profile/actions/profile';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Briefcase, Plus, Trash2, Edit3, Save, X, Building2 } from 'lucide-react';

interface WorkExperienceManagerProps {
  initialWorkExperience?: WorkExperience[];
}

export default function WorkExperienceManager({ initialWorkExperience = [] }: WorkExperienceManagerProps) {
  const [workExperience, setWorkExperience] = useState<WorkExperience[]>(initialWorkExperience);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [current, setCurrent] = useState(false);
  const [description, setDescription] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setTitle('');
    setCompany('');
    setStartDate('');
    setEndDate('');
    setCurrent(false);
    setDescription('');
    setIsEditing(true);
  };

  const handleOpenEdit = (w: WorkExperience) => {
    setEditingId(w.id);
    setTitle(w.title);
    setCompany(w.company);
    setStartDate(w.startDate);
    setEndDate(w.endDate === 'Present' ? '' : (w.endDate || ''));
    setCurrent(!!w.current || w.endDate === 'Present');
    setDescription(w.description || '');
    setIsEditing(true);
  };

  const handleSaveItem = async () => {
    if (!title.trim() || !company.trim()) {
      setError('Job Title and Company / Organization are required.');
      return;
    }

    setError('');
    let updated: WorkExperience[];

    if (editingId) {
      updated = workExperience.map(w => w.id === editingId ? {
        id: editingId,
        title: title.trim(),
        company: company.trim(),
        startDate: startDate.trim(),
        endDate: current ? 'Present' : endDate.trim(),
        current,
        description: description.trim()
      } : w);
    } else {
      const newItem: WorkExperience = {
        id: crypto.randomUUID(),
        title: title.trim(),
        company: company.trim(),
        startDate: startDate.trim(),
        endDate: current ? 'Present' : endDate.trim(),
        current,
        description: description.trim()
      };
      updated = [...workExperience, newItem];
    }

    setIsLoading(true);
    const res = await updateWorkExperienceAction(updated);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setWorkExperience(updated);
      setIsEditing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this work experience?')) return;

    const updated = workExperience.filter(w => w.id !== id);
    setIsLoading(true);
    const res = await updateWorkExperienceAction(updated);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setWorkExperience(updated);
    }
  };

  return (
    <Card variant="glass" className="profile-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
        <h2 className="section-title-sm" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={18} style={{ color: 'var(--neon-purple)' }} /> Work Experience
        </h2>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={handleOpenAdd} style={{ color: 'var(--neon-purple)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={14} /> Add Experience
          </Button>
        )}
      </div>

      {error && <p style={{ color: 'var(--neon-red)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-sm)' }}>{error}</p>}

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', padding: 'var(--space-md)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
          <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--neon-purple)' }}>
            {editingId ? 'Edit Work Experience' : 'Add New Work Experience'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            <Input 
              placeholder="Title / Role (e.g. Software Engineer Intern)" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              disabled={isLoading}
            />
            <Input 
              placeholder="Company / Organization" 
              value={company} 
              onChange={e => setCompany(e.target.value)} 
              disabled={isLoading}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <Input 
              placeholder="Start Date (e.g. Jun 2023)" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              disabled={isLoading}
            />
            <Input 
              placeholder="End Date (e.g. Dec 2023)" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              disabled={isLoading || current}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input 
                type="checkbox" 
                checked={current} 
                onChange={e => setCurrent(e.target.checked)} 
                disabled={isLoading}
              />
              Currently Work Here
            </label>
          </div>
          <div>
            <textarea
              placeholder="Description / Responsibilities / Key Projects"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
              style={{
                width: '100%',
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: 'var(--text-sm)'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
            <Button size="sm" onClick={handleSaveItem} isLoading={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--neon-purple)', color: '#fff' }}>
              <Save size={14} /> Save Experience
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isLoading}>
              <X size={14} /> Cancel
            </Button>
          </div>
        </div>
      ) : workExperience.length === 0 ? (
        <div style={{ padding: 'var(--space-md)', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--glass-border)' }}>
          <p className="text-muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>No work experience or internships added yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {workExperience.map(w => (
            <div 
              key={w.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: 'var(--space-md)',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--neon-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                  <Building2 size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{w.title}</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--neon-purple)', fontWeight: 600 }}>{w.company}</p>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {w.startDate} {w.startDate && (w.endDate || w.current) ? '–' : ''} {w.current ? 'Present' : w.endDate}
                  </div>
                  {w.description && (
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                      {w.description}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(w)} disabled={isLoading} style={{ padding: '6px' }}>
                  <Edit3 size={14} style={{ color: 'var(--text-secondary)' }} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(w.id)} disabled={isLoading} style={{ padding: '6px' }}>
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
