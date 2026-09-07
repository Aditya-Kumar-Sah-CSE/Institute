'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input, { TextArea } from '@/components/ui/Input';
import { 
  Rocket, Link as LinkIcon, Smartphone, FileText, 
  CheckCircle, XCircle, Clock, Trash2, ShieldCheck, 
  ExternalLink, Upload, AlertCircle, Sparkles, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import { 
  submitStudentApp, approveStudentApp, rejectStudentApp, deleteStudentApp 
} from '../actions/showcase-actions';
import Image from 'next/image';

interface StudentAppShowcaseProps {
  approvedApps: any[];
  pendingApps: any[];
  userSubmissions: any[];
  currentUser: any;
  isAdmin: boolean;
}

export default function StudentAppShowcase({
  approvedApps,
  pendingApps,
  userSubmissions,
  currentUser,
  isAdmin,
}: StudentAppShowcaseProps) {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAllApps, setShowAllApps] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const visibleApps = isMobile && !showAllApps ? approvedApps.slice(0, 3) : approvedApps;

  // Form states
  const [appName, setAppName] = useState('');
  const [studentName, setStudentName] = useState(currentUser?.name || '');
  const [mobileNo, setMobileNo] = useState('');
  const [batch, setBatch] = useState('');
  const [problemAddressing, setProblemAddressing] = useState('');
  const [solution, setSolution] = useState('');
  const [workingUrl, setWorkingUrl] = useState('');
  const [appLogoFile, setAppLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAppLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    if (!appName || !studentName || !mobileNo || !batch || !problemAddressing || !solution || !workingUrl) {
      setError('All text fields are required.');
      setIsSubmitting(false);
      return;
    }

    if (!appLogoFile) {
      setError('App logo image file is required.');
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('app_name', appName);
      formData.append('student_name', studentName);
      formData.append('mobile_no', mobileNo);
      formData.append('batch', batch);
      formData.append('problem_addressing', problemAddressing);
      formData.append('solution', solution);
      formData.append('working_url', workingUrl);
      formData.append('app_logo', appLogoFile);

      const res = await submitStudentApp(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess('Your app idea has been submitted successfully and is pending admin approval!');
        // Reset form
        setAppName('');
        setMobileNo('');
        setBatch('');
        setProblemAddressing('');
        setSolution('');
        setWorkingUrl('');
        setAppLogoFile(null);
        setLogoPreview(null);
        setTimeout(() => {
          setShowSubmitModal(false);
          setSuccess(null);
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const res = await approveStudentApp(id);
    if (res.error) alert(res.error);
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    const res = await rejectStudentApp(id);
    if (res.error) alert(res.error);
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this project?')) {
      setActionLoading(id);
      const res = await deleteStudentApp(id);
      if (res.error) alert(res.error);
      setActionLoading(null);
      if (selectedApp?.id === id) {
        setSelectedApp(null);
      }
    }
  };

  return (
    <>
      <Card 
        variant="glass" 
        style={{ 
          background: 'rgba(15, 23, 42, 0.4)', 
          border: '1px solid var(--glass-border)', 
          borderRadius: 'var(--radius-lg)', 
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)',
          marginTop: 'var(--space-md)'
        }}
      >
      {/* Section Header with Top-Right ^ Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}
        >
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Rocket className="text-neon-cyan" size={22} /> Innovation Hub & Apps
          </h2>
          <p className="text-secondary text-sm" style={{ margin: '4px 0 0 0' }}>
            Showcasing working projects, full-stack websites, and apps developed by Smart Learn students.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="primary" size="sm" onClick={() => setShowSubmitModal(true)}>
            🚀 Submit Your Project
          </Button>
          <button 
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '8px', 
              color: 'var(--text-primary)', 
              padding: '6px 10px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            title={isCollapsed ? "Expand Innovation Hub" : "Collapse Innovation Hub"}
          >
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Collapsible Content Body */}
      {!isCollapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', marginTop: 'var(--space-sm)' }}>
          {/* User Submission Status Tracker */}
          {userSubmissions.length > 0 && (
            <Card variant="glass" style={{ background: 'rgba(6, 182, 212, 0.03)', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }} className="text-neon-cyan">
                Your Submissions Tracker
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {userSubmissions.map((sub: any) => (
                  <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={sub.app_logo_url} alt={sub.app_name} style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
                      <div>
                        <strong style={{ fontSize: '14px' }}>{sub.app_name}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>submitted on {new Date(sub.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {sub.status === 'pending' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--neon-gold)', fontWeight: 600 }}>
                          <Clock size={13} /> Pending Review
                        </span>
                      )}
                      {sub.status === 'approved' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--neon-emerald)', fontWeight: 600 }}>
                          <CheckCircle size={13} /> Approved
                        </span>
                      )}
                      {sub.status === 'rejected' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--neon-red)', fontWeight: 600 }}>
                          <XCircle size={13} /> Rejected
                        </span>
                      )}
                      <button onClick={() => handleDelete(sub.id)} style={{ border: 'none', background: 'transparent', color: 'rgba(239, 68, 68, 0.7)', cursor: 'pointer', display: 'flex', padding: 0 }} title="Delete submission">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Admin Review Board */}
          {isAdmin && pendingApps.length > 0 && (
            <Card variant="glass" style={{ border: '1px solid var(--neon-purple)', background: 'rgba(124, 58, 237, 0.03)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }} className="text-neon-purple">
                <ShieldCheck size={16} /> Pending Showcase Approvals ({pendingApps.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingApps.map((app: any) => (
                  <div key={app.id} style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <img src={app.app_logo_url} alt={app.app_name} style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--glass-border)' }} />
                        <div>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{app.app_name}</h4>
                          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                            By <strong>{app.student_name}</strong> ({app.batch}) · mob: {app.mobile_no}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Button variant="success" size="sm" onClick={() => handleApprove(app.id)} disabled={actionLoading === app.id}>
                          Approve
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleReject(app.id)} disabled={actionLoading === app.id}>
                          Reject
                        </Button>
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <p style={{ margin: '0 0 6px 0' }}><strong>Problem:</strong> {app.problem_addressing}</p>
                      <p style={{ margin: 0 }}><strong>Solution:</strong> {app.solution}</p>
                    </div>
                    <a href={app.working_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--neon-cyan)', textDecoration: 'none', fontWeight: 600 }}>
                      <LinkIcon size={12} /> Live Link: {app.working_url} <ExternalLink size={10} />
                    </a>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Main Showcase Grid */}
          {approvedApps.length === 0 ? (
            <Card variant="glass" style={{ textAlign: 'center', padding: 'var(--space-2xl) var(--space-md)' }}>
              <Rocket size={36} className="text-secondary" style={{ margin: '0 auto var(--space-sm) auto', opacity: 0.5 }} />
              <h3 style={{ margin: 0 }}>No apps showcased yet</h3>
              <p className="text-secondary text-sm" style={{ margin: '6px 0 0 0' }}>
                Be the first to submit your app and see it live on the Hall of Fame!
              </p>
            </Card>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 'var(--space-md)'
              }}>
                {visibleApps.map((app: any) => (
                  <Card 
                    key={app.id} 
                    variant="glass" 
                    className="hover-lift"
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      textAlign: 'center',
                      padding: '16px 12px', 
                      cursor: 'pointer', 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-lg)',
                      transition: 'all 0.25s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      minHeight: '230px',
                      justifyContent: 'space-between'
                    }}
                    onClick={() => setSelectedApp(app)}
                  >
                    {/* Top Center: App Icon */}
                    <div style={{ position: 'relative', width: 60, height: 60, marginTop: '4px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0, border: '1.5px solid rgba(0, 240, 255, 0.4)', boxShadow: '0 6px 18px rgba(0, 240, 255, 0.15)' }}>
                      <img src={app.app_logo_url} alt={app.app_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>

                    {/* Middle: App Name & Author */}
                    <div style={{ width: '100%', padding: '6px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.25, letterSpacing: '-0.2px' }}>
                        {app.app_name}
                      </h3>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                        By {app.student_name}
                      </p>
                    </div>

                    {/* Bottom: See & Open Action Buttons */}
                    <div style={{ display: 'flex', width: '100%', gap: '6px', marginTop: 'auto', paddingTop: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedApp(app)}
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '6px 0',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(0, 240, 255, 0.08)',
                          border: '1px solid rgba(0, 240, 255, 0.25)',
                          color: 'var(--neon-cyan)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0, 240, 255, 0.2)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0, 240, 255, 0.08)'; }}
                        title="See details"
                      >
                        <Eye size={12} /> See
                      </button>
                      
                      <a 
                        href={app.working_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          flex: 1,
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: '4px', 
                          padding: '6px 0', 
                          fontSize: '11px', 
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm)',
                          background: 'linear-gradient(135deg, var(--neon-cyan), #00c9db)',
                          border: 'none',
                          color: '#000',
                          textDecoration: 'none',
                          boxShadow: '0 2px 10px rgba(0, 240, 255, 0.3)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        title="Open application"
                      >
                        Open <ExternalLink size={11} />
                      </a>
                    </div>
                  </Card>
                ))}
              </div>

              {isMobile && approvedApps.length > 3 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => setShowAllApps(!showAllApps)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '20px', padding: '8px 20px', fontSize: '13px', fontWeight: 600 }}
                  >
                    {showAllApps ? (
                      <>Show Less <ChevronUp size={16} /></>
                    ) : (
                      <>Show All Apps ({approvedApps.length}) <ChevronDown size={16} /></>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>

      {/* Submission Modal Sheet */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-md)' }}>
          <div style={{ position: 'fixed', inset: 0 }} onClick={() => { if (!isSubmitting) setShowSubmitModal(false); }} />
          <Card variant="glass" style={{ width: '100%', maxWidth: '580px', background: 'var(--bg-secondary)', zIndex: 2001, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-lg)', margin: '0 0 16px 0' }}>
              <Rocket className="text-neon-cyan" size={20} /> Submit Your App Showcase
            </h2>
            
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {error && <div style={{ color: 'var(--neon-red)', fontSize: '13px', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={15} /> {error}</div>}
              {success && <div style={{ color: 'var(--neon-emerald)', fontSize: '13px', background: 'rgba(34, 197, 94, 0.1)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={15} /> {success}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input label="App / Project Name" name="app_name" value={appName} onChange={(e) => setAppName(e.target.value)} required placeholder="e.g. Smart Doubt Solver" />
                <Input label="Student Name" name="student_name" value={studentName} onChange={(e) => setStudentName(e.target.value)} required placeholder="Your full name" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input label="Mobile No" name="mobile_no" value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} required placeholder="e.g. 9876543210" />
                <Input label="Batch / Year" name="batch" value={batch} onChange={(e) => setBatch(e.target.value)} required placeholder="e.g. CSE 2026, sem 3" />
              </div>

              <TextArea label="What Problem is this app addressing?" name="problem_addressing" value={problemAddressing} onChange={(e) => setProblemAddressing(e.target.value)} required placeholder="Describe the problem area your app targets..." rows={2} />
              
              <TextArea label="What is your Solution?" name="solution" value={solution} onChange={(e) => setSolution(e.target.value)} required placeholder="Explain your implementation, tools used, and solution details..." rows={2} />

              <Input label="Working Website / PlayStore App URL" name="working_url" type="url" value={workingUrl} onChange={(e) => setWorkingUrl(e.target.value)} required placeholder="https://my-app.vercel.app" />

              {/* Logo Upload Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>App Icon / Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--neon-cyan)' }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', border: '1px dashed var(--glass-border)', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
                      <Smartphone size={20} />
                    </div>
                  )}
                  <label style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--bg-elevated)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Upload size={14} /> Upload Image
                    <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <Button type="button" variant="ghost" onClick={() => setShowSubmitModal(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  Submit Application
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Details View Modal - PlayStore / AppStore Style */}
      {selectedApp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-md)' }}>
          <div style={{ position: 'fixed', inset: 0 }} onClick={() => setSelectedApp(null)} />
          
          <Card 
            variant="glass" 
            style={{ 
              width: '100%', 
              maxWidth: '620px', 
              background: 'var(--bg-elevated)', 
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              zIndex: 2001, 
              maxHeight: '90vh', 
              overflowY: 'auto', 
              padding: '0', 
              position: 'relative',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}
          >
            {/* PlayStore Style Header Banner */}
            <div 
              style={{ 
                padding: '24px 24px 18px 24px', 
                borderBottom: '1px solid var(--glass-border)', 
                background: 'linear-gradient(180deg, rgba(6,182,212,0.08) 0%, rgba(0,0,0,0) 100%)',
                position: 'relative'
              }}
            >
              <button 
                onClick={() => setSelectedApp(null)} 
                style={{ 
                  position: 'absolute', 
                  top: '18px', 
                  right: '18px', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--glass-border)', 
                  color: 'var(--text-muted)', 
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer', 
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                title="Close"
              >
                ✕
              </button>

              <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                <img 
                  src={selectedApp.app_logo_url} 
                  alt={selectedApp.app_name} 
                  style={{ 
                    width: '72px', 
                    height: '72px', 
                    borderRadius: '16px', 
                    objectFit: 'cover', 
                    border: '1px solid var(--neon-cyan)', 
                    boxShadow: '0 8px 24px rgba(0, 240, 255, 0.2)',
                    flexShrink: 0
                  }} 
                />
                <div style={{ flex: 1, minWidth: 0, paddingRight: '28px' }}>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                    {selectedApp.app_name}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--neon-cyan)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>By {selectedApp.student_name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{selectedApp.batch}</span>
                  </p>
                  
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: 'var(--neon-emerald)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, border: '1px solid rgba(16,185,129,0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={11} /> Approved App
                    </span>
                    <span style={{ fontSize: '11px', background: 'rgba(6,182,212,0.15)', color: 'var(--neon-cyan)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, border: '1px solid rgba(6,182,212,0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={11} /> Smart Learn Showcase
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PlayStore Style Content Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Problem Addressed Card */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--neon-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={15} /> Problem Addressed
                </h4>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {selectedApp.problem_addressing}
                </p>
              </div>

              {/* Solution Card */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--neon-purple)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={15} /> Solution & Implementation
                </h4>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {selectedApp.solution}
                </p>
              </div>

              {/* PlayStore Actions Footer */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '18px', marginTop: '8px' }}>
                {isAdmin && (
                  <Button variant="danger" size="sm" onClick={() => handleDelete(selectedApp.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Trash2 size={14} /> Delete App
                  </Button>
                )}

                <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
                  <Button variant="secondary" size="md" onClick={() => setSelectedApp(null)}>
                    Close
                  </Button>
                  <a 
                    href={selectedApp.working_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-primary"
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                      fontWeight: 800,
                      padding: '10px 22px',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--glow-cyan)'
                    }}
                  >
                    🚀 Launch Application <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
