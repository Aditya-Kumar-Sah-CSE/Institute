'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { Search, UserPlus, Users, Loader2, Check } from 'lucide-react';
import Image from 'next/image';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

export default function NewChatModal({ isOpen, onClose, onChatCreated }: NewChatModalProps) {
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, role')
        .ilike('name', `%${search}%`)
        .limit(20);
      setUsers(data || []);
      setLoading(false);
    };
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [search, isOpen]);

  const handleCreateDirectChat = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_or_create_direct_chat', {
        peer_id: userId
      });
      if (error) {
        console.error('RPC Error:', error);
        alert(`Failed to create chat: ${error.message}`);
      }
      if (!error && data) {
        onChatCreated(data);
        onClose();
      }
    } catch (e) {
      console.error(e);
      alert('Network error while starting chat');
    }
    setLoading(false);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentId = session?.user?.id;
      if (!currentId) throw new Error("No active session found");

      // Create conversation
      const { data: conv, error } = await supabase.from('chat_conversations').insert({
        type: 'group',
        name: groupName,
        is_private: true
      }).select().single();

      if (error) {
        console.error('Group creation error:', error);
        alert(`Failed to create group: ${error.message}`);
      } else if (conv) {
        // Add members
        const members = [
          { conversation_id: conv.id, user_id: session.user.id, role: 'owner' },
          ...selectedUsers.map(uid => ({ conversation_id: conv.id, user_id: uid, role: 'member' }))
        ];
        const { error: membersError } = await supabase.from('chat_members').insert(members);
        
        if (membersError) {
          console.error('Error adding members:', membersError);
          alert(`Created group, but failed to add members: ${membersError.message}`);
        }
        
        onChatCreated(conv.id);
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedUsers(prev => [...prev, userId]);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Message">
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', position: 'sticky', top: 0, zIndex: 10, padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--border-divider)', background: 'var(--bg-card)' }}>
        <button
          style={{ flex: 1, padding: 'var(--space-sm) 0', fontSize: 'var(--text-sm)', fontWeight: 'bold', borderBottom: mode === 'direct' ? '2px solid var(--neon-cyan)' : '2px solid transparent', color: mode === 'direct' ? 'var(--neon-cyan)' : 'var(--text-secondary)', background: 'transparent', cursor: 'pointer', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
          onClick={() => setMode('direct')}
        >
          Direct Message
        </button>
        <button
          style={{ flex: 1, padding: 'var(--space-sm) 0', fontSize: 'var(--text-sm)', fontWeight: 'bold', borderBottom: mode === 'group' ? '2px solid var(--neon-cyan)' : '2px solid transparent', color: mode === 'group' ? 'var(--neon-cyan)' : 'var(--text-secondary)', background: 'transparent', cursor: 'pointer', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
          onClick={() => setMode('group')}
        >
          Create Group
        </button>
      </div>

      {mode === 'group' && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 transition-all mb-4"
            style={{ width: '100%', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px', outline: 'none', color: 'var(--text-primary)', border: '1px solid var(--border-default)', marginBottom: 'var(--space-md)' }}
          />
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 'var(--space-md)' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} size={18} />
        <input
          type="text"
          placeholder="Search people to msg..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 12px 12px 40px', outline: 'none', color: 'var(--text-primary)', border: '1px solid var(--border-default)', boxSizing: 'border-box' }}
        />
      </div>

      <div className="no-scrollbar" style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-md)' }}>
            <Loader2 className="animate-spin text-neon-cyan" size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          users.map(user => (
            <div
              key={user.id}
              onClick={() => mode === 'direct' ? handleCreateDirectChat(user.id) : toggleUserSelection(user.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid var(--border-divider)', background: mode === 'group' && selectedUsers.includes(user.id) ? 'rgba(0, 240, 255, 0.1)' : 'var(--bg-secondary)' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                 {user.avatar_url ? (
                   <Image src={user.avatar_url} alt={user.name} fill style={{ objectFit: 'cover' }} unoptimized />
                 ) : (
                   <Users size={20} color="var(--text-muted)" />
                 )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</h4>
                <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{user.role}</p>
              </div>
              {mode === 'direct' && (
                <UserPlus size={16} color="var(--text-muted)" />
              )}
              {mode === 'group' && selectedUsers.includes(user.id) && (
                <Check size={16} color="var(--neon-cyan)" />
              )}
            </div>
          ))
        )}
      </div>

      {mode === 'group' && (
        <button
          onClick={handleCreateGroup}
          disabled={!groupName.trim() || selectedUsers.length === 0 || loading}
          style={{ width: '100%', marginTop: 'var(--space-md)', padding: '12px', background: 'var(--gradient-primary) !important', backgroundColor: 'var(--neon-cyan)', color: 'black', borderRadius: 'var(--radius-md)', fontWeight: 'bold', border: 'none', cursor: (!groupName.trim() || selectedUsers.length === 0 || loading) ? 'not-allowed' : 'pointer', opacity: (!groupName.trim() || selectedUsers.length === 0 || loading) ? 0.5 : 1 }}
        >
          {loading ? 'Creating...' : `Create Group with ${selectedUsers.length} members`}
        </button>
      )}
    </Modal>
  );
}
