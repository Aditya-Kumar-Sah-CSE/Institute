import Link from 'next/link';
import Button from '@/components/ui/Button';
import PrintButton from '../[id]/PrintButton';
import '../[id]/Certificate.css';

export default function DummyCertificatePage() {
  const issueDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="certificate-page">
      <div className="certificate-actions">
        <Link href="/profile" style={{ textDecoration: 'none' }}>
          <Button variant="ghost" style={{ color: 'var(--text-secondary)' }}>← Back to Profile</Button>
        </Link>
        <PrintButton />
      </div>

      <div className="certificate-container" id="certificate-node">
        <div className="cert-corner top-right"></div>
        <div className="cert-corner bottom-left"></div>
        
        <div className="certificate-inner">
          <div className="cert-header">
            <h1 className="cert-title">Certificate</h1>
            <div className="cert-subtitle">of Completion (Preview)</div>
          </div>

          <div className="cert-badge">
            <div className="cert-badge-text">
              100%<br/>Completed
            </div>
          </div>

          <div className="cert-body">
            <div className="cert-presented-to">This certificate is proudly presented to</div>
            <h2 className="cert-name">Your Name Here</h2>
            <div className="cert-course">for successfully completing <strong>Demo Course: Advanced Web Development</strong></div>
            
            <div style={{ color: '#aaa', marginTop: '0.5rem', fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Institute ID: YOUR-INSTITUTE-ID
            </div>

            <div className="cert-stats">
              <div className="cert-stat-box">
                <div className="cert-stat-value">1250</div>
                <div className="cert-stat-label">Total XP</div>
              </div>
              <div className="cert-stat-box">
                <div className="cert-stat-value">#1</div>
                <div className="cert-stat-label">Course Rank</div>
              </div>
              <div className="cert-stat-box">
                <div className="cert-stat-value">15/15</div>
                <div className="cert-stat-label">Tasks Done</div>
              </div>
              <div className="cert-stat-box">
                <div className="cert-stat-value">30</div>
                <div className="cert-stat-label">Days Active</div>
              </div>
            </div>
          </div>

          <div className="cert-footer">
            <div className="cert-signature">
              <div className="cert-signature-line">{issueDate}</div>
              <div className="cert-signature-label">Date</div>
            </div>
            <div className="cert-signature">
              <div className="cert-signature-line" style={{ fontFamily: 'var(--font-sans)', fontStyle: 'normal', fontWeight: 'bold', fontSize: '1rem' }}>
                Smart Learning APP
              </div>
              <div className="cert-signature-label">Issued By</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
