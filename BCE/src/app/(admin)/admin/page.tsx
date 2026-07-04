import { createClient } from '@/lib/supabase/server';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Image from 'next/image';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { BookOpen, FileText, Users } from 'lucide-react';
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-xl)' }}>
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
                style={{ padding: 'var(--space-sm)', background: 'var(--bg-input)', color: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}
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
            <a href="/admin/courses" className="btn btn-secondary btn-md" style={{ justifyContent: 'flex-start', gap: '12px' }}>
              <BookOpen className="w-5 h-5 text-neon-cyan" /> Manage Courses & Lessons
            </a>
            <a href="/admin/submissions" className="btn btn-secondary btn-md" style={{ justifyContent: 'flex-start', gap: '12px' }}>
              <FileText className="w-5 h-5 text-neon-gold" /> Review Pending Submissions
            </a>
            <a href="/admin/students" className="btn btn-secondary btn-md" style={{ justifyContent: 'flex-start', gap: '12px' }}>
              <Users className="w-5 h-5 text-neon-magenta" /> User Administration
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
