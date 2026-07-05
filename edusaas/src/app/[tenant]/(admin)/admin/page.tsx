import React from 'react';
import Card from '@/components/ui/Card';
import { Users, BookOpen, Clock } from 'lucide-react';
import { getTenantDb } from '@/lib/db/tenant';
import { profiles, courses, enrollments } from '@/lib/db/schema/tenant-schema';
import { count, eq } from 'drizzle-orm';

export default async function TenantAdminDashboard() {
  const db = await getTenantDb();

  // Basic analytics for the specific institute using Drizzle
  const totalStudentsRes = await db.select({ count: count() }).from(profiles).where(eq(profiles.role, 'student'));
  const totalCoursesRes = await db.select({ count: count() }).from(courses);
  const activeEnrollmentsRes = await db.select({ count: count() }).from(enrollments);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Institute Administration</h1>
        <p className="text-gray-500 mt-1">Manage users, courses, and settings for your isolated tenant instance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-100 text-blue-600 flex justify-center items-center">
              <Users size={24} />
            </div>
            <div>
              <div className="text-gray-500 font-medium text-sm">Total Students</div>
              <div className="text-2xl font-bold text-gray-900">{totalStudentsRes[0].count}</div>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-indigo-100 text-indigo-600 flex justify-center items-center">
              <BookOpen size={24} />
            </div>
            <div>
              <div className="text-gray-500 font-medium text-sm">Active Courses</div>
              <div className="text-2xl font-bold text-gray-900">{totalCoursesRes[0].count}</div>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-100 text-emerald-600 flex justify-center items-center">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-gray-500 font-medium text-sm">Total Enrollments</div>
              <div className="text-2xl font-bold text-gray-900">{activeEnrollmentsRes[0].count}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
