'use client';

import React, { useState } from 'react';
import { updateAcademicInfo } from '@/features/auth/actions/auth';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface AcademicInfoConnectProps {
  userId: string;
  initialGraduationPeriod?: string | null;
  initialCgpa?: number | null;
  initialSgpa?: Record<string, number> | null;
}

export default function AcademicInfoConnect({ 
  userId, 
  initialGraduationPeriod, 
  initialCgpa, 
  initialSgpa 
}: AcademicInfoConnectProps) {
  const [graduationPeriod, setGraduationPeriod] = useState(initialGraduationPeriod || '');
  const [cgpa, setCgpa] = useState(initialCgpa ? initialCgpa.toString() : '');
  const [sgpa, setSgpa] = useState<Record<string, string>>(
    initialSgpa ? Object.fromEntries(Object.entries(initialSgpa).map(([k, v]) => [k, v.toString()])) : {}
  );
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSave = async () => {
    setIsLoading(true);
    setError('');

    try {
      const parsedCgpa = cgpa ? parseFloat(cgpa) : undefined;
      if (cgpa && isNaN(parsedCgpa!)) throw new Error("Invalid CGPA");

      const parsedSgpa: Record<string, number> = {};
      for (const [sem, val] of Object.entries(sgpa)) {
        if (val.trim() === '') continue;
        const num = parseFloat(val);
        if (isNaN(num)) throw new Error(`Invalid SGPA for ${sem}`);
        parsedSgpa[sem] = num;
      }

      const result = await updateAcademicInfo(userId, {
        graduation_period: graduationPeriod.trim() || undefined,
        cgpa: parsedCgpa,
        sgpa: parsedSgpa
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update academic info';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSgpaChange = (semester: number, value: string) => {
    setSgpa(prev => ({ ...prev, [`sem${semester}`]: value }));
  };

  const hasData = !!initialGraduationPeriod || !!initialCgpa || (initialSgpa && Object.keys(initialSgpa).length > 0);

  return (
    <div className="flex flex-col gap-sm" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
            <Input 
              name="graduation_period"
              placeholder="Graduation Period (e.g. 2024-2028)"
              value={graduationPeriod}
              onChange={(e) => setGraduationPeriod(e.target.value)}
              disabled={isLoading}
              icon="🎓"
            />
            <Input 
              name="cgpa"
              placeholder="CGPA"
              type="number"
              step="0.01"
              value={cgpa}
              onChange={(e) => setCgpa(e.target.value)}
              disabled={isLoading}
              icon="📊"
            />
            
            <div style={{ marginTop: 'var(--space-xs)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>Semester SGPA</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xs)' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <Input 
                    key={sem}
                    name={`sem${sem}`}
                    placeholder={`Sem ${sem}`}
                    type="number"
                    step="0.01"
                    value={sgpa[`sem${sem}`] || ''}
                    onChange={(e) => handleSgpaChange(sem, e.target.value)}
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-neon-red" style={{ color: 'var(--neon-red)', fontSize: 'var(--text-sm)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button onClick={handleSave} isLoading={isLoading} size="sm" fullWidth>
              Save Details
            </Button>
            <Button variant="ghost" onClick={() => {
              setGraduationPeriod(initialGraduationPeriod || '');
              setCgpa(initialCgpa ? initialCgpa.toString() : '');
              setSgpa(initialSgpa ? Object.fromEntries(Object.entries(initialSgpa).map(([k, v]) => [k, v.toString()])) : {});
              setIsEditing(false);
              setError('');
            }} disabled={isLoading} size="sm">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: 'var(--space-md)',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--glass-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span style={{ fontSize: '1.2rem' }}>📚</span>
            <div>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Academic Info</p>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--neon-cyan)', fontWeight: 'var(--weight-semibold)' }}>
                {hasData ? (initialCgpa ? `${initialCgpa} CGPA` : 'Added') : 'Not added'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            {hasData ? 'Edit' : 'Add Details'}
          </Button>
        </div>
      )}
    </div>
  );
}
