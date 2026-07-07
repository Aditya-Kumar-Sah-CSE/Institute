import { createClient } from '@/lib/supabase/server';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Image from 'next/image';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { BookOpen, FileText, Users, ExternalLink, Table, Pin, PinOff } from 'lucide-react';
export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch Analytics
  const { count: studentCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
  const { count: instructorRequestCount } = await supabase.from('instructor_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  const { count: courseCount } = await supabase.from('courses').select('*', { count: 'exact', head: true });
  const { count: submissionCount } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  
  // Fetch Settings
  const { data: settings } = await supabase.from('company_settings').select('*').single();

  async function updateSettings(formData: FormData) {
    'use server';
    const sb = await createClient();
    const name = formData.get('company_name') as string;
    const tagline = formData.get('tagline') as string;
    const logoFile = formData.get('logo_file') as File;
    
    // Simplification: updating first row
    const { data: currentSettings } = await sb.from('company_settings').select('*').limit(1).single();
    if (currentSettings) {
      let finalLogoUrl = currentSettings.logo_url;

      if (logoFile && logoFile.size > 0) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await sb.storage.from('branding').upload(fileName, logoFile, { upsert: true });
        
        if (!uploadError && uploadData) {
          const { data: publicUrlData } = sb.storage.from('branding').getPublicUrl(uploadData.path);
          finalLogoUrl = publicUrlData.publicUrl;
        } else {
          console.error("Upload Error:", uploadError);
        }
      }

      await sb.from('company_settings').update({
        company_name: name,
        tagline: tagline,
        logo_url: finalLogoUrl
      }).eq('id', currentSettings.id);
      revalidatePath('/admin');
    }
  }

  async function toggleAdmissionPin() {
    'use server';
    const sb = await createClient();
    const { data: currentSettings } = await sb.from('company_settings').select('*').limit(1).single();
    if (currentSettings) {
      await sb.from('company_settings').update({
        is_admission_pinned: !currentSettings.is_admission_pinned
      }).eq('id', currentSettings.id);
      revalidatePath('/admin');
      revalidatePath('/dashboard');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
      <div className="page-header">
        <h1 className="text-gradient">Admin Overview</h1>
      </div>

      <div className="dashboard-stats-grid">
        <Link href="/admin/students" style={{ textDecoration: 'none' }}>
          <Card variant="glass" padding="lg" hover style={{ height: '100%' }}>
            <div className="stat-card-value" style={{ color: 'var(--neon-cyan)' }}>
              {studentCount || 0}
            </div>
            <div className="text-secondary stat-card-label">Total Students</div>
          </Card>
        </Link>
        
        <Link href="/admin/courses" style={{ textDecoration: 'none' }}>
          <Card variant="glass" padding="lg" hover style={{ height: '100%' }}>
            <div className="stat-card-value" style={{ color: 'var(--neon-magenta)' }}>
              {courseCount || 0}
            </div>
            <div className="text-secondary stat-card-label">Total Courses</div>
          </Card>
        </Link>

        <Link href="/admin/submissions" style={{ textDecoration: 'none' }}>
          <Card variant="glass" padding="lg" hover style={{ height: '100%' }}>
            <div className="stat-card-value" style={{ color: 'var(--neon-gold)' }}>
              {submissionCount || 0}
            </div>
            <div className="text-secondary stat-card-label">Pending Reviews</div>
          </Card>
        </Link>

        <Link href="/admin/instructor-requests" style={{ textDecoration: 'none' }}>
          <Card variant="glass" padding="lg" hover style={{ height: '100%' }}>
            <div className="stat-card-value" style={{ color: 'var(--neon-lime)' }}>
              {instructorRequestCount || 0}
            </div>
            <div className="text-secondary stat-card-label">Faculty Requests</div>
          </Card>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'var(--space-xl)' }}>
        <Card variant="glass">
          <h2 style={{ marginBottom: 'var(--space-lg)', fontSize: 'var(--text-xl)' }}>Institute Settings</h2>
          <form action={updateSettings} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <Input 
              name="company_name" 
              label="Institute Name" 
              defaultValue={settings?.company_name || ''} 
            />
            <Input 
              name="tagline" 
              label="Tagline" 
              defaultValue={settings?.tagline || ''} 
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Institute Logo</label>
              <input 
                type="file" 
                name="logo_file" 
                accept="image/*" 
                style={{ padding: 'var(--space-sm)', background: 'var(--bg-input)', color: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', maxWidth: '100%', boxSizing: 'border-box' }}
              />
                {settings?.logo_url && (
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    Current: <Image unoptimized src={settings.logo_url} alt="Current Logo" width={24} height={24} style={{ verticalAlign: 'middle', marginLeft: '8px', borderRadius: '4px', width: 'auto', height: '24px' }} />
                  </span>
                )}
            </div>
            <div style={{ marginTop: 'var(--space-sm)' }}>
              <Button type="submit" variant="primary">Save Settings</Button>
            </div>
          </form>
        </Card>

        <Card variant="glass">
          <h2 style={{ marginBottom: 'var(--space-lg)', fontSize: 'var(--text-xl)' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <a href="/admin/courses" className="btn btn-secondary btn-md" style={{ justifyContent: 'flex-start', gap: '12px', height: 'auto', minHeight: '40px', padding: '12px 16px', textAlign: 'left' }}>
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}><BookOpen className="w-5 h-5 text-neon-cyan" /></span>
              <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' }}>Manage Courses & Lessons</span>
            </a>
            <a href="/admin/submissions" className="btn btn-secondary btn-md" style={{ justifyContent: 'flex-start', gap: '12px', height: 'auto', minHeight: '40px', padding: '12px 16px', textAlign: 'left' }}>
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}><FileText className="w-5 h-5 text-neon-gold" /></span>
              <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' }}>Review Pending Submissions</span>
            </a>
            <a href="/admin/students" className="btn btn-secondary btn-md" style={{ justifyContent: 'flex-start', gap: '12px', height: 'auto', minHeight: '40px', padding: '12px 16px', textAlign: 'left' }}>
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}><Users className="w-5 h-5 text-neon-magenta" /></span>
              <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' }}>User Administration</span>
            </a>
            <hr style={{ border: 'none', borderBottom: '1px solid var(--glass-border)', margin: 'var(--space-xs) 0' }} />
            <form action={toggleAdmissionPin} style={{ width: '100%', display: 'flex' }}>
              <button type="submit" className="btn btn-secondary btn-md" style={{ width: '100%', justifyContent: 'flex-start', gap: '12px', background: settings?.is_admission_pinned ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 242, 254, 0.1)', border: settings?.is_admission_pinned ? '1px solid var(--neon-red)' : '1px solid var(--neon-cyan)', color: settings?.is_admission_pinned ? 'var(--neon-red)' : 'var(--neon-cyan)', cursor: 'pointer', height: 'auto', minHeight: '40px', padding: '12px 16px', textAlign: 'left' }}>
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {settings?.is_admission_pinned ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
                </span>
                <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' }}>
                  {settings?.is_admission_pinned ? "Unpin Admission form from Dashboards" : "Pin Admission form to Dashboards"}
                </span>
              </button>
            </form>
            <a href="https://docs.google.com/spreadsheets/d/1EylsjmsbJcJN7w65-oCTqMyrz_YC6o_Akb6_MdDPssU/edit?usp=sharing" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-md" style={{ justifyContent: 'flex-start', gap: '12px', background: 'rgba(57, 255, 20, 0.1)', border: '1px solid var(--neon-lime)', color: 'var(--neon-lime)', height: 'auto', minHeight: '40px', padding: '12px 16px', textAlign: 'left' }}>
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <Table className="w-5 h-5" />
              </span>
              <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' }}>
                View Admission Responses
              </span>
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}


