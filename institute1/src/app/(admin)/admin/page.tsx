import { createClient, createAdminClient } from '@/lib/supabase/server';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Image from 'next/image';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { BookOpen, FileText, Users, ExternalLink, Table, Pin, PinOff, UserPlus } from 'lucide-react';
import ExpandableSettingsCard from './components/ExpandableSettingsCard';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role, institution_id').eq('id', user?.id).single();
  const isSuperAdmin = profile?.role === 'super_admin' || user?.email === SUPER_ADMIN_EMAIL;
  const instId = profile?.institution_id;

  // Fetch Analytics
  let studentQuery = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
  let instructorRequestQuery = supabase.from('instructor_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  let submissionQuery = supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  let courseQuery = supabase.from('courses').select('*', { count: 'exact', head: true });

  if (!isSuperAdmin && instId) {
    studentQuery = studentQuery.eq('institution_id', instId);
    
    // Fetch users for this institution to bound other queries
    const { data: instUsers } = await supabase.from('profiles').select('id').eq('institution_id', instId);
    const userIds = instUsers?.map(u => u.id) || [];
    
    if (userIds.length > 0) {
      instructorRequestQuery = instructorRequestQuery.in('user_id', userIds);
      submissionQuery = submissionQuery.in('user_id', userIds);
      courseQuery = courseQuery.in('created_by', userIds);
    } else {
      // If no users, counts should explicitly be 0
      instructorRequestQuery = instructorRequestQuery.eq('user_id', 'impossible-uuid');
      submissionQuery = submissionQuery.eq('user_id', 'impossible-uuid');
      courseQuery = courseQuery.eq('created_by', 'impossible-uuid');
    }
  }

  const { count: studentCount } = await studentQuery;
  const { count: instructorRequestCount } = await instructorRequestQuery;
  const { count: submissionCount } = await submissionQuery;
  const { count: courseCount } = await courseQuery;

  // Fetch Settings based on Role
  let settings: any = null;
  let instSettings: any = null;
  
  if (isSuperAdmin) {
    const { data } = await supabase.from('company_settings').select('*').single();
    settings = data;
  } else if (instId) {
    const adminSb = await createAdminClient();
    const { data } = await adminSb.from('institutions').select('*').eq('id', instId).single();
    instSettings = data;
  }

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

  async function updateInstSettings(formData: FormData) {
    'use server';
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { data: p } = await sb.from('profiles').select('role, institution_id').eq('id', user.id).single();
    if (p?.role !== 'admin' || !p.institution_id) return;

    const name = formData.get('company_name') as string;
    const logoFile = formData.get('logo_file') as File;
    
    const adminSb = await createAdminClient();
    const { data: currentInst } = await adminSb.from('institutions').select('logo').eq('id', p.institution_id).single();
    let finalLogoUrl = currentInst?.logo;

    if (logoFile && logoFile.size > 0) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await sb.storage.from('branding').upload(fileName, logoFile, { upsert: true });
      if (!uploadError && uploadData) {
        const { data: publicUrlData } = sb.storage.from('branding').getPublicUrl(uploadData.path);
        finalLogoUrl = publicUrlData.publicUrl;
      }
    }

    await adminSb.from('institutions').update({
      name: name,
      logo: finalLogoUrl
    }).eq('id', p.institution_id);
    revalidatePath('/admin');
  }

  async function toggleAdmissionPin() {
    'use server';
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    const { data: p } = await sb.from('profiles').select('role').eq('id', user?.id).single();
    if (p?.role !== 'super_admin') return;

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
          <Card variant="glass" padding="lg" className="stat-card hover-lift" style={{ height: '100%' }}>
            <div className="stat-card-icon" style={{ background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)', color: 'var(--accent-primary)' }}>
              <Users size={24} />
            </div>
            <div className="stat-card-content">
              <div className="stat-card-value" style={{ color: 'var(--accent-primary)' }}>
                {studentCount || 0}
              </div>
              <div className="text-secondary stat-card-label">Total Students</div>
            </div>
          </Card>
        </Link>
        
        <Link href="/admin/courses" style={{ textDecoration: 'none' }}>
          <Card variant="glass" padding="lg" className="stat-card hover-lift" style={{ height: '100%' }}>
            <div className="stat-card-icon" style={{ background: 'color-mix(in srgb, var(--accent-secondary) 10%, transparent)', color: 'var(--accent-secondary)' }}>
              <BookOpen size={24} />
            </div>
            <div className="stat-card-content">
              <div className="stat-card-value" style={{ color: 'var(--accent-secondary)' }}>
                {courseCount || 0}
              </div>
              <div className="text-secondary stat-card-label">Total Courses</div>
            </div>
          </Card>
        </Link>

        <Link href="/admin/submissions" style={{ textDecoration: 'none' }}>
          <Card variant="glass" padding="lg" className="stat-card hover-lift" style={{ height: '100%' }}>
            <div className="stat-card-icon" style={{ background: 'color-mix(in srgb, var(--accent-warning) 10%, transparent)', color: 'var(--accent-warning)' }}>
              <FileText size={24} />
            </div>
            <div className="stat-card-content">
              <div className="stat-card-value" style={{ color: 'var(--accent-warning)' }}>
                {submissionCount || 0}
              </div>
              <div className="text-secondary stat-card-label">Pending Reviews</div>
            </div>
          </Card>
        </Link>

        <Link href="/admin/instructor-requests" style={{ textDecoration: 'none' }}>
          <Card variant="glass" padding="lg" className="stat-card hover-lift" style={{ height: '100%' }}>
            <div className="stat-card-icon" style={{ background: 'color-mix(in srgb, var(--accent-success) 10%, transparent)', color: 'var(--accent-success)' }}>
              <UserPlus size={24} />
            </div>
            <div className="stat-card-content">
              <div className="stat-card-value" style={{ color: 'var(--accent-success)' }}>
                {instructorRequestCount || 0}
              </div>
              <div className="text-secondary stat-card-label">Faculty Requests</div>
            </div>
          </Card>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'var(--space-xl)' }}>
        {isSuperAdmin ? (
          <ExpandableSettingsCard title="Global Platform Settings">
            <form action={updateSettings} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Input 
                name="company_name" 
                label="Global Platform Name" 
                defaultValue={settings?.company_name || ''} 
              />
              <Input 
                name="tagline" 
                label="Global Tagline" 
                defaultValue={settings?.tagline || ''} 
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Global Logo</label>
                <input 
                  type="file" 
                  name="logo_file" 
                  accept="image/*" 
                  style={{ padding: 'var(--space-sm)', background: 'var(--bg-input)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', maxWidth: '100%', boxSizing: 'border-box' }}
                />
                  {settings?.logo_url && (
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      Current: <Image unoptimized src={settings.logo_url} alt="Current Logo" width={24} height={24} style={{ verticalAlign: 'middle', marginLeft: '8px', borderRadius: '4px', width: 'auto', height: '24px' }} />
                    </span>
                  )}
              </div>
              <div style={{ marginTop: 'var(--space-sm)' }}>
                <Button type="submit" variant="primary">Save Global Settings</Button>
              </div>
            </form>
          </ExpandableSettingsCard>
        ) : (
          <ExpandableSettingsCard title="Institute Settings">
            <form action={updateInstSettings} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Input 
                name="company_name" 
                label="Institute Name" 
                defaultValue={instSettings?.name || ''} 
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Institute Logo</label>
                <input 
                  type="file" 
                  name="logo_file" 
                  accept="image/*" 
                  style={{ padding: 'var(--space-sm)', background: 'var(--bg-input)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', maxWidth: '100%', boxSizing: 'border-box' }}
                />
                  {instSettings?.logo && (
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      Current: <Image unoptimized src={instSettings.logo} alt="Current Logo" width={24} height={24} style={{ verticalAlign: 'middle', marginLeft: '8px', borderRadius: '4px', width: 'auto', height: '24px' }} />
                    </span>
                  )}
              </div>
              <div style={{ marginTop: 'var(--space-sm)' }}>
                <Button type="submit" variant="primary">Save Settings</Button>
              </div>
            </form>
          </ExpandableSettingsCard>
        )}

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
            {isSuperAdmin && (
              <>
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
              </>
            )}
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


