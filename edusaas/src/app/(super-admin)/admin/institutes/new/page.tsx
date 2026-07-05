'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function NewInstitutePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // In a real implementation, this would call a server action or API route
    // which then calls `provisionNewTenant()` from `@/lib/tenant/provisioning`
    
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get('name'),
      slug: formData.get('slug'),
      adminEmail: formData.get('adminEmail'),
      planType: formData.get('planType'),
    };

    try {
      // Fake delay to simulate DB provisioning schema + scripts step
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      router.push('/admin/institutes');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Provisioning failed');
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Provision New Institute</h1>
        <p className="text-gray-500 mt-1">Create a new isolated tenant schema and onboard an institute.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Institute Name"
              name="name"
              placeholder="e.g. Bihar College of Engineering"
              required
            />
            
            <Input
              label="Subdomain (Slug)"
              name="slug"
              placeholder="e.g. bce"
              required
              pattern="[a-z0-9-]+"
              title="Only lowercase letters, numbers, and hyphens"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Admin Email"
              name="adminEmail"
              type="email"
              placeholder="admin@college.edu"
              required
            />

            <div className="flex flex-col w-full">
              <label className="text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
              <select 
                name="planType"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="basic">Starter (₹1,999/mo)</option>
                <option value="pro">Growth (₹3,999/mo)</option>
                <option value="enterprise">Enterprise (₹7,999/mo)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
            >
              Provision Tenant
            </Button>
          </div>
        </form>
      </Card>
      
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-amber-800">What happens when you click provision?</h3>
        <ul className="mt-2 text-sm text-amber-700 list-disc list-inside space-y-1">
          <li>A new PostgreSQL schema (`tenant_slug`) is created.</li>
          <li>59 SQL Migration files are automatically pulled and executed in this schema.</li>
          <li>A profile is created for the admin email with the `admin` role.</li>
          <li>A tenant entry is recorded in the master `public.tenants` table.</li>
        </ul>
      </div>
    </div>
  );
}
