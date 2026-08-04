'use client';

import React, { useEffect, useState, useRef } from 'react';
import { TenantLink as Link } from '@/lib/tenant/TenantProvider';
import { createClient } from '@/lib/supabase/client';
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/features/notifications/actions/notifications';
import './NotificationBell.css';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = createClient();

    // Initial fetch
    const fetchNotifications = async () => {
      const { data } = await sb
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) setNotifications(data);
    };

    fetchNotifications();

    // Subscribe to realtime updates
    const channel = sb.channel(`public:notifications:user_id=eq.${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) => 
            prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
          );
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [userId]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Sync with PWA App Badge
  useEffect(() => {
    if (typeof window !== 'undefined' && 'setAppBadge' in navigator && typeof navigator.setAppBadge === 'function') {
      if (unreadCount > 0) {
        navigator.setAppBadge(unreadCount).catch(console.error);
      } else {
        if ('clearAppBadge' in navigator && typeof navigator.clearAppBadge === 'function') {
          navigator.clearAppBadge().catch(console.error);
        }
      }
    }
  }, [unreadCount]);

  const handleNotificationClick = async (id: string, link: string) => {
    setIsOpen(false);
    await markNotificationAsRead(id);
    // State is optimistically updated or updated via realtime
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button className="bell-btn" onClick={() => setIsOpen(!isOpen)}>
        🔔
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="mark-all-btn" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">No notifications yet.</div>
            ) : (
              <>
                {(showAll ? notifications : notifications.slice(0, 5)).map((n) => (
                  <Link 
                    key={n.id} 
                    href={n.link || '#'} 
                    className={`notification-item ${n.is_read ? 'read' : 'unread'}`}
                    onClick={() => handleNotificationClick(n.id, n.link || '#')}
                  >
                    <div className="notification-icon">
                      {n.type === 'reply' ? '💬' : 
                       n.type === 'upvote' ? '👍' : 
                       n.type === 'notice' ? '📢' : '🔔'}
                    </div>
                    <div className="notification-content">
                      <p>{n.message}</p>
                      <span suppressHydrationWarning className="notification-time">
                        {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    {!n.is_read && <div className="unread-dot"></div>}
                  </Link>
                ))}
                {!showAll && notifications.length > 5 && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      setShowAll(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'transparent',
                      border: 'none',
                      borderTop: '1px solid var(--glass-border)',
                      color: 'var(--neon-cyan)',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: 'var(--text-sm)'
                    }}
                  >
                    Read more
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
