import { NextResponse } from 'next/server';
import { cleanupExpiredStories } from '@/features/stories/actions/stories';

export async function GET(request: Request) {
  // Optional security token check
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized CRON access' }, { status: 401 });
  }

  console.log('Cron Job: Triggering expired stories database & storage cleanup...');
  const result = await cleanupExpiredStories();

  if (!result.success) {
    return NextResponse.json({ 
      status: 'error', 
      message: result.error || 'Cleanup execution failed' 
    }, { status: 500 });
  }

  return NextResponse.json({ 
    status: 'success', 
    message: 'Expired stories and related storage media cleaned up successfully.' 
  });
}
