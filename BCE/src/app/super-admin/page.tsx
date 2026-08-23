'use client';

import React, { useState, useEffect } from 'react';
import {
  Crown,
  Shield,
  Zap,
  Users,
  Sliders,
  AlertTriangle,
  FileText,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Lock,
  Search,
  Check,
  Info,
  X,
} from 'lucide-react';
import { SuperAdminBadge } from '@/components/super-admin/SuperAdminBadge';
import { safeFetch } from '@/lib/api-client';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function SuperAdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'emergency' | 'features' | 'users' | 'audit'>('overview');

  const [overviewData, setOverviewData] = useState<any>(null);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [emergencySwitches, setEmergencySwitches] = useState<Record<string, boolean>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  // Search & Filter state
  const [featureSearch, setFeatureSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'killswitch' | 'feature' | 'deleteUser' | 'roleUser';
    payload: any;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'killswitch',
    payload: null,
  });

  // Toast Notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    const res = await safeFetch('/api/super-admin/overview');
    if (!res.success) {
      if (res.status === 403 || res.error?.code === 'FORBIDDEN_SUPER_ADMIN_ONLY') {
        setError(res.error?.message || '403 Access Denied: Only the Platform Owner can access this control plane.');
      } else {
        setError(res.error?.message || 'Failed to load Super Admin dashboard data.');
      }
      setLoading(false);
      return;
    }

    const data = res.data;
    setOverviewData(data);
    setFeatureFlags(data.featureFlags || {});
    setEmergencySwitches(data.emergencyKillSwitches || {});
    setAuditLogs(data.recentAuditLogs || []);

    // Fetch users list
    const usersRes = await safeFetch('/api/super-admin/users');
    if (usersRes.success) {
      setUsers(usersRes.data?.users || []);
    } else {
      addToast('error', usersRes.error?.message || 'Failed to load users list.');
    }

    setLoading(false);
  };

  const handleToggleFeature = (key: string, currentValue: boolean) => {
    setConfirmModal({
      isOpen: true,
      title: `${currentValue ? 'Disable' : 'Enable'} Global Feature: ${key.replace(/_/g, ' ').toUpperCase()}`,
      description: `This will ${currentValue ? 'disable' : 'enable'} ${key.replace(/_/g, ' ')} globally across all tenants and users.`,
      actionType: 'feature',
      payload: { key, currentValue },
    });
  };

  const handleToggleEmergency = (key: string, currentValue: boolean) => {
    setConfirmModal({
      isOpen: true,
      title: `${currentValue ? 'Deactivate' : 'ACTIVATE'} EMERGENCY KILL SWITCH: ${key.replace(/_/g, ' ').toUpperCase()}`,
      description: `Warning: This is an emergency platform override. It will immediately ${currentValue ? 'restore' : 'BLOCK'} ${key.replace(/_/g, ' ')} globally.`,
      actionType: 'killswitch',
      payload: { key, currentValue },
    });
  };

  const handleDeleteUser = (userItem: any) => {
    if (userItem.isPlatformOwner) {
      addToast('error', 'Only the Platform Owner can modify this account.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: `Delete User: ${userItem.email}`,
      description: `Are you sure you want to permanently delete user ${userItem.email}? This action cannot be undone.`,
      actionType: 'deleteUser',
      payload: userItem,
    });
  };

  const executeConfirmedAction = async () => {
    const { actionType, payload } = confirmModal;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    if (actionType === 'feature') {
      const { key, currentValue } = payload;
      setUpdatingKey(key);
      const res = await safeFetch('/api/super-admin/features', {
        method: 'POST',
        body: JSON.stringify({ featureFlags: { [key]: !currentValue } }),
      });
      setUpdatingKey(null);

      if (res.success) {
        setFeatureFlags(res.data.featureFlags);
        setEmergencySwitches(res.data.emergencyKillSwitches);
        addToast('success', `Feature '${key.replace(/_/g, ' ')}' updated successfully.`);
      } else {
        addToast('error', res.error?.message || 'Failed to update feature flag.');
        fetchDashboardData();
      }
    } else if (actionType === 'killswitch') {
      const { key, currentValue } = payload;
      setUpdatingKey(key);
      const res = await safeFetch('/api/super-admin/features', {
        method: 'POST',
        body: JSON.stringify({ emergencyKillSwitches: { [key]: !currentValue } }),
      });
      setUpdatingKey(null);

      if (res.success) {
        setFeatureFlags(res.data.featureFlags);
        setEmergencySwitches(res.data.emergencyKillSwitches);
        addToast('success', `Kill switch '${key.replace(/_/g, ' ')}' ${!currentValue ? 'ACTIVATED' : 'Deactivated'}.`);
      } else {
        addToast('error', res.error?.message || 'Failed to update emergency kill switch.');
        fetchDashboardData();
      }
    } else if (actionType === 'deleteUser') {
      const userItem = payload;
      setUpdatingKey(userItem.id);
      const res = await safeFetch(
        `/api/super-admin/users?userId=${userItem.id}&email=${encodeURIComponent(userItem.email)}`,
        { method: 'DELETE' }
      );
      setUpdatingKey(null);

      if (res.success) {
        addToast('success', `User ${userItem.email} deleted.`);
        fetchDashboardData();
      } else {
        addToast('error', res.error?.message || 'Failed to delete user.');
      }
    }
  };

  const updateUserRole = async (userItem: any, newRole: string) => {
    if (userItem.isPlatformOwner) {
      addToast('error', 'Only the Platform Owner can modify this account.');
      return;
    }

    setUpdatingKey(userItem.id);
    const res = await safeFetch('/api/super-admin/users', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: userItem.id,
        targetEmail: userItem.email,
        role: newRole,
      }),
    });
    setUpdatingKey(null);

    if (res.success) {
      addToast('success', `Role for ${userItem.email} changed to ${newRole.toUpperCase()}.`);
      fetchDashboardData();
    } else {
      addToast('error', res.error?.message || 'Failed to update user role.');
    }
  };

  // Filtered lists
  const filteredFeatureFlags = Object.entries(featureFlags).filter(([key]) =>
    key.toLowerCase().includes(featureSearch.toLowerCase().replace(/\s+/g, '_'))
  );

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || (u.role || 'student') === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={36} className="spin" style={{ color: '#06b6d4', marginBottom: '12px' }} />
          <p style={{ color: '#94a3b8', fontWeight: 600 }}>Authenticating Platform Control Plane...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '40px', maxWidth: '500px', textAlign: 'center' }}>
          <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '22px', color: '#ef4444', marginBottom: '12px' }}>403 Access Denied</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>{error}</p>
          <a href="/dashboard" style={{ marginTop: '20px', display: 'inline-block', background: '#06b6d4', color: '#fff', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#f8fafc', padding: '32px 24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Toast Notifications System */}
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '380px' }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background: toast.type === 'success' ? '#064e3b' : toast.type === 'error' ? '#7f1d1d' : '#1e293b',
              border: `1px solid ${toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6'}`,
              color: '#fff',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {toast.type === 'success' && <Check size={18} style={{ color: '#34d399' }} />}
              {toast.type === 'error' && <AlertTriangle size={18} style={{ color: '#f87171' }} />}
              {toast.type === 'info' && <Info size={18} style={{ color: '#60a5fa' }} />}
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: '0 0 12px 0' }}>{confirmModal.title}</h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px 0' }}>{confirmModal.description}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))} style={{ background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={executeConfirmedAction} style={{ background: confirmModal.actionType === 'deleteUser' || confirmModal.actionType === 'killswitch' ? '#ef4444' : '#06b6d4', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Super Admin SaaS Control Plane
              </h1>
              <span style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                ROOT AUTHORITY
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
              Multi-tenant architecture control, global priority overrides, emergency kill switches, and audit trail.
            </p>
          </div>

          <SuperAdminBadge email={overviewData?.owner?.email} />
          <a href="/super-admin/landing" style={{ color: '#06b6d4', fontWeight: 700, textDecoration: 'none' }}>Landing & Branding CMS →</a>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              background: activeTab === 'overview' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
              border: activeTab === 'overview' ? '1px solid #06b6d4' : '1px solid transparent',
              color: activeTab === 'overview' ? '#06b6d4' : '#94a3b8',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Activity size={16} /> Overview
          </button>

          <button
            onClick={() => setActiveTab('emergency')}
            style={{
              background: activeTab === 'emergency' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
              border: activeTab === 'emergency' ? '1px solid #ef4444' : '1px solid transparent',
              color: activeTab === 'emergency' ? '#ef4444' : '#94a3b8',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Zap size={16} /> Emergency Kill Switches
          </button>

          <button
            onClick={() => setActiveTab('features')}
            style={{
              background: activeTab === 'features' ? 'rgba(234, 179, 8, 0.2)' : 'transparent',
              border: activeTab === 'features' ? '1px solid #eab308' : '1px solid transparent',
              color: activeTab === 'features' ? '#facc15' : '#94a3b8',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sliders size={16} /> Global Feature Flags
          </button>

          <button
            onClick={() => setActiveTab('users')}
            style={{
              background: activeTab === 'users' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
              border: activeTab === 'users' ? '1px solid #a855f7' : '1px solid transparent',
              color: activeTab === 'users' ? '#c084fc' : '#94a3b8',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Users size={16} /> User Management
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            style={{
              background: activeTab === 'audit' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
              border: activeTab === 'audit' ? '1px solid #22c55e' : '1px solid transparent',
              color: activeTab === 'audit' ? '#4ade80' : '#94a3b8',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={16} /> Audit Logs
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Total Platform Users</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>{overviewData?.stats?.totalUsers || 0}</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Admins & Developers</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#a855f7', marginTop: '4px' }}>{overviewData?.stats?.totalAdmins || 0}</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Faculty / Instructors</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>{overviewData?.stats?.totalFaculty || 0}</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Students</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#4ade80', marginTop: '4px' }}>{overviewData?.stats?.totalStudents || 0}</div>
              </div>
            </div>

            {/* Hierarchy priority banner */}
            <div style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(168, 85, 247, 0.1))', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0', color: '#06b6d4' }}>
                🛡️ Enforced Permission Priority Engine
              </h3>
              <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0, lineHeight: '1.6' }}>
                <code>SUPER ADMIN GLOBAL CONTROL</code> ➔ <code>ADMIN FEATURE CONTROL</code> ➔ <code>ROLE PERMISSION</code> ➔ <code>USER PERMISSION</code>
                <br />
                When a feature is disabled globally by the Super Admin, no lower-level Admin or role configuration can override it.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Emergency Kill Switches */}
        {activeTab === 'emergency' && (
          <div>
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={24} style={{ color: '#ef4444' }} />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ef4444', margin: 0 }}>Emergency Platform Kill Switches</h3>
                  <p style={{ fontSize: '13px', color: '#cbd5e1', margin: '4px 0 0 0' }}>
                    Instantaneous global kill switches overriding all platform operations.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {Object.entries(emergencySwitches).map(([key, enabled]) => (
                <div
                  key={key}
                  style={{
                    background: enabled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: enabled ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: enabled ? '#fca5a5' : '#f8fafc', textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      Status: {enabled ? '🚨 ACTIVATED' : '✓ Normal Operation'}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleEmergency(key, !!enabled)}
                    disabled={updatingKey === key}
                    style={{
                      background: enabled ? '#ef4444' : 'rgba(255, 255, 255, 0.08)',
                      color: enabled ? '#fff' : '#cbd5e1',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {updatingKey === key ? (
                      <RefreshCw size={16} className="spin" />
                    ) : enabled ? (
                      <XCircle size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    {enabled ? 'Deactivate Kill Switch' : 'Activate Kill Switch'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Global Feature Flags */}
        {activeTab === 'features' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#facc15' }}>
                Global Feature Override Grid
              </h3>

              <div style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search features..."
                  value={featureSearch}
                  onChange={(e) => setFeatureSearch(e.target.value)}
                  style={{
                    background: '#0b0f19',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '8px 12px 8px 36px',
                    color: '#fff',
                    fontSize: '13px',
                    width: '100%',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {filteredFeatureFlags.map(([key, enabled]) => (
                <div
                  key={key}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: enabled ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '11px', color: enabled ? '#4ade80' : '#f87171', marginTop: '2px', fontWeight: 600 }}>
                      {enabled ? 'ON Globally' : 'OFF Globally'}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleFeature(key, !!enabled)}
                    disabled={updatingKey === key}
                    style={{
                      background: enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: enabled ? '#4ade80' : '#f87171',
                      border: enabled ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {updatingKey === key ? 'Saving...' : enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: User Management */}
        {activeTab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#c084fc' }}>
                Platform User & Admin Management
              </h3>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    style={{
                      background: '#0b0f19',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '8px 12px 8px 36px',
                      color: '#fff',
                      fontSize: '13px',
                      width: '100%',
                    }}
                  />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  style={{
                    background: '#0b0f19',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '13px',
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="student">Student</option>
                  <option value="instructor">Faculty</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '12px 16px' }}>User</th>
                    <th style={{ padding: '12px 16px' }}>Email</th>
                    <th style={{ padding: '12px 16px' }}>Role</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: u.isPlatformOwner ? 'rgba(234, 179, 8, 0.05)' : 'transparent' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                        {u.name || 'User'}
                        {u.isPlatformOwner && (
                          <span style={{ marginLeft: '8px', fontSize: '10px', background: 'linear-gradient(135deg, #eab308, #ca8a04)', color: '#0f172a', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                            ROOT OWNER
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#cbd5e1', fontFamily: 'monospace' }}>{u.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: u.role === 'super_admin' ? 'rgba(234, 179, 8, 0.2)' : u.role === 'admin' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                            color: u.role === 'super_admin' ? '#facc15' : u.role === 'admin' ? '#c084fc' : '#60a5fa',
                          }}
                        >
                          {(u.role || 'student').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4ade80' }}>Active</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {u.isPlatformOwner ? (
                          <span style={{ fontSize: '11px', color: '#eab308', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <Lock size={12} /> IMMUTABLE OWNER
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <select
                              value={u.role || 'student'}
                              disabled={updatingKey === u.id}
                              onChange={(e) => updateUserRole(u, e.target.value)}
                              style={{ background: '#0b0f19', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}
                            >
                              <option value="student">Student</option>
                              <option value="instructor">Faculty</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={updatingKey === u.id}
                              style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                              title="Delete User"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Audit Logs */}
        {activeTab === 'audit' && (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#4ade80' }}>
              System Audit Trail
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {auditLogs.map((log) => (
                <div key={log.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#06b6d4' }}>{log.action}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    Actor: <strong>{log.actorEmail}</strong> ➔ Target: <code>{log.target}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
