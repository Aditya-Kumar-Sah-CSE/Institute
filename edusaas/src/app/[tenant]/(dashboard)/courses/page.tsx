import React from 'react';
import { getPublishedCourses, checkUserEnrollment } from './actions';
import { auth } from '@/lib/auth/auth.config';
import { redirect } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { BookOpen, Award, CirclePlay } from 'lucide-react';

export default async function CoursesCatalogPage({ params }: { params: Promise<{ tenant: string }> }) {
  const session = await auth();
  const { tenant } = await params;

  if (!session || !session.user) {
    redirect(`/${tenant}/login`);
  }

  const courseList = await getPublishedCourses();
  
  // Checking enrollment status requires looping or optimizing. For PoC, map individually or just link if they want to view details.
  // We'll leave the enrollment check to the course detail page to save complex joins on the catalog.

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Course Catalog</h1>
        <p className="text-lg text-gray-500 mt-2">Discover new skills, earn XP, and climb the leaderboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courseList.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 border-2 border-dashed rounded-xl">
            No published courses available for this institute yet.
          </div>
        ) : (
          courseList.map((course) => (
            <Card key={course.id} padding="none" className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col group">
              <div 
                className="h-48 bg-gray-200 bg-cover bg-center relative"
                style={{ backgroundImage: `url(${course.thumbnail_url || 'https://via.placeholder.com/600x400'})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                    course.difficulty === 'sem 1' ? 'bg-green-500 text-white' : 
                    course.difficulty === 'sem 2' ? 'bg-yellow-500 text-white' : 
                    'bg-red-500 text-white'
                  }`}>
                    {course.difficulty}
                  </span>
                  <span className="bg-indigo-600/90 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                    <Award size={14} /> {course.total_xp} XP
                  </span>
                </div>
              </div>
              
              <div className="p-5 flex flex-col flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">{course.title}</h2>
                <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                  {course.description || 'No description provided for this course. Start learning today to level up your skills.'}
                </p>
                
                <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 mb-6 border-y py-3">
                  <div className="flex items-center gap-1">
                    <BookOpen size={16} className="text-indigo-500" />
                    <span>{course.lesson_count} Lessons</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CirclePlay size={16} className="text-emerald-500" />
                    <span>Self Paced</span>
                  </div>
                </div>
                
                <Link href={`/${tenant}/courses/${course.id}`} className="mt-auto block">
                  <Button variant="primary" className="w-full">
                    View Course Details
                  </Button>
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
