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
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: 'var(--space-lg)' 
      }}>
        {faculty.map(fac => (
          <Link href={`/users/${fac.id}`} key={fac.id} style={{ textDecoration: 'none' }}>
            <Card variant="glass" padding="md" className="hover-lift" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', textAlign: 'left', gap: 'var(--space-md)' }}>
              <div style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--glass-border)', flexShrink: 0 }}>
                {fac.avatar_url ? (
                  <Image src={fac.avatar_url} alt={fac.name || 'Faculty'} fill style={{ objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', background: 'var(--bg-elevated)', color: 'var(--neon-cyan)' }}>
                    <User size={24} opacity={0.5} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 'var(--text-lg)', margin: 0, color: 'var(--text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fac.name || 'Unknown'}</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textTransform: 'capitalize', marginTop: '2px' }}>
                  {fac.role}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
