import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ valid: false, error: 'URL is required' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ valid: false, error: 'Invalid URL format' }, { status: 400 });
    }

    // Simple head request to check if site is live
    const response = await fetch(url, {
      method: 'HEAD',
      // Some hosts block HEAD, fallback to GET could be implemented
    });

    if (response.ok) {
      return NextResponse.json({ valid: true });
    } else {
      // Try GET as fallback
      const getResponse = await fetch(url, { method: 'GET' });
      if (getResponse.ok) {
         return NextResponse.json({ valid: true });
      }
      return NextResponse.json({ valid: false, error: `Returned status: ${response.status}` });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Could not reach URL';
    return NextResponse.json({ valid: false, error: errorMsg });
  }
}
