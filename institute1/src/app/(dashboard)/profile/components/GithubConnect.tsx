'use client';

import React, { useState } from 'react';
import { updateGithubUsername } from '@/features/auth/actions/auth';
import { checkBadges } from '@/features/gamification/actions/gamification';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface GithubConnectProps {
  userId: string;
  initialUsername?: string | null;
}

export default function GithubConnect({ userId, initialUsername }: GithubConnectProps) {
  const [username, setUsername] = useState(initialUsername || '');
  const [isEditing, setIsEditing] = useState(!initialUsername);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSave = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const cleanUsername = username.replace('https://github.com/', '').replace('@', '').trim();
      const result = await updateGithubUsername(userId, cleanUsername);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Also trigger badge check just in case
      await checkBadges(userId);
      
      setIsEditing(false);
      setUsername(cleanUsername);
      router.refresh(); // Refresh to update XP and badges on profile page
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update GitHub profile';
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
            name="github"
            placeholder="GitHub Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            icon="🧑‍💻"
          />
          {error && <p className="text-sm text-neon-red" style={{ color: 'var(--neon-red)', fontSize: 'var(--text-sm)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button onClick={handleSave} isLoading={isLoading} size="sm" fullWidth>
              Save Profile
            </Button>
            {initialUsername && (
              <Button variant="ghost" onClick={() => {
                setUsername(initialUsername);
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
            <span style={{ fontSize: '1.2rem' }}>🧑‍💻</span>
            <div>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Connected as</p>
              <a 
                href={`https://github.com/${username}`} 
                target="_blank" 
                rel="noreferrer"
                style={{ color: 'var(--neon-cyan)', fontWeight: 'var(--weight-semibold)', textDecoration: 'none' }}
              >
                @{username}
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
