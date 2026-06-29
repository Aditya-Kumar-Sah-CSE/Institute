'use client';

import React, { useState } from 'react';
import { updateSocialLinks } from '@/features/auth/actions/auth';
import { checkBadges } from '@/features/gamification/actions/gamification';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface SocialLinksConnectProps {
  userId: string;
  initialLinks?: Record<string, string> | null;
}

const PLATFORMS = [
  { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
  { id: 'x', name: 'X (Twitter)', icon: '🐦' },
  { id: 'codechef', name: 'CodeChef', icon: '👨‍🍳' },
  { id: 'codeforces', name: 'Codeforces', icon: '📊' },
  { id: 'leetcode', name: 'LeetCode', icon: '💻' },
  { id: 'gfg', name: 'GeeksforGeeks', icon: '🤓' },
  { id: 'codingninjas', name: 'Coding Ninjas', icon: '🥷' },
  { id: 'codolio', name: 'Codolio', icon: '🏆' },
  { id: 'youtube', name: 'YouTube', icon: '📺' },
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'discord', name: 'Discord', icon: '💬' },
  { id: 'facebook', name: 'Facebook', icon: '📘' }
];

export default function SocialLinksConnect({ userId, initialLinks }: SocialLinksConnectProps) {
  const [links, setLinks] = useState<Record<string, string>>(initialLinks || {});
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSave = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Remove empty values
      const cleanLinks = Object.fromEntries(
        Object.entries(links).filter(([_, v]) => v.trim() !== '')
      );

      const result = await updateSocialLinks(userId, cleanLinks);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Also trigger badge check just in case
      await checkBadges(userId);
      
      setIsEditing(false);
      setLinks(cleanLinks);
      router.refresh();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update social profiles';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkChange = (platformId: string, value: string) => {
    setLinks(prev => ({ ...prev, [platformId]: value }));
  };

  const savedCount = Object.keys(initialLinks || {}).length;

  return (
    <div className="flex flex-col gap-sm" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
            {PLATFORMS.map(platform => (
              <Input 
                key={platform.id}
                name={platform.id}
                placeholder={`${platform.name} Profile URL`}
                value={links[platform.id] || ''}
                onChange={(e) => handleLinkChange(platform.id, e.target.value)}
                disabled={isLoading}
                icon={platform.icon}
              />
            ))}
          </div>
          {error && <p className="text-sm text-neon-red" style={{ color: 'var(--neon-red)', fontSize: 'var(--text-sm)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button onClick={handleSave} isLoading={isLoading} size="sm" fullWidth>
              Save Profiles
            </Button>
            <Button variant="ghost" onClick={() => {
              setLinks(initialLinks || {});
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
            <span style={{ fontSize: '1.2rem' }}>🌐</span>
            <div>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Other Profiles</p>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--neon-cyan)', fontWeight: 'var(--weight-semibold)' }}>
                {savedCount > 0 ? `${savedCount} linked` : 'None linked'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            {savedCount > 0 ? 'Edit' : 'Add Profiles'}
          </Button>
        </div>
      )}
    </div>
  );
}
