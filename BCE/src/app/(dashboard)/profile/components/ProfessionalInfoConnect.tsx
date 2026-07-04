'use client';

import React, { useState } from 'react';
import { updateProfessionalInfo } from '@/features/auth/actions/auth';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Briefcase, GraduationCap, ScrollText, Building2 } from 'lucide-react';

interface ProfessionalInfoConnectProps {
  userId: string;
  initialProfessionalDetails?: any;
}

export default function ProfessionalInfoConnect({ 
  userId, 
  initialProfessionalDetails 
}: ProfessionalInfoConnectProps) {
  const [phdDetails, setPhdDetails] = useState(initialProfessionalDetails?.phd_details || '');
  const [mtechDetails, setMtechDetails] = useState(initialProfessionalDetails?.mtech_details || '');
  const [btechDetails, setBtechDetails] = useState(initialProfessionalDetails?.btech_details || '');
  const [experienceYears, setExperienceYears] = useState(initialProfessionalDetails?.experience_years ? initialProfessionalDetails.experience_years.toString() : '');
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSave = async () => {
    setIsLoading(true);
    setError('');

    try {
      const parsedExp = experienceYears ? parseInt(experienceYears, 10) : null;
      if (experienceYears && isNaN(parsedExp!)) throw new Error("Invalid Experience Years");

      const result = await updateProfessionalInfo(userId, {
        phd_details: phdDetails.trim() || null,
        mtech_details: mtechDetails.trim() || null,
        btech_details: btechDetails.trim() || null,
        experience_years: parsedExp
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update professional info';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const hasData = !!phdDetails || !!mtechDetails || !!btechDetails || !!experienceYears;

  return (
    <div className="flex flex-col gap-sm" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
            <Input 
              name="experience_years"
              placeholder="Years of Experience (e.g. 10)"
              type="number"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              disabled={isLoading}
              icon={<Briefcase size={16} />}
            />
            <Input 
              name="phd_details"
              placeholder="PhD Details (e.g. PhD from IIT Delhi in 2015)"
              value={phdDetails}
              onChange={(e) => setPhdDetails(e.target.value)}
              disabled={isLoading}
              icon={<GraduationCap size={16} />}
            />
            <Input 
              name="mtech_details"
              placeholder="MTech Details (e.g. MTech from IIT Kanpur in 2011)"
              value={mtechDetails}
              onChange={(e) => setMtechDetails(e.target.value)}
              disabled={isLoading}
              icon={<ScrollText size={16} />}
            />
            <Input 
              name="btech_details"
              placeholder="BTech Details (e.g. BTech from NIT Trichy in 2009)"
              value={btechDetails}
              onChange={(e) => setBtechDetails(e.target.value)}
              disabled={isLoading}
              icon={<Building2 size={16} />}
            />
          </div>
          {error && <p className="text-sm text-neon-red" style={{ color: 'var(--neon-red)', fontSize: 'var(--text-sm)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button onClick={handleSave} isLoading={isLoading} size="sm" fullWidth>
              Save Details
            </Button>
            <Button variant="ghost" onClick={() => {
              setPhdDetails(initialProfessionalDetails?.phd_details || '');
              setMtechDetails(initialProfessionalDetails?.mtech_details || '');
              setBtechDetails(initialProfessionalDetails?.btech_details || '');
              setExperienceYears(initialProfessionalDetails?.experience_years ? initialProfessionalDetails.experience_years.toString() : '');
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
            <span style={{ color: 'var(--neon-cyan)', display: 'flex' }}><Briefcase size={20} /></span>
            <div>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Professional Background</p>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--neon-cyan)', fontWeight: 'var(--weight-semibold)' }}>
                {hasData ? (experienceYears ? `${experienceYears} Years Exp.` : 'Added') : 'Not added'}
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
