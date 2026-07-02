'use client';

import React, { useState } from 'react';
import { updateLinkedinUrl } from '@/features/auth/actions/auth';
import { checkBadges } from '@/features/gamification/actions/gamification';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const LinkedinIcon = ({ size = 24 }: { size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

interface LinkedinConnectProps {
  userId: string;
  initialUrl?: string | null;
}

export default function LinkedinConnect({ userId, initialUrl }: LinkedinConnectProps) {
  const [url, setUrl] = useState(initialUrl || '');
  const [isEditing, setIsEditing] = useState(!initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSave = async () => {
    if (!url.trim()) {
      setError('Please enter your LinkedIn URL');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      let cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = `https://${cleanUrl}`;
      }
      const result = await updateLinkedinUrl(userId, cleanUrl);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Also trigger badge check just in case
      await checkBadges(userId);
      
      setIsEditing(false);
      setUrl(cleanUrl);
      router.refresh(); // Refresh to update XP and badges on profile page
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update LinkedIn profile';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-sm" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <Input 
            name="linkedin"
            placeholder="LinkedIn Profile URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            icon={<LinkedinIcon size={16} />}
          />
          {error && <p className="text-sm text-neon-red" style={{ color: 'var(--neon-red)', fontSize: 'var(--text-sm)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button onClick={handleSave} isLoading={isLoading} size="sm" fullWidth>
              Save Profile
            </Button>
            {initialUrl && (
              <Button variant="ghost" onClick={() => {
                setUrl(initialUrl);
                setIsEditing(false);
                setError('');
              }} disabled={isLoading} size="sm">
                Cancel
              </Button>
            )}
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
            <span style={{ color: 'var(--neon-cyan)', display: 'flex' }}><LinkedinIcon size={20} /></span>
            <div>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Connected as</p>
              <a 
                href={url} 
                target="_blank" 
                rel="noreferrer"
                style={{ color: 'var(--neon-cyan)', fontWeight: 'var(--weight-semibold)', textDecoration: 'none' }}
              >
                LinkedIn Profile
              </a>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        </div>
      )}
    </div>
  );
}
