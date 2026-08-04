import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  // Default manifest fallback
  const fallbackName = "Smart Hybrid Learning";
  const defaultManifest = {
    name: fallbackName,
    short_name: fallbackName,
    description: "Your unified digital learning platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };

  if (!tenantId) {
    return NextResponse.json(defaultManifest);
  }

  // Fetch the specific tenant details dynamically on the Edge Native Route
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from('institutions')
    .select('name, slug, logo_url, theme_config')
    .eq('id', tenantId)
    .single();

  if (!tenant) {
    return NextResponse.json(defaultManifest);
  }

  const primaryColor = tenant.theme_config && typeof tenant.theme_config === 'object' && 'primary_color' in tenant.theme_config
    ? (tenant.theme_config as any).primary_color
    : '#000000';

  const logoUrl = tenant.logo_url || "/icon-512x512.png";
  
  // Set accurate start_url scoping the exact tenant path or domain
  const startUrl = `/${tenant.slug}/`;

  return NextResponse.json({
    name: tenant.name,
    short_name: tenant.name,
    description: `Digital Learning Portal for ${tenant.name}`,
    start_url: startUrl,
    display: "standalone",
    background_color: "#000000",
    theme_color: primaryColor,
    icons: [
      {
        src: logoUrl,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: logoUrl, 
        sizes: "192x192",
        type: "image/png"
      }
    ]
  });
}
