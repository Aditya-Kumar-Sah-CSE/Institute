'use client';

import React, { useState } from 'react';
import { updateSkillsAndInterestsAction } from '@/features/profile/actions/profile';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Code2, Heart, Plus, X, Tag } from 'lucide-react';

interface TagsManagerProps {
  initialSkills?: string[];
  initialInterests?: string[];
}

const POPULAR_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Java', 'C++', 'SQL', 'Next.js', 
  'Tailwind CSS', 'Docker', 'Git', 'Data Structures', 'Algorithms', 'PostgreSQL'
];

const POPULAR_INTERESTS = [
  'Web Development', 'Artificial Intelligence', 'Machine Learning', 'Cybersecurity', 
  'Cloud Computing', 'Competitive Programming', 'Mobile App Dev', 'Open Source', 'UI/UX Design'
];

export default function TagsManager({ 
  initialSkills = [], 
  initialInterests = [] 
}: TagsManagerProps) {
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [interests, setInterests] = useState<string[]>(initialInterests);
  
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const saveTags = async (newSkills: string[], newInterests: string[]) => {
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    const res = await updateSkillsAndInterestsAction(newSkills, newInterests);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSkills(newSkills);
      setInterests(newInterests);
      setSuccessMsg('Tags updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleAddSkill = (tagToAdd?: string) => {
    const val = (tagToAdd || skillInput).trim().replace(/,/g, '');
    if (!val) return;
    if (skills.some(s => s.toLowerCase() === val.toLowerCase())) {
      setSkillInput('');
      return;
    }
    const updated = [...skills, val];
    setSkillInput('');
    saveTags(updated, interests);
  };

  const handleRemoveSkill = (tagToRemove: string) => {
    const updated = skills.filter(s => s !== tagToRemove);
    saveTags(updated, interests);
  };

  const handleAddInterest = (tagToAdd?: string) => {
    const val = (tagToAdd || interestInput).trim().replace(/,/g, '');
    if (!val) return;
    if (interests.some(i => i.toLowerCase() === val.toLowerCase())) {
      setInterestInput('');
      return;
    }
    const updated = [...interests, val];
    setInterestInput('');
    saveTags(skills, updated);
  };

  const handleRemoveInterest = (tagToRemove: string) => {
    const updated = interests.filter(i => i !== tagToRemove);
    saveTags(skills, updated);
  };

  return (
    <Card variant="glass" className="profile-section">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* SKILLS SECTION */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
            <h2 className="section-title-sm" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code2 size={18} style={{ color: 'var(--neon-cyan)' }} /> Technical Skills
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{skills.length} skills</span>
          </div>

          {/* Skill Tag Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 'var(--space-sm)' }}>
            {skills.map(skill => (
              <span 
                key={skill}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  color: 'var(--neon-cyan)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600
                }}
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  disabled={isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--neon-cyan)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    opacity: 0.8
                  }}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {skills.length === 0 && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No skills added yet. Add skills below.
              </span>
            )}
          </div>

          {/* Skill Input */}
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            <Input 
              placeholder="Add a skill (e.g. Python, React) and press Enter"
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              disabled={isLoading}
            />
            <Button size="sm" onClick={() => handleAddSkill()} disabled={isLoading || !skillInput.trim()}>
              <Plus size={14} /> Add
            </Button>
          </div>

          {/* Quick Skill Suggestions */}
          <div style={{ marginTop: 'var(--space-xs)', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>Suggestions:</span>
            {POPULAR_SKILLS.filter(s => !skills.includes(s)).slice(0, 6).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleAddSkill(s)}
                disabled={isLoading}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                + {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--glass-border)' }} />

        {/* INTERESTS SECTION */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
            <h2 className="section-title-sm" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={18} style={{ color: 'var(--neon-pink)' }} /> Interests & Domains
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{interests.length} interests</span>
          </div>

          {/* Interest Tag Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 'var(--space-sm)' }}>
            {interests.map(interest => (
              <span 
                key={interest}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  background: 'rgba(236, 72, 153, 0.12)',
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                  color: 'var(--neon-pink)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600
                }}
              >
                {interest}
                <button
                  type="button"
                  onClick={() => handleRemoveInterest(interest)}
                  disabled={isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--neon-pink)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    opacity: 0.8
                  }}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {interests.length === 0 && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                No interest domains added yet. Add domains below.
              </span>
            )}
          </div>

          {/* Interest Input */}
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            <Input 
              placeholder="Add an interest domain (e.g. AI/ML, Web Dev) and press Enter"
              value={interestInput}
              onChange={e => setInterestInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  handleAddInterest();
                }
              }}
              disabled={isLoading}
            />
            <Button size="sm" onClick={() => handleAddInterest()} disabled={isLoading || !interestInput.trim()} style={{ backgroundColor: 'var(--neon-pink)', color: '#fff' }}>
              <Plus size={14} /> Add
            </Button>
          </div>

          {/* Quick Interest Suggestions */}
          <div style={{ marginTop: 'var(--space-xs)', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>Suggestions:</span>
            {POPULAR_INTERESTS.filter(i => !interests.includes(i)).slice(0, 5).map(i => (
              <button
                key={i}
                type="button"
                onClick={() => handleAddInterest(i)}
                disabled={isLoading}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                + {i}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={{ color: 'var(--neon-red)', fontSize: 'var(--text-sm)', margin: 0 }}>{error}</p>}
        {successMsg && <p style={{ color: '#10b981', fontSize: 'var(--text-sm)', margin: 0 }}>{successMsg}</p>}
      </div>
    </Card>
  );
}
