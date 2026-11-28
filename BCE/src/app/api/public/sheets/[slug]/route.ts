import { NextResponse } from 'next/server';
import { getSerializedPublicSheet } from '@/lib/sheet-cache';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Coding sheet not found.' } },
        { status: 404 }
      );
    }

    const serialized = await getSerializedPublicSheet(slug);
    if (!serialized) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Coding sheet not found or is private.' } },
        { status: 404 }
      );
    }

    const acceptsGzip = (request.headers.get('accept-encoding') || '').toLowerCase().includes('gzip');
    const body = acceptsGzip ? serialized.gzipBytes : serialized.jsonBytes;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=600',
      'Vary': 'Accept-Encoding',
    };
    if (acceptsGzip) {
      headers['Content-Encoding'] = 'gzip';
    }

    return new NextResponse(body as unknown as BodyInit, { headers });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch public sheet.' } },
      { status: 500 }
    );
  }
}
