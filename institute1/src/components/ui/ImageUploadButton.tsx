'use client';

import React, { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Button from './Button';
import { Image as ImageIcon } from 'lucide-react';
import { uploadFiles } from '@/lib/attachments';

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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxFiles = 5;
    if (files.length > maxFiles) {
      alert(`You can only attach up to ${maxFiles} images at once.`);
      return;
    }

    const invalidType = files.some(f => !f.type.startsWith('image/'));
    if (invalidType) {
      alert('Please upload only image files.');
      return;
    }

    try {
      setIsUploading(true);
      const supabase = createClient();
      
      const { urls, errors } = await uploadFiles({
        files,
        supabase,
        bucketName
      });

      if (errors.length > 0) {
         console.error('Errors during image upload:', errors);
      }

      if (urls.length > 0) {
        const markdown = urls.map(url => `![Image](${url})`).join('\n\n');
        onUpload(markdown);
      } else {
        if (errors.length > 0) alert('Images failed to upload.');
      }
      
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
        multiple
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
