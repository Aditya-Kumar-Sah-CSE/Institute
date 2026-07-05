export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  
  // Here we can initialize Tenant Providers (e.g. for Branding colors/fonts)
  
  return (
    <div className={`tenant-wrapper tenant-${tenant}`}>
      {children}
    </div>
  );
}
