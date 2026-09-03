'use client';

import React, { useState } from 'react';
import { ExternalCertificate } from '@/types/database';
import { updateExternalCertificatesAction, uploadCertificateFileAction } from '@/features/profile/actions/profile';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Award, Plus, Trash2, Edit3, Save, X, ExternalLink, FileCheck, Upload } from 'lucide-react';

interface ExternalCertificatesManagerProps {
  initialCertificates?: ExternalCertificate[];
}

export default function ExternalCertificatesManager({ initialCertificates = [] }: ExternalCertificatesManagerProps) {
  const [certificates, setCertificates] = useState<ExternalCertificate[]>(initialCertificates);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [date, setDate] = useState('');
  const [credentialUrl, setCredentialUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setTitle('');
    setIssuer('');
    setDate('');
    setCredentialUrl('');
    setFileUrl('');
    setIsEditing(true);
  };

  const handleOpenEdit = (c: ExternalCertificate) => {
    setEditingId(c.id);
    setTitle(c.title);
    setIssuer(c.issuer);
    setDate(c.date);
    setCredentialUrl(c.credentialUrl || '');
    setFileUrl(c.fileUrl || '');
    setIsEditing(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    const res = await uploadCertificateFileAction(formData);
    setIsUploading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.url) {
      setFileUrl(res.url);
    }
  };

  const handleSaveItem = async () => {
    if (!title.trim() || !issuer.trim()) {
      setError('Certificate Title and Issuing Organization are required.');
      return;
    }

    setError('');
    let updated: ExternalCertificate[];

    if (editingId) {
      updated = certificates.map(c => c.id === editingId ? {
        id: editingId,
        title: title.trim(),
        issuer: issuer.trim(),
        date: date.trim(),
        credentialUrl: credentialUrl.trim(),
        fileUrl: fileUrl.trim()
      } : c);
    } else {
      const newItem: ExternalCertificate = {
        id: crypto.randomUUID(),
        title: title.trim(),
        issuer: issuer.trim(),
        date: date.trim(),
        credentialUrl: credentialUrl.trim(),
        fileUrl: fileUrl.trim()
      };
      updated = [...certificates, newItem];
    }

    setIsLoading(true);
    const res = await updateExternalCertificatesAction(updated);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setCertificates(updated);
      setIsEditing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this certificate?')) return;

    const updated = certificates.filter(c => c.id !== id);
    setIsLoading(true);
    const res = await updateExternalCertificatesAction(updated);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setCertificates(updated);
    }
  };

  return (
    <Card variant="glass" className="profile-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
        <h2 className="section-title-sm" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={18} style={{ color: 'var(--neon-gold)' }} /> External Certifications
        </h2>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={handleOpenAdd} style={{ color: 'var(--neon-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={14} /> Add Certificate
          </Button>
        )}
      </div>

      {error && <p style={{ color: 'var(--neon-red)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-sm)' }}>{error}</p>}

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', padding: 'var(--space-md)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
          <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--neon-gold)' }}>
            {editingId ? 'Edit Certificate' : 'Add New Certificate'}
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            <Input 
              placeholder="Certificate Title (e.g. AWS Certified Cloud Practitioner)" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              disabled={isLoading || isUploading}
            />
            <Input 
              placeholder="Issuing Organization (e.g. AWS, Coursera, NPTEL)" 
              value={issuer} 
              onChange={e => setIssuer(e.target.value)} 
              disabled={isLoading || isUploading}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            <Input 
              placeholder="Issue Date (e.g. May 2024)" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              disabled={isLoading || isUploading}
            />
            <Input 
              placeholder="Credential URL / Verification Link" 
              value={credentialUrl} 
              onChange={e => setCredentialUrl(e.target.value)} 
              disabled={isLoading || isUploading}
            />
          </div>

          {/* Certificate Document Upload */}
          <div style={{ padding: 'var(--space-sm)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--glass-border)' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={14} style={{ color: 'var(--neon-gold)' }} /> 
                {fileUrl ? 'Change Certificate File (PDF / Image)' : 'Upload Certificate Document (PDF or Image, max 10MB)'}
              </span>
              <input 
                type="file" 
                accept="application/pdf,image/*"
                onChange={handleFileUpload}
                disabled={isLoading || isUploading}
                style={{ fontSize: '12px', color: 'var(--text-muted)' }}
              />
            </label>
            {isUploading && <p style={{ fontSize: '11px', color: 'var(--neon-cyan)', margin: '4px 0 0 0' }}>Uploading document...</p>}
            {fileUrl && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FileCheck size={12} /> Document attached successfully!
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
            <Button size="sm" onClick={handleSaveItem} isLoading={isLoading || isUploading} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--neon-gold)', color: '#000', fontWeight: 700 }}>
              <Save size={14} /> Save Certificate
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isLoading || isUploading}>
              <X size={14} /> Cancel
            </Button>
          </div>
        </div>
      ) : certificates.length === 0 ? (
        <div style={{ padding: 'var(--space-md)', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--glass-border)' }}>
          <p className="text-muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>No external certifications added yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {certificates.map(c => (
            <div 
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-md)',
                background: 'rgba(255, 215, 0, 0.04)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 215, 0, 0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255, 215, 0, 0.15)', color: 'var(--neon-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                  📜
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--neon-gold)' }}>{c.title}</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>Issuer: {c.issuer}</p>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
                    {c.date && <span>Issued: {c.date}</span>}
                    {c.credentialUrl && (
                      <a 
                        href={c.credentialUrl.startsWith('http') ? c.credentialUrl : `https://${c.credentialUrl}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: 'var(--neon-cyan)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                      >
                        Verify Credential <ExternalLink size={10} />
                      </a>
                    )}
                    {c.fileUrl && (
                      <a 
                        href={c.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: '#10b981', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                      >
                        View Attached File <FileCheck size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(c)} disabled={isLoading} style={{ padding: '6px' }}>
                  <Edit3 size={14} style={{ color: 'var(--text-secondary)' }} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} disabled={isLoading} style={{ padding: '6px' }}>
                  <Trash2 size={14} style={{ color: 'var(--neon-red)' }} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
