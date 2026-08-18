'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Smile, Paperclip, Image as ImageIcon, Video as VideoIcon, 
  FileText, Camera, Mic, Trash2, X, Loader2, Play, Square, Check
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ChatComposerProps {
  msgInput: string;
  setMsgInput: (val: string) => void;
  handleSend: (content: string, attachmentType?: string, attachmentLink?: string) => Promise<void>;
  isSomeoneTyping: boolean;
  replyToMessage?: any;
  onCancelReply?: () => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '👏', '😮', '🙌', '💯', '🚀', '✅', '✨', '💡', '🙏', '😍', '🤔'];

export default function ChatComposer({
  msgInput,
  setMsgInput,
  handleSend,
  isSomeoneTyping,
  replyToMessage,
  onCancelReply
}: ChatComposerProps) {
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [stagedAttachment, setStagedAttachment] = useState<{ file: File; type: string; previewUrl: string } | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [msgInput]);

  // Audio recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>, forcedType?: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    let type = forcedType || 'file';
    if (!forcedType) {
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';
      else if (file.type === 'application/pdf') type = 'pdf';
      else type = 'file';
    }

    const previewUrl = URL.createObjectURL(file);
    setStagedAttachment({ file, type, previewUrl });
    setShowAttachmentMenu(false);
  };

  const uploadFileToSupabase = async (file: File, type: string): Promise<string> => {
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'dat';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = `chat/${type}s/${filename}`;

    setIsUploading(true);
    setUploadProgress(20);

    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(filePath, file, { upsert: true });

    if (error) {
      // Fallback to lesson_notes bucket if attachments doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from('lesson_notes')
        .upload(filePath, file, { upsert: true });

      if (fallbackError) {
        setIsUploading(false);
        throw new Error(fallbackError.message);
      }
      setUploadProgress(100);
      setIsUploading(false);
      return supabase.storage.from('lesson_notes').getPublicUrl(fallbackData.path).data.publicUrl;
    }

    setUploadProgress(100);
    setIsUploading(false);
    return supabase.storage.from('attachments').getPublicUrl(data.path).data.publicUrl;
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access denied or not supported.');
    }
  };

  const stopAndSendVoiceRecording = async () => {
    if (!mediaRecorderRef.current) return;
    setIsRecording(false);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      
      try {
        const publicUrl = await uploadFileToSupabase(audioFile, 'audio');
        await handleSend('🎤 Voice Message', 'audio', publicUrl);
      } catch (err: any) {
        alert('Voice message upload failed: ' + err.message);
      }
    };

    mediaRecorderRef.current.stop();
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const onSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;

    let attachmentUrl: string | undefined = undefined;
    let attachmentType: string | undefined = undefined;

    if (stagedAttachment) {
      try {
        attachmentUrl = await uploadFileToSupabase(stagedAttachment.file, stagedAttachment.type);
        attachmentType = stagedAttachment.type;
      } catch (err: any) {
        alert('File upload failed: ' + err.message);
        return;
      }
    }

    if (!msgInput.trim() && !attachmentUrl) return;

    const contentToSend = msgInput;
    setMsgInput('');
    setStagedAttachment(null);
    setShowEmojiPicker(false);
    setShowAttachmentMenu(false);

    await handleSend(contentToSend, attachmentType, attachmentUrl);
  };

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-divider)',
      position: 'relative',
      zIndex: 20
    }}>
      {/* Hidden Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={(e) => handleFileSelected(e)} 
      />
      <input 
        type="file" 
        ref={cameraInputRef} 
        accept="image/*" 
        capture="environment" 
        style={{ display: 'none' }} 
        onChange={(e) => handleFileSelected(e, 'image')} 
      />

      {/* Typing indicator */}
      {isSomeoneTyping && (
        <div style={{
          position: 'absolute',
          top: '-32px',
          left: '20px',
          fontSize: '12px',
          color: 'var(--neon-cyan)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--bg-card)',
          padding: '4px 12px',
          borderRadius: '12px 12px 0 0',
          border: '1px solid var(--border-divider)',
          borderBottom: 'none'
        }}>
          <Loader2 size={12} className="animate-spin" />
          <span>Someone is typing...</span>
        </div>
      )}

      {/* Reply Quoted Preview Bar */}
      {replyToMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'var(--bg-elevated)',
          borderLeft: '4px solid var(--neon-cyan)',
          borderRadius: '8px',
          marginBottom: '8px',
          fontSize: '12px'
        }}>
          <div>
            <div style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>
              Replying to {replyToMessage.sender?.name || 'Message'}
            </div>
            <div style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
              {replyToMessage.content || '[Attachment]'}
            </div>
          </div>
          <button onClick={onCancelReply} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Staged Attachment Preview Bar */}
      {stagedAttachment && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          marginBottom: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {stagedAttachment.type === 'image' ? (
              <img src={stagedAttachment.previewUrl} alt="preview" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
            ) : stagedAttachment.type === 'video' ? (
              <video src={stagedAttachment.previewUrl} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
            ) : (
              <FileText size={28} color="var(--neon-cyan)" />
            )}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {stagedAttachment.file.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {(stagedAttachment.file.size / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>
          </div>

          {isUploading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--neon-cyan)' }}>
              <Loader2 size={16} className="animate-spin" /> Uploading...
            </div>
          ) : (
            <button onClick={() => setStagedAttachment(null)} style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          )}
        </div>
      )}

      {/* Voice Recording Mode */}
      {isRecording ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 59, 48, 0.1)',
          border: '1px solid rgba(255, 59, 48, 0.3)',
          borderRadius: '24px',
          padding: '10px 18px',
          color: '#ff3b30'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff3b30', animation: 'pulse 1s infinite' }} />
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Recording {formatRecordingTime(recordingTime)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={cancelVoiceRecording}
              style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', padding: 6 }}
              title="Cancel Recording"
            >
              <Trash2 size={20} />
            </button>

            <button
              type="button"
              onClick={stopAndSendVoiceRecording}
              style={{
                background: '#ff3b30',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Send Voice Message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      ) : (
        /* Normal Composer Bar */
        <form onSubmit={onSubmitMessage} style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {/* Emoji Popover */}
          {showEmojiPicker && (
            <div style={{
              position: 'absolute',
              bottom: '56px',
              left: '0',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: '16px',
              padding: '12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              zIndex: 30
            }}>
              {COMMON_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setMsgInput(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Attachment Menu Popover */}
          {showAttachmentMenu && (
            <div style={{
              position: 'absolute',
              bottom: '56px',
              left: '36px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: '16px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              zIndex: 30,
              minWidth: '160px'
            }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px', fontSize: '13px' }}
              >
                <ImageIcon size={18} color="var(--neon-cyan)" /> Image / Video
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px', fontSize: '13px' }}
              >
                <Camera size={18} color="var(--neon-pink)" /> Camera
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px', fontSize: '13px' }}
              >
                <FileText size={18} color="var(--neon-gold)" /> Document
              </button>
            </div>
          )}

          {/* Emoji Toggle */}
          <button 
            type="button" 
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachmentMenu(false);
            }}
            style={{ padding: '8px', background: 'transparent', border: 'none', color: showEmojiPicker ? 'var(--neon-cyan)' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            <Smile size={22} />
          </button>
          
          {/* Attachment Toggle */}
          <button 
            type="button" 
            onClick={() => {
              setShowAttachmentMenu(!showAttachmentMenu);
              setShowEmojiPicker(false);
            }}
            style={{ padding: '8px', background: 'transparent', border: 'none', color: showAttachmentMenu ? 'var(--neon-cyan)' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            <Paperclip size={22} />
          </button>

          {/* Auto-expanding Input Area */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <textarea 
              ref={textareaRef}
              rows={1}
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmitMessage(e);
                }
              }}
              placeholder="Type a message..."
              style={{ 
                width: '100%', 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: '20px', 
                padding: '10px 18px', 
                outline: 'none', 
                color: 'var(--text-primary)', 
                border: '1px solid var(--glass-border)', 
                fontSize: '14px', 
                resize: 'none',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-sans)',
                lineHeight: '1.4'
              }}
            />
          </div>

          {/* Mic OR Send Button */}
          {(!msgInput.trim() && !stagedAttachment) ? (
            <button 
              type="button"
              onClick={startVoiceRecording}
              style={{ 
                padding: '10px', 
                background: 'var(--bg-elevated)', 
                color: 'var(--neon-cyan)', 
                borderRadius: '50%', 
                border: '1px solid var(--border-default)', 
                cursor: 'pointer',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}
              title="Record Voice Message"
            >
              <Mic size={20} />
            </button>
          ) : (
            <button 
              type="submit" 
              disabled={isUploading}
              style={{ 
                padding: '11px', 
                background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))', 
                color: '#000', 
                borderRadius: '50%', 
                border: 'none', 
                cursor: isUploading ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(0, 240, 255, 0.4)'
              }}
            >
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} style={{ transform: 'translateX(1px)' }} />}
            </button>
          )}
        </form>
      )}
    </div>
  );
}
