'use client';

import React, { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Button from './Button';
import { Image as ImageIcon } from 'lucide-react';

interface ImageUploadButtonProps {
  onUpload: (markdownImage: string) => void;
  bucketName?: string;
  iconOnly?: boolean;
}

export default function ImageUploadButton({ 
  onUpload, 
  bucketName = 'doubts_media',
  iconOnly = false
}: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    try {
      setIsUploading(true);
      const supabase = createClient();
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      const markdown = `![Image](${publicUrl})`;
      onUpload(markdown);
      
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(error.message || 'Error uploading image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
      <button 
        type="button" 
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        title="Attach Image"
        style={
          iconOnly 
          ? { background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%', transition: 'background 0.2s ease', opacity: isUploading ? 0.5 : 1 }
          : { background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: 'var(--radius-sm)', opacity: isUploading ? 0.5 : 1 }
        }
      >
        {isUploading ? <span className="spinner" style={{ width: '16px', height: '16px' }} /> : <ImageIcon size={20} />}
        {!iconOnly && <span>Attach Image</span>}
      </button>
    </div>
  );
}
