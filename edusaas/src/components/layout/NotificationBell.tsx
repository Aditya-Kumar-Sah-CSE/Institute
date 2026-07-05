'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
// Mocking notification APIs for clone
const markNotificationAsRead = async (id: string) => {};
const markAllNotificationsAsRead = async (userId: string) => {};
import './NotificationBell.css';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  is_read: boolean;
  link_url?: string;
  course_id?: string;
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mock data for UI Clone
    setNotifications([
      {
        id: '1',
        title: 'Welcome to EduSaaS',
        message: 'Your gamified learning platform is ready!',
        type: 'system',
        created_at: new Date().toISOString(),
        is_read: false,
        link_url: '/dashboard'
      }
    ]);
    setUnreadCount(1);
  }, [userId]);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead(userId);
    setNotifications(prev => 
      prev.map(n => ({ ...n, is_read: true }))
    );
    setUnreadCount(0);
  };

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
              notifications.map((n) => (
                <Link 
                  key={n.id} 
                  href={n.link_url || '#'} 
                  className={`notification-item ${n.is_read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(n.id, n.link_url || '#')}
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
