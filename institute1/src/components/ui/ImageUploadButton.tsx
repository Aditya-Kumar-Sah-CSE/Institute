'use client';

import React, { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Button from './Button';

interface ImageUploadButtonProps {
  onUpload: (markdownImage: string) => void;
  bucketName?: string;
}

export default function ImageUploadButton({ 
  onUpload, 
  bucketName = 'doubts_media' 
}: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
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

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      // Create markdown string
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
      <Button 
        type="button" 
        variant="secondary" 
        onClick={() => fileInputRef.current?.click()}
        isLoading={isUploading}
        style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        📷 Attach Image
      </Button>
    </div>
  );
}
