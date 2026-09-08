'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ThemeToggle';
import Button from '@/components/ui/Button';
import { Sliders, Monitor, Smartphone, Check } from 'lucide-react';

export default function SettingsPreferencesPage() {
  const [notificationState, setNotificationState] = useState({
    emailAnnouncements: true,
    doubtReplies: true,
    contestAlerts: true
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* APPEARANCE CARD */}
      <Card variant="glass">
        <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={20} style={{ color: 'var(--neon-cyan)' }} />
          Display & Theme Settings
        </h2>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Customize visual preferences and system interface behavior.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Color Theme</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Toggle between Dark glassmorphism and Light mode</div>
          </div>
          <ThemeToggle />
        </div>
      </Card>

      {/* NOTIFICATIONS PREFERENCES */}
      <Card variant="glass">
        <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          Notification Preferences
        </h2>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Choose what notifications you want to receive.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--glass-border)', cursor: 'pointer' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>Email Announcements & Weekly Summary</span>
            <input 
              type="checkbox" 
              checked={notificationState.emailAnnouncements} 
              onChange={(e) => setNotificationState(prev => ({ ...prev, emailAnnouncements: e.target.checked }))}
              style={{ width: '18px', height: '18px', accentColor: 'var(--neon-cyan)' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--glass-border)', cursor: 'pointer' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>Batch Doubt Replies & Mention Alerts</span>
            <input 
              type="checkbox" 
              checked={notificationState.doubtReplies} 
              onChange={(e) => setNotificationState(prev => ({ ...prev, doubtReplies: e.target.checked }))}
              style={{ width: '18px', height: '18px', accentColor: 'var(--neon-cyan)' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--glass-border)', cursor: 'pointer' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>Coding Battle & Contest Reminders</span>
            <input 
              type="checkbox" 
              checked={notificationState.contestAlerts} 
              onChange={(e) => setNotificationState(prev => ({ ...prev, contestAlerts: e.target.checked }))}
              style={{ width: '18px', height: '18px', accentColor: 'var(--neon-cyan)' }}
            />
          </label>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save Preferences
          </Button>
          {savedSuccess && (
            <span style={{ fontSize: '13px', color: '#00ff88', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={16} /> Saved!
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
