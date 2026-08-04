'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, UserMinus, Shield, Pen, Loader2, MoreVertical, UserPlus, ShieldHalf, ArrowDownToLine, Trash2, Camera, Check, XCircle } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { updateGroupRole, removeGroupMember, updateGroupSettings } from '@/features/chat/actions/chat';
import type { ChatMember } from '@/types/database'; 

interface ChatInfoPanelProps {
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

// Extends default chat member to include profile
type UITypeMember = ChatMember & { profile?: { id: string, name: string, avatar_url: string } };

export default function ChatInfoPanel({ chatId, isOpen, onClose, currentUserId }: ChatInfoPanelProps) {
  const [members, setMembers] = useState<UITypeMember[]>([]);
  const [chatName, setChatName] = useState<string>('');
  const [chatIconUrl, setChatIconUrl] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchInfo = async () => {
    setLoading(true);
    // Fetch Chat info
    const { data: c } = await supabase.from('chat_conversations').select('name, icon_url').eq('id', chatId).single();
    if (c?.name) {
      setChatName(c.name);
      setEditName(c.name);
    }
    if (c?.icon_url) setChatIconUrl(c.icon_url);

    // Fetch members
    const { data: m } = await supabase
      .from('chat_members')
      .select('*, profile:profiles(id, name, avatar_url)')
      .eq('conversation_id', chatId);
      
    if (m) {
      setMembers(m as UITypeMember[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchInfo();
    }
  }, [isOpen, chatId]);

  const currentUserMember = members.find(m => m.user_id === currentUserId);
  const isPrivileged = currentUserMember?.role === 'founder' || currentUserMember?.role === 'co-founder' || currentUserMember?.role === 'admin';
  const canPromote = currentUserMember?.role === 'founder' || currentUserMember?.role === 'co-founder';
  
  const handleRoleChange = async (userId: string, newRole: 'founder' | 'co-founder' | 'admin' | 'member') => {
     setActiveMenuId(null);
     try {
       await updateGroupRole(chatId, userId, newRole);
       fetchInfo(); // Refresh locally
     } catch (e: any) {
       alert(e.message || 'Error updating role');
     }
  };

  const handleKick = async (userId: string) => {
     if(!confirm('Are you sure you want to remove this member?')) return;
     setActiveMenuId(null);
     try {
       await removeGroupMember(chatId, userId);
       fetchInfo();
     } catch (e: any) {
       alert(e.message);
     }
  };
  
  const handleLeave = async () => {
     if(!confirm('Are you sure you want to leave this group?')) return;
     try {
       await removeGroupMember(chatId, currentUserId);
       window.location.reload(); // Hard exit to reset state
     } catch (e: any) {
       alert(e.message);
     }
  };

  const handleSaveGroupSettings = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await updateGroupSettings(chatId, { name: editName });
      setChatName(editName);
      setIsEditing(false);
    } catch (e: any) {
      alert(e.message || 'Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `group-icons/${chatId}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('branding').getPublicUrl(filePath);
      const newUrl = data.publicUrl;

      await updateGroupSettings(chatId, { icon_url: newUrl });
      setChatIconUrl(newUrl);
    } catch (e: any) {
      alert(e.message || 'Error uploading image');
    } finally {
      setSaving(false);
    }
  };

  // Sort: Founder first, then co-founders, admins, members
  const roleWeights = { 'founder': 0, 'co-founder': 1, 'admin': 2, 'member': 3, 'pending': 4 };
  const sortedMembers = [...members].sort((a,b) => {
     const wA = roleWeights[a.role as keyof typeof roleWeights] ?? 9;
     const wB = roleWeights[b.role as keyof typeof roleWeights] ?? 9;
     return wA - wB;
  });

  return (
    <>
    <AnimatePresence>
      {isOpen && (
          <motion.div 
             key="chat-info-overlay"
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             onClick={onClose}
             style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          />
      )}
      {isOpen && (
          <motion.div
             key="chat-info-panel-content"
             initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
             transition={{ type: 'spring', damping: 25, stiffness: 200 }}
             style={{ 
               position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '380px', 
               backgroundColor: 'var(--bg-elevated)', zIndex: 50, borderLeft: '1px solid var(--border-divider)',
               display: 'flex', flexDirection: 'column',
               boxShadow: '-10px 0 25px rgba(0,0,0,0.2)'
             }}
          >
             <div style={{ padding: '20px', borderBottom: '1px solid var(--border-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Group Info</h3>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
             </div>
             
             {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                   <Loader2 className="animate-spin text-cyan-400" size={32} />
                </div>
             ) : (
               <div style={{ flex: 1, overflowY: 'auto' }}>
                 {/* Group Header Info */}
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0 24px', borderBottom: '1px solid var(--border-divider)', position: 'relative' }}>
                   {isPrivileged && !isEditing && (
                     <button onClick={() => setIsEditing(true)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '50%' }} className="hover:bg-white/10 transition">
                       <Pen size={18} />
                     </button>
                   )}
                   
                   <div style={{ position: 'relative' }}>
                     <div 
                       onClick={() => chatIconUrl && setShowImagePreview(true)}
                       style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: chatIconUrl ? 'pointer' : 'default' }}
                     >
                        {chatIconUrl ? (
                          <Image src={chatIconUrl} alt="Group Icon" width={80} height={80} className="w-full h-full object-cover" unoptimized />
                        ) : (
                          <Users size={40} color="var(--text-muted)" />
                        )}
                     </div>
                     {isPrivileged && (
                       <label style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--neon-cyan)', color: '#000', borderRadius: '50%', padding: '6px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                         {saving && !isEditing ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                         <input type="file" accept="image/*" style={{ display: 'none' }} disabled={saving} onChange={(e) => handleImageUpload(e)} />
                       </label>
                     )}
                   </div>

                   {isEditing ? (
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', width: '80%' }}>
                        <input 
                          type="text" 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)} 
                          autoFocus
                          style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--neon-cyan)', color: 'var(--text-primary)', outline: 'none' }}
                        />
                        <button onClick={handleSaveGroupSettings} disabled={saving} style={{ background: 'var(--neon-cyan)', color: '#000', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>
                           {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button onClick={() => { setIsEditing(false); setEditName(chatName); }} disabled={saving} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', padding: '8px', cursor: 'pointer' }}>
                           <XCircle size={18} />
                        </button>
                     </div>
                   ) : (
                     <h2 style={{ marginTop: '16px', marginBottom: '4px', fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{chatName}</h2>
                   )}
                   <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Group • {members.length} participants</p>
                 </div>
                 
                 {/* Members List */}
                 <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>{members.length} Participants</span>
                      {canPromote && (
                        <button style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--neon-cyan)', fontSize: '13px', fontWeight: 600 }}>
                          <UserPlus size={16} /> Add Member
                        </button>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {sortedMembers.map(m => {
                         const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
                         const isMe = m.user_id === currentUserId;
                         const targetRoleWeight = roleWeights[m.role as keyof typeof roleWeights] ?? 9;
                         const myRoleWeight = roleWeights[currentUserMember?.role as keyof typeof roleWeights] ?? 9;
                         // I can only modify people lower than me if I am founder/co-founder, or kick if I am admin
                         const canModify = !isMe && canPromote && (myRoleWeight < targetRoleWeight);
                         
                         return (
                           <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', position: 'relative' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden' }}>
                                 {profile?.avatar_url ? (
                                   <Image src={profile.avatar_url} alt="" width={40} height={40} className="object-cover w-full h-full" unoptimized />
                                 ) : (
                                   <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">{profile?.name?.charAt(0) || '?'}</div>
                                 )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                   {profile?.name} {isMe ? '(You)' : ''}
                                </h4>
                                {m.role !== 'member' && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: 'var(--neon-cyan)', marginTop: '2px', background: 'rgba(0, 240, 255, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                     {m.role === 'founder' && <Shield size={10} />}
                                     {m.role === 'co-founder' && <Shield size={10} />}
                                     {m.role === 'admin' && <Shield size={10} />}
                                     {m.role}
                                  </span>
                                )}
                              </div>
                              
                              {canModify && (
                                <div style={{ position: 'relative' }}>
                                   <button 
                                     onClick={() => setActiveMenuId(activeMenuId === m.user_id ? null : m.user_id)}
                                     style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                   >
                                     <MoreVertical size={18} />
                                   </button>
                                   
                                   {activeMenuId === m.user_id && (
                                      <div style={{ 
                                        position: 'absolute', right: 0, top: '100%', marginTop: '8px',
                                        backgroundColor: 'var(--bg-elevated)', 
                                        border: '1px solid var(--border-divider)', 
                                        borderRadius: 'var(--radius-lg)', 
                                        zIndex: 60, width: 'max-content', minWidth: '190px', maxWidth: '80vw', overflow: 'hidden', 
                                        boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
                                        backdropFilter: 'blur(10px)',
                                        display: 'flex', flexDirection: 'column'
                                      }}>
                                        {currentUserMember.role === 'founder' && m.role !== 'co-founder' && (
                                           <button onClick={() => handleRoleChange(m.user_id, 'co-founder')} className="hover:bg-[rgba(0,240,255,0.08)] hover:text-[var(--neon-cyan)] transition-colors" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                                             <Shield size={16} /> Make Co-Founder
                                           </button>
                                        )}
                                        {m.role !== 'member' && (
                                           <button onClick={() => handleRoleChange(m.user_id, 'member')} className="hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                                             <ArrowDownToLine size={16} /> Demote to Member
                                           </button>
                                        )}
                                        <button onClick={() => handleKick(m.user_id)} className="hover:bg-red-500/10 hover:text-red-300 transition-colors" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                          <UserMinus size={16} /> Remove from Group
                                        </button>
                                      </div>
                                   )}
                                </div>
                              )}
                           </div>
                         )
                      })}
                    </div>
                    
                    {/* Danger Zone */}
                    <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-divider)', paddingTop: '20px' }}>
                       <button onClick={handleLeave} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                          <UserMinus size={18} /> Exit Group
                       </button>
                    </div>
                 </div>
               </div>
             )}
          </motion.div>
      )}
    </AnimatePresence>
    
    {/* Fullscreen Image Preview */}
    <AnimatePresence>
      {showImagePreview && chatIconUrl && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setShowImagePreview(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '20px' }}
        >
          <button onClick={() => setShowImagePreview(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
             <X size={24} />
          </button>
          
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} style={{ position: 'relative', width: '100%', maxWidth: '600px', aspectRatio: '1/1' }}>
             <Image src={chatIconUrl} alt="Enlarged Group Icon" fill className="object-contain" unoptimized />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
