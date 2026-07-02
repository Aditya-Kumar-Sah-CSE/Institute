import React from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Image from 'next/image';
import { User } from 'lucide-react';

interface Faculty {
  id: string;
  name: string | null;
  avatar_url: string | null;
  role: string;
  institute_id: string | null;
}

interface FacultySectionProps {
  faculty: Faculty[];
}

export default function FacultySection({ faculty }: FacultySectionProps) {
  if (!faculty || faculty.length === 0) return null;

  return (
    <div style={{ marginTop: 'var(--space-2xl)', marginBottom: 'var(--space-2xl)' }}>
      <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-lg)' }}>Meet Your Faculty</h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: 'var(--space-lg)' 
      }}>
        {faculty.map(fac => (
          <Link href={`/users/${fac.id}`} key={fac.id} style={{ textDecoration: 'none' }}>
            <Card variant="glass" padding="md" className="hover-lift" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--space-sm)' }}>
              <div style={{ position: 'relative', width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--glass-border)' }}>
                {fac.avatar_url ? (
                  <Image src={fac.avatar_url} alt={fac.name || 'Faculty'} fill style={{ objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: 'var(--bg-elevated)', color: 'var(--neon-cyan)' }}>
                    <User size={32} opacity={0.5} />
                  </div>
                )}
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', margin: 0, color: 'var(--text-primary)' }}>{fac.name || 'Unknown'}</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'capitalize', marginTop: '4px' }}>
                  {fac.role}
                </p>
                {fac.institute_id && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--neon-cyan)', marginTop: '4px' }}>
                    ID: {fac.institute_id}
                  </p>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
