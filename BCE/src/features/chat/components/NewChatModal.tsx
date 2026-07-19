'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { createGroupChat } from '@/features/chat/actions/chat';
import { Search, UserPlus, Users, Loader2, Check, AlertCircle } from 'lucide-react';
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
  const [isFetching, setIsFetching] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode('direct');
      setSearch('');
      setGroupName('');
      setSelectedUsers([]);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      setIsFetching(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, role')
        .ilike('name', `%${search}%`)
        .limit(20);
      setUsers(data || []);
      setIsFetching(false);
    };
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [search, isOpen]);

  const handleCreateDirectChat = async (userId: string) => {
    setError(null);
    setIsFetching(true);
    try {
      const { data, error } = await supabase.rpc('get_or_create_direct_chat', { peer_id: userId });
      if (error) throw new Error(error.message);
      if (data) {
        onChatCreated(data);
        onClose();
      }
    } catch (e: any) {
      setError(e.message || 'Failed to start chat. Please try again.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    setError(null);

    startTransition(async () => {
      try {
        // Uses server action — authenticated server client, passes RLS correctly
        const groupId = await createGroupChat(groupName, selectedUsers);
        onChatCreated(groupId);
        onClose();
      } catch (e: any) {
        setError(e.message || 'Failed to create group. Please try again.');
      }
    });
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const isLoading = isFetching || isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Message">
      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border-divider)' }}>
        {(['direct', 'group'] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setSelectedUsers([]); setError(null); }}
            style={{
              flex: 1, padding: '10px 0', fontWeight: 'bold', fontSize: 'var(--text-sm)',
              background: 'transparent', cursor: 'pointer',
              border: 'none', borderBottom: mode === m ? '2px solid var(--neon-cyan)' : '2px solid transparent',
              color: mode === m ? 'var(--neon-cyan)' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            {m === 'direct' ? 'Direct Message' : 'Create Group'}
          </button>
        ))}
      </div>

      {/* Group Name Input */}
      {mode === 'group' && (
        <input
          type="text"
          placeholder="Enter group name..."
          value={groupName}
          onChange={e => setGroupName(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box', marginBottom: 'var(--space-md)',
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
            padding: '12px 14px', outline: 'none', color: 'var(--text-primary)',
            border: '1px solid var(--border-default)', fontSize: 'var(--text-sm)',
            transition: 'border-color 0.2s'
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--neon-cyan)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
        />
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 'var(--space-md)' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} size={16} />
        <input
          type="text"
          placeholder={mode === 'group' ? 'Add members by name...' : 'Search people...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
            padding: '12px 12px 12px 40px', outline: 'none', color: 'var(--text-primary)',
            border: '1px solid var(--border-default)', fontSize: 'var(--text-sm)',
            transition: 'border-color 0.2s'
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--neon-cyan)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
        />
      </div>

      {/* Selected members badges (group mode) */}
      {mode === 'group' && selectedUsers.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 'var(--space-sm)' }}>
          {selectedUsers.map(uid => {
            const u = users.find(x => x.id === uid);
            return u ? (
              <span
                key={uid}
                onClick={() => toggleUserSelection(uid)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px 4px 8px', background: 'rgba(0,240,255,0.15)', border: '1px solid var(--neon-cyan)', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, color: 'var(--neon-cyan)', cursor: 'pointer' }}
              >
                {u.name} ✕
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', marginBottom: 'var(--space-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '13px' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* User List */}
      <div className="no-scrollbar" style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {isFetching && !users.length ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-md)' }}>
            <Loader2 className="animate-spin" size={24} color="var(--neon-cyan)" />
          </div>
        ) : users.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: 'var(--space-md)' }}>No users found</p>
        ) : (
          users.map(user => {
            const isSelected = selectedUsers.includes(user.id);
            return (
              <div
                key={user.id}
                onClick={() => mode === 'direct' ? handleCreateDirectChat(user.id) : toggleUserSelection(user.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  background: isSelected ? 'rgba(0,240,255,0.08)' : 'var(--bg-secondary)',
                  border: `1px solid ${isSelected ? 'var(--neon-cyan)' : 'var(--border-divider)'}`,
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                  {user.avatar_url ? (
                    <Image src={user.avatar_url} alt={user.name} fill style={{ objectFit: 'cover' }} unoptimized />
                  ) : (
                    <Users size={18} color="var(--text-muted)" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{user.role}</p>
                </div>
                {mode === 'direct' && <UserPlus size={15} color="var(--text-muted)" />}
                {mode === 'group' && isSelected && <Check size={15} color="var(--neon-cyan)" />}
              </div>
            );
          })
        )}
      </div>

      {/* Create Group Button */}
      {mode === 'group' && (
        <button
          onClick={handleCreateGroup}
          disabled={!groupName.trim() || selectedUsers.length === 0 || isLoading}
          style={{
            width: '100%', marginTop: 'var(--space-md)', padding: '13px',
            background: (!groupName.trim() || selectedUsers.length === 0 || isLoading) ? 'var(--bg-elevated)' : 'var(--neon-cyan)',
            color: (!groupName.trim() || selectedUsers.length === 0 || isLoading) ? 'var(--text-muted)' : '#000',
            borderRadius: 'var(--radius-md)', fontWeight: 'bold', fontSize: '14px',
            border: 'none', cursor: (!groupName.trim() || selectedUsers.length === 0 || isLoading) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          {isPending ? (
            <><Loader2 size={16} className="animate-spin" /> Creating group...</>
          ) : (
            <>{selectedUsers.length > 0 ? `Create Group · ${selectedUsers.length} member${selectedUsers.length > 1 ? 's' : ''}` : 'Create Group'}</>
          )}
        </button>
      )}
    </Modal>
  );
}
