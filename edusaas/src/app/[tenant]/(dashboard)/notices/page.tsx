import { getTenantDb } from '@/lib/db/tenant';
import { feedback } from '@/lib/db/schema/tenant-schema';
import { auth } from '@/lib/auth/auth.config';
import { redirect } from 'next/navigation';
import Card from '@/components/ui/Card';
import { MessageSquare, Clock } from 'lucide-react';
import { desc } from 'drizzle-orm';
import { formatDistanceToNow } from 'date-fns';

export default async function NoticeBoardPage({ params }: { params: Promise<{ tenant: string }> }) {
  const session = await auth();
  const { tenant } = await params;

  if (!session || !session.user) {
    redirect(`/${tenant}/login`);
  }

  const db = await getTenantDb();
  
  // Reusing the feedback/notices schema to pull announcements/notices
  // In the real app, this would be a dedicated schema or filtered by a 'notice' category
  const notices = await db.select()
    .from(feedback)
    .orderBy(desc(feedback.created_at))
    .limit(20);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Notice Board</h1>
        <p className="text-gray-500 mt-1">Official announcements and updates for {tenant}.</p>
      </div>

      <div className="space-y-4">
        {notices.length === 0 ? (
          <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
            No notices published yet.
          </div>
        ) : (
          notices.map((notice) => (
            <Card key={notice.id} className="hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
              
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      {notice.category || 'Announcement'}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                      <Clock size={12} /> {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{notice.message}</h3>
                  <div className="text-sm text-gray-500 font-medium flex items-center gap-1">
                    By {notice.name} ({notice.role})
                  </div>
                </div>
                
                {notice.admin_reply && (
                  <div className="bg-gray-50 p-3 rounded-lg border text-sm max-w-sm mt-4 md:mt-0 relative group-hover:bg-white transition-colors">
                    <div className="font-bold text-gray-700 flex items-center gap-1 mb-1 text-xs uppercase tracking-wider">
                      <MessageSquare size={12} /> Admin Reply
                    </div>
                    <p className="text-gray-600 line-clamp-2 italic">"{notice.admin_reply}"</p>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
