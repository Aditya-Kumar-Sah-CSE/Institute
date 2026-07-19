'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Video, Type, X, ChevronRight, UploadCloud, Loader2 } from 'lucide-react';
import { uploadFiles } from '@/lib/attachments';
import { createClient } from '@/lib/supabase/client';
import { createStoryItem } from '@/features/stories/actions/stories';

interface StoryComposerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryAdded: () => void;
}

export default function StoryComposerSheet({ isOpen, onClose, onStoryAdded }: StoryComposerSheetProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    // Simplistic handling for Demo purposes, multiple files allowed and queued
    try {
      setIsUploading(true);
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated user");

      const { urls, errors } = await uploadFiles({
        files,
        supabase,
        bucketName: 'story_media',
        pathPrefix: user.id
      });

      if (urls.length > 0) {
        for (let i = 0; i < urls.length; i++) {
           const file = files[i];
           const isVideo = file.type.startsWith('video/');
           await createStoryItem({
             mediaUrl: urls[i],
             thumbnailUrl: null, // Need ffmpeg processing for thumbs natively, dropping for prototype simplicity
             mediaType: isVideo ? 'video' : 'image',
             caption: '', // Additional step to open a caption editor could be injected here
           });
        }
        onStoryAdded(); // trigger sync
        onClose(); 
      }
      
      if (errors.length) {
         alert('Some files failed to upload to story_media bucket');
      }

    } catch (err: any) {
      console.error(err);
      alert('Upload initialization failed.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isUploading ? onClose : undefined}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />
          
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-slate-100 dark:bg-slate-900 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-[201] overflow-hidden flex flex-col"
          >
            {/* Handle Bar */}
            <div className="w-full flex justify-center pt-3 pb-2 touch-none">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>
            
            <div className="p-6 pt-2">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-purple">
                  Create Status
                </h2>
                <button onClick={onClose} disabled={isUploading} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                   <X size={20} />
                </button>
              </div>

              {isUploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 0', gap: '1rem' }}>
                   <Loader2 size={40} className="text-cyan-500 animate-spin" />
                   <p className="text-slate-600 dark:text-slate-300 font-medium">Uploading media securely...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', padding: '1rem 0' }}>
                  
                  {/* Photo/Video Gallery Icon */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <button 
                      onClick={() => fileInputRef.current?.click()} 
                      style={{ width: '4rem', height: '4rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #a5f3fc', backgroundColor: 'rgba(207, 250, 254, 0.4)' }}
                      className="hover:scale-105 active:scale-95 transition-all shadow-sm"
                    >
                      <ImageIcon className="text-cyan-600 dark:text-cyan-400" size={32} />
                    </button>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }} className="text-slate-600 dark:text-slate-400">Gallery</span>
                  </div>

                  <input 
                    type="file" 
                    accept="image/*,video/*" 
                    multiple 
                    style={{ display: 'none' }} 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                  />

                  {/* Text Status Icon */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <button 
                      onClick={() => alert('Text composer view coming shortly')} 
                      style={{ width: '4rem', height: '4rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #e9d5ff', backgroundColor: 'rgba(243, 232, 255, 0.4)' }}
                      className="hover:scale-105 active:scale-95 transition-all shadow-sm"
                    >
                      <Type className="text-purple-600 dark:text-purple-400" size={32} />
                    </button>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }} className="text-slate-600 dark:text-slate-400">Text</span>
                  </div>

                </div>
              )}
            </div>
            
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
