'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { updateAvatarUrl, uploadAvatarToServer } from '@/features/auth/actions/auth';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import UserAvatar from '@/components/shared/UserAvatar';
import { User } from 'lucide-react';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  name: string;
}

export default function AvatarUpload({ userId, currentAvatarUrl, name }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPG, PNG, and WebP are allowed');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setIsPreviewOpen(false); // Close preview if open
      
      const formData = new FormData();
      formData.append('file', file);
      
      const result = await uploadAvatarToServer(formData);
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Refresh to show new avatar
      router.refresh();
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Failed to upload image';
      setError(errMsg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    try {
      setIsUploading(true);
      setError(null);
      
      // We don't necessarily need to delete from storage immediately to keep history,
      // but we update the profile to remove the avatar_url
      const result = await updateAvatarUrl(userId, "");
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setIsPreviewOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Failed to remove image';
      setError(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarClick = () => {
    if (isUploading) return;
    
    if (currentAvatarUrl) {
      setIsPreviewOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <div className="avatar-upload-container">
        <div 
          className="profile-avatar-large clickable"
          onClick={handleAvatarClick}
        >
          {isUploading && (
            <div className="avatar-upload-overlay">
              <span className="spinner-small" />
            </div>
          )}
          
          {currentAvatarUrl ? (
            <div style={{ position: 'relative', width: '100%', height: '100%', opacity: isUploading ? 0.5 : 1 }}>
              <UserAvatar url={currentAvatarUrl} name={name} size={120} />
            </div>
          ) : (
            <span className={`profile-avatar-fallback`} style={{ opacity: isUploading ? 0.5 : 1 }}>
              <User size={64} opacity={0.5} />
            </span>
          )}
          
          {!isUploading && !currentAvatarUrl && (
            <div className="avatar-hover-overlay">
              <span>📷</span>
            </div>
          )}
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/webp"
          style={{ display: 'none' }}
        />
        
        {error && <p className="avatar-error">{error}</p>}
      </div>

      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Profile Picture" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-xl)' }}>
          {currentAvatarUrl && (
            <div style={{ position: 'relative', width: '280px', height: '280px', borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--neon-cyan)', boxShadow: 'var(--glow-cyan-strong)' }}>
               <UserAvatar url={currentAvatarUrl} name={name} size={280} />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', width: '100%' }}>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Change Image
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isUploading}>
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
