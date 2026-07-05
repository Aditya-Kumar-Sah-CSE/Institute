import { getTenantBySlug } from '@/lib/tenant/resolver';
import { notFound } from 'next/navigation';
import LoginForm from './LoginForm';

export default async function LoginPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  
  let tenantData = await getTenantBySlug(tenant);
  
  if (!tenantData) {
    // Graceful fallback for UI testing without the Master DB seeded
    tenantData = {
      id: 'mock-id',
      slug: tenant,
      name: (tenant.toUpperCase() || 'Demo') + ' Institute',
      schema_name: 'public',
      status: 'active',
      primary_color: '#4f46e5'
    };
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" style={{
        // We can pass the tenant's primary color to CSS variables here
        '--tenant-primary': tenantData.primary_color || '#4f46e5'
      } as React.CSSProperties}>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {tenantData.logo_url ? (
          <img src={tenantData.logo_url} alt={tenantData.name} className="mx-auto h-12 w-auto" />
        ) : (
          <div className="mx-auto h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: 'var(--tenant-primary)' }}>
            {tenantData.name.charAt(0)}
          </div>
        )}
        
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {tenantData.name}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <LoginForm tenantSlug={tenantData.slug} />
        </div>
      </div>
    </div>
  );
}
