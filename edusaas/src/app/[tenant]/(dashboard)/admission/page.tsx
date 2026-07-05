import { auth } from '@/lib/auth/auth.config';
import { redirect } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { getTenantDb } from '@/lib/db/tenant';
import { profiles } from '@/lib/db/schema/tenant-schema';
import { eq } from 'drizzle-orm';

export default async function AdmissionPage({ params }: { params: Promise<{ tenant: string }> }) {
  const session = await auth();
  const { tenant } = await params;

  if (!session || !session.user) {
    redirect(`/${tenant}/login`);
  }

  const db = await getTenantDb();
  
  // Example inline Server Action for form submission
  async function submitAdmission(formData: FormData) {
    'use server';
    
    // Auth check inside server action
    const sessionAct = await auth();
    if (!sessionAct?.user?.id) throw new Error('Unauthorized');
    
    const sDb = await getTenantDb();
    
    const graduation_period = formData.get('graduation_period') as string;
    
    // Update profile
    await sDb.update(profiles)
      .set({
        graduation_period,
        admission_filled: true,
      })
      .where(eq(profiles.id, sessionAct.user.id));
      
    // Redirect back to dashboard safely
    redirect(`/${tenant}/dashboard`);
  }

  // Check if they already filled it
  const profileRows = await db.select().from(profiles).where(eq(profiles.id, session.user.id));
  if (profileRows[0]?.admission_filled) {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-20">
        <Card className="text-center p-8 bg-green-50 border-green-200">
          <h2 className="text-2xl font-bold text-green-800 mb-2">Admission Completed</h2>
          <p className="text-green-700">Thank you! Your profile is complete.</p>
          <a href={`/${tenant}/dashboard`} className="mt-4 inline-block bg-green-600 text-white px-4 py-2 rounded">
            Return to Dashboard
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <div className="border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Student Admission Form</h1>
          <p className="text-sm text-gray-500 mt-1">Please complete your registration for {tenant}. This is a mandatory step.</p>
        </div>

        <form action={submitAdmission} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Full Name" defaultValue={session.user.name || ''} disabled />
            <Input label="Email Address" defaultValue={session.user.email || ''} disabled />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Graduation Year (e.g. 2024-2028)" name="graduation_period" placeholder="2024-2028" required />
            <Input label="Roll Number / Reg. No." name="roll_number" placeholder="Optional" />
          </div>

          <div className="pt-6 border-t flex justify-end">
            <Button type="submit" variant="primary">
              Submit & Continue
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
