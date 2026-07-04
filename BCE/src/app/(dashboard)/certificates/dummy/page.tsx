import Link from 'next/link';
import Button from '@/components/ui/Button';
import PrintButton from '../[id]/PrintButton';
import '../[id]/Certificate.css';
import { createClient } from '@/lib/supabase/server';

export default async function DummyCertificatePage({ searchParams }: { searchParams: Promise<{ courseId?: string }> }) {
  const { courseId } = await searchParams;
  
  const supabase = await createClient();
  
  let studentName = 'Your Name Here';
  let instituteId = 'YOUR-INSTITUTE-ID';
  let courseName = 'Advanced Web Development';
  let companyName = 'Smart Learning APP';

  if (courseId) {
    const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single();
    if (course && course.title) {
      courseName = course.title;
    }
  }

  const { data: settings } = await supabase.from('company_settings').select('company_name').single();
  if (settings && settings.company_name) {
    companyName = settings.company_name;
  }

  const issueDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="certificate-page">
      <div className="certificate-actions">
        <Link href={courseId ? `/courses/${courseId}` : "/profile"} style={{ textDecoration: 'none' }}>
          <Button variant="ghost" style={{ color: 'var(--text-secondary)' }}>← Back</Button>
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
            <h2 className="cert-name">{studentName}</h2>
            <div className="cert-course">for successfully completed course: <strong>{courseName}</strong></div>
            
            <div style={{ color: '#aaa', marginTop: '0.5rem', fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Institute ID: {instituteId}
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
                {companyName}
              </div>
              <div className="cert-signature-label">Issued By</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
