'use client';

import React, { useState, useTransition } from 'react';
import { updateSlug, connectCustomDomain, removeCustomDomain, verifyDomain, updatePrimaryDomain } from '@/features/admin/actions/domainActions';
import { 
  Building2, Globe, Shield, Activity, Save, 
  ExternalLink, Copy, CheckCircle2, AlertCircle, RefreshCw, X, Edit2, Lock
} from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import styles from './DomainDetail.module.css';

export default function DomainDetailClient({ 
  _institution, 
  rootDomain 
}: { 
  _institution: any;
  rootDomain: string; 
}) {
  const [institution, setInstitution] = useState(_institution);
  const [slug, setSlug] = useState(institution.slug);
  const [customDomain, setCustomDomain] = useState(institution.custom_domain || '');
  
  // Inline edit state for Primary Domain
  const [isEditingPrimary, setIsEditingPrimary] = useState(false);
  const [primaryDomainInput, setPrimaryDomainInput] = useState(institution.primary_domain);

  const [isPending, startTransition] = useTransition();

  const devUrl = `http://localhost:3000/${institution.slug}`;
  const prodUrl = `https://${institution.primary_domain}`;
  const activeCustomUrl = institution.custom_domain ? `https://${institution.custom_domain}` : null;

  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSlugUpdate = () => {
    if (slug === institution.slug) return;
    startTransition(async () => {
      const res = await updateSlug(institution.id, slug);
      if (res.error) {
        alert(res.error);
      } else {
        alert('Slug updated successfully! Primary domain updated automatically.');
        setInstitution((prev: any) => ({
          ...prev, 
          slug: res.newSlug, 
          primary_domain: res.newPrimaryDomain,
          domain_history: [...(prev.domain_history || []), { event: 'slug_changed', to: res.newSlug, timestamp: new Date().toISOString() }]
        }));
        setPrimaryDomainInput(res.newPrimaryDomain);
      }
    });
  };

  const handlePrimaryDomainUpdate = () => {
    const newDomain = primaryDomainInput.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (newDomain === institution.primary_domain) {
      setIsEditingPrimary(false);
      return;
    }
    startTransition(async () => {
      const res = await updatePrimaryDomain(institution.id, newDomain);
      if (res.error) {
        alert(res.error);
      } else {
        alert('Primary Domain manually updated!');
        setInstitution((prev: any) => ({
           ...prev,
           primary_domain: res.newPrimaryDomain,
           domain_history: [...(prev.domain_history || []), { event: 'primary_domain_updated', to: res.newPrimaryDomain, timestamp: new Date().toISOString() }]
        }));
        setIsEditingPrimary(false);
      }
    });
  };

  const handleConnect = () => {
    startTransition(async () => {
      const res = await connectCustomDomain(institution.id, customDomain);
      if (res.error) alert(res.error);
      else {
        alert('Custom domain registered! Please complete DNS verification.');
        setInstitution((prev: any) => ({
          ...prev, 
          custom_domain: customDomain, 
          domain_status: 'pending', 
          ssl_status: 'pending',
          domain_history: [...(prev.domain_history || []), { event: 'custom_domain_added', domain: customDomain, timestamp: new Date().toISOString() }]
        }));
      }
    });
  };

  const handleRemove = () => {
    if (!confirm('Remove this custom domain? Users will no longer be able to access the site via this URL.')) return;
    startTransition(async () => {
      const res = await removeCustomDomain(institution.id);
      if (res.error) alert(res.error);
      else {
        setCustomDomain('');
        setInstitution((prev: any) => ({
          ...prev, 
          custom_domain: null, 
          domain_status: 'pending',
          domain_history: [...(prev.domain_history || []), { event: 'custom_domain_removed', domain: prev.custom_domain, timestamp: new Date().toISOString() }]
        }));
      }
    });
  };

  const handleVerify = () => {
    startTransition(async () => {
      const res = await verifyDomain(institution.id);
      if (res.error) alert(res.error);
      else {
        alert('Domain verified successfully!');
        setInstitution((prev: any) => ({
          ...prev, 
          domain_status: 'verified', 
          ssl_status: 'ready',
          verified_at: new Date().toISOString(),
          domain_history: [...(prev.domain_history || []), { event: 'domain_verified', domain: prev.custom_domain, timestamp: new Date().toISOString() }]
        }));
      }
    });
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: 'numeric'
    }).format(new Date(dateString));
  };

  const history = [...(institution.domain_history || [])].reverse();

  return (
    <div className={styles.page}>
      
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.headerLogo}>
          {institution.name.slice(0,2)}
        </div>
        <div className={styles.headerInfo}>
          <h1 className={styles.headerName}>{institution.name}</h1>
          <div className={styles.headerMeta}>
            <span className={styles.headerBadge} style={{ background: 'rgba(255,255,255,0.1)' }}>
              Id: {institution.id.split('-')[0]}
            </span>
            <span className={`${styles.headerBadge} ${institution.status === 'active' ? styles.badgeActive : ''}`}>
              {institution.status.toUpperCase()}
            </span>
            <span className={`${styles.headerBadge} ${styles.badgeDate}`}>
              Created: {formatDate(institution.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.twoCol}>
         {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* SECTION 1: CURRENT URLS */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={`${styles.sectionIcon} ${styles.iconCyan}`}>
                <Globe size={18} />
              </div>
              <h2 className={styles.sectionTitle}>Current URLs</h2>
            </div>
            
            <div className={styles.urlRow}>
              <div className={styles.urlLabel}>Development</div>
              <div className={styles.urlValue}>{devUrl}</div>
              <div className={styles.urlActions}>
                <button className={styles.iconBtn} onClick={() => handleCopy(devUrl, 'dev')} title="Copy URL">
                  {copied === 'dev' ? <CheckCircle2 size={14} className="text-neon-green" /> : <Copy size={14} />}
                </button>
                <a href={devUrl} target="_blank" rel="noreferrer" className={styles.iconBtn} title="Open in New Tab"><ExternalLink size={14} /></a>
              </div>
            </div>

            <div className={styles.urlRow}>
              <div className={styles.urlLabel}>Production</div>
              {isEditingPrimary ? (
                <div style={{ display: 'flex', flex: 1, gap: '0.5rem' }}>
                  <input
                    className={styles.slugInput}
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                    value={primaryDomainInput}
                    onChange={(e) => setPrimaryDomainInput(e.target.value)}
                    placeholder="e.g. https://institute1-seven.vercel.app/bce-bhagalpur"
                  />
                  <div className={styles.urlActions}>
                    <button className={styles.iconBtn} style={{ color: 'var(--neon-green)', borderColor: 'var(--neon-green)' }} onClick={handlePrimaryDomainUpdate} disabled={isPending}>
                      {isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    </button>
                    <button className={styles.iconBtn} onClick={() => { setIsEditingPrimary(false); setPrimaryDomainInput(institution.primary_domain); }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.urlValue}>{prodUrl}</div>
                  <div className={styles.urlActions}>
                    <button className={styles.iconBtn} onClick={() => setIsEditingPrimary(true)} title="Edit Domain Manually">
                      <Edit2 size={14} />
                    </button>
                    <button className={styles.iconBtn} onClick={() => handleCopy(prodUrl, 'prod')} title="Copy URL">
                      {copied === 'prod' ? <CheckCircle2 size={14} className="text-neon-green" /> : <Copy size={14} />}
                    </button>
                    <a href={prodUrl} target="_blank" rel="noreferrer" className={styles.iconBtn} title="Open in New Tab"><ExternalLink size={14} /></a>
                  </div>
                </>
              )}
            </div>

            <div className={styles.urlRow} style={{ marginBottom: 0 }}>
              <div className={styles.urlLabel}>Custom Domain</div>
              {activeCustomUrl ? (
                <>
                  <div className={styles.urlValue} style={{ color: 'var(--neon-pink)' }}>{activeCustomUrl}</div>
                  <div className={styles.urlActions}>
                    <button className={styles.iconBtn} onClick={() => handleCopy(activeCustomUrl, 'custom')} title="Copy URL">
                      {copied === 'custom' ? <CheckCircle2 size={14} className="text-neon-green" /> : <Copy size={14} />}
                    </button>
                    <a href={activeCustomUrl} target="_blank" rel="noreferrer" className={styles.iconBtn} title="Open in New Tab"><ExternalLink size={14} /></a>
                  </div>
                </>
              ) : (
                <div className={styles.urlValueNone}>Not Connected</div>
              )}
            </div>
          </div>

          {/* SECTION 2: SUBDOMAIN SETTINGS */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={`${styles.sectionIcon} ${styles.iconPurple}`}>
                <Building2 size={18} />
              </div>
              <h2 className={styles.sectionTitle}>Subdomain Slug</h2>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Changing the slug instantly modifies your primary routing architecture. Old links utilizing the previous slug will instantly break.
            </p>

            <div className={styles.slugInputRow}>
              <div className={styles.slugInputWrapper}>
                <input 
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9-]/g, ''))}
                  className={`${styles.slugInput} ${slug !== institution.slug ? styles.pendingState : ''}`}
                  placeholder="e.g. bce-bhagalpur"
                />
                
                <div className={styles.validationGrid}>
                  <div className={`${styles.validationItem} ${slug.length >= 2 ? styles.valid : ''}`}>
                    <CheckCircle2 size={12} /> Min 2 characters
                  </div>
                  <div className={`${styles.validationItem} ${!slug.includes(' ') && slug.length > 0 ? styles.valid : ''}`}>
                    <CheckCircle2 size={12} /> No spaces
                  </div>
                  <div className={`${styles.validationItem} ${/^[a-z0-9-]*$/.test(slug) ? styles.valid : ''}`}>
                    <CheckCircle2 size={12} /> Valid format (a-z, 0-9, -)
                  </div>
                </div>
              </div>

              <Button 
                variant="primary" 
                disabled={slug === institution.slug || slug.length < 2 || isPending}
                onClick={handleSlugUpdate}
                style={{ height: '48px' }}
              >
                {isPending ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Save</span>
              </Button>
            </div>

            <div className={styles.slugPreview}>
              <div className={styles.slugPreviewItem}>
                <span className="text-neon-cyan">DEV:</span> http://localhost:3000/{slug || '...'}
              </div>
              <div className={styles.slugPreviewItem}>
                <span className="text-neon-purple">PROD:</span> https://{slug || '...'}.{rootDomain}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* SECTION 5: PREVIEW */}
          <div className={styles.section} style={{ padding: 0 }}>
             <div className={styles.previewFrame}>
               <div className={styles.previewBar}>
                 <div style={{ display: 'flex', gap: '6px' }}>
                   <div className={styles.previewDot} style={{ background: '#ff5f56' }} />
                   <div className={styles.previewDot} style={{ background: '#ffbd2e' }} />
                   <div className={styles.previewDot} style={{ background: '#27c93f' }} />
                 </div>
                 <div className={styles.previewUrl}>
                   <Lock size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: 'rgba(255,255,255,0.4)' }} />
                   {activeCustomUrl ? activeCustomUrl.replace('https://', '') : prodUrl.replace('https://', '')}
                 </div>
               </div>
               <div className={styles.previewContent}>
                 <Globe size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                 <div>Live Routing Engine Ready.</div>
                 <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Connected via Vercel Edge Network.</div>
               </div>
             </div>
          </div>

          {/* SECTION 3: CUSTOM DOMAIN */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={`${styles.sectionIcon} ${styles.iconPink}`}>
                <Shield size={18} />
              </div>
              <h2 className={styles.sectionTitle}>Enterprise Custom Domain</h2>
            </div>
            
            <div className={styles.domainInputRow}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input 
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
                  className={styles.domainInput}
                  placeholder="e.g. lms.yourcollege.edu"
                  disabled={!!institution.custom_domain}
                />
              </div>
            </div>

            <div className={styles.domainActions}>
              {!institution.custom_domain && (
                <Button 
                  variant="primary" 
                  disabled={!customDomain.includes('.') || isPending}
                  onClick={handleConnect}
                >
                  {isPending ? <RefreshCw size={16} className="animate-spin" /> : 'Connect Domain'}
                </Button>
              )}
              
              {institution.custom_domain && institution.domain_status !== 'verified' && (
                <Button 
                  variant="secondary" 
                  onClick={handleVerify}
                  disabled={isPending}
                >
                  Verify Now
                </Button>
              )}

              {institution.custom_domain && (
                <Button 
                  variant="danger" 
                  onClick={handleRemove}
                  disabled={isPending}
                >
                  <X size={16} /> Remove
                </Button>
              )}
            </div>

            {institution.custom_domain && (
              <div className={styles.statusRow} style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verification</div>
                  <div className={`${styles.statusBadge} ${institution.domain_status === 'verified' ? styles.statusVerified : styles.statusPending}`}>
                    {institution.domain_status === 'pending' && <div className={styles.statusDot} />}
                    {institution.domain_status}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SSL / TLS</div>
                  <div className={`${styles.statusBadge} ${institution.ssl_status === 'ready' ? styles.statusVerified : styles.statusPending}`}>
                    {institution.ssl_status === 'pending' && <div className={styles.statusDot} />}
                    {institution.ssl_status}
                  </div>
                </div>
              </div>
            )}

            {institution.custom_domain && institution.domain_status !== 'verified' && (
              <div className={styles.dnsBox}>
                <h4 className={styles.dnsTitle}>
                  <AlertCircle size={16} className="text-neon-cyan" /> DNS Configuration Required
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Please add the following CNAME record to your domain's DNS settings to authorize traffic.
                </p>
                <table className={styles.dnsTable}>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Name / Host</th>
                      <th>Value / Points To</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>CNAME</td>
                      <td>{institution.custom_domain.split('.')[0] === 'www' ? 'www' : institution.custom_domain.split('.')[0]}</td>
                      <td className={styles.dnsValue}>
                        cname.vercel-dns.com. 
                        <button className={styles.iconBtn} onClick={() => handleCopy('cname.vercel-dns.com.', 'cname')} style={{ padding: '0.2rem 0.4rem' }}>
                          <Copy size={12} />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* SECTION 4: DOMAIN HISTORY */}
          <div className={styles.section}>
             <div className={styles.sectionHeader} style={{ marginBottom: '1rem' }}>
              <div className={`${styles.sectionIcon} ${styles.iconGreen}`}>
                <Activity size={18} />
              </div>
              <h2 className={styles.sectionTitle}>Domain TimelineLog</h2>
            </div>
            
            {history.length > 0 ? (
              <div className={styles.timeline}>
                {history.map((item, idx) => (
                  <div key={idx} className={styles.timelineItem}>
                    <div className={styles.timelineLine}>
                      <div className={styles.timelineDot} />
                      {idx !== history.length - 1 && <div className={styles.timelineConnector} />}
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineEvent}>
                        {item.event.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </div>
                      {item.domain && <div style={{ fontSize: '0.8125rem', color: 'var(--neon-pink)', marginTop: '0.25rem' }}>{item.domain}</div>}
                      {item.to && <div style={{ fontSize: '0.8125rem', color: 'var(--neon-cyan)', marginTop: '0.25rem' }}>New slug: {item.to}</div>}
                      <div className={styles.timelineTime}>{formatDate(item.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyHistory}>No domain changes recorded yet.</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
