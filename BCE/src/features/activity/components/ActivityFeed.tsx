'use client';

import React, { useState, useEffect } from 'react';
import { fetchActivityFeed } from '@/features/activity/actions/activity';
import type { ActivityFeedItem } from '@/types/database';
import { Activity, Award, CheckCircle2, MessageSquare, BookOpen, Clock } from 'lucide-react';
import Image from 'next/image';

export default function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [inView, setInView] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    fetchActivityFeed(1, 10).then(data => {
      setActivities(data);
      setLoading(false);
    });
  }, [inView]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'earned_badge': return <Award className="text-yellow-500" size={16} />;
      case 'course_completed': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'poll_created': return <MessageSquare className="text-blue-500" size={16} />;
      case 'lesson_unlocked': return <BookOpen className="text-purple-500" size={16} />;
      default: return <Activity className="text-neon-cyan" size={16} />;
    }
  };

  const getActivityTitle = (item: ActivityFeedItem) => {
    const meta = item.metadata as any;
    switch (item.activity_type) {
      case 'earned_badge': return <span>Unlocked <strong className="text-neon-cyan">{meta?.badge_name || 'a Badge'}</strong></span>;
      case 'course_completed': return <span>Completed <strong className="text-green-400">{meta?.course_name || 'a Course'}</strong></span>;
      case 'poll_created': return <span>Created a new Poll in <strong className="text-blue-400">{meta?.group_name || 'Community'}</strong></span>;
      default: return <span>New Activity</span>;
    }
  };

  if (loading) {
    return (
      <div ref={containerRef} className="bg-white/5 dark:bg-dark-card border border-gray-100 dark:border-gray-800 rounded-3xl p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100"><Activity size={20} className="text-neon-cyan" /> Campus Activity</h3>
        <div className="space-y-4 animate-pulse">
           {[1, 2, 3].map(i => (
             <div key={i} className="flex gap-3">
               <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0"></div>
               <div className="flex-1 space-y-2 py-1">
                 <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                 <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
               </div>
             </div>
           ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) return null;

  return (
    <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
      <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-gray-800 dark:text-gray-100">
        <Activity size={20} className="text-neon-cyan" /> Campus Activity
      </h3>
      
      <div className="space-y-5 relative">
        {/* Timeline Line */}
        <div className="absolute top-2 bottom-0 left-5 w-px bg-gray-200 dark:bg-gray-800"></div>

        {activities.map((activity, idx) => (
          <div key={activity.id} className="relative z-10 flex gap-4">
             <div className="relative shrink-0">
               <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-dark-card overflow-hidden flex items-center justify-center">
                 {activity.profile?.avatar_url ? (
                   <Image src={activity.profile.avatar_url} alt="avatar" width={40} height={40} className="object-cover w-full h-full" />
                 ) : (
                   <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600"></div>
                 )}
               </div>
               <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-dark-card border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-sm">
                 {getActivityIcon(activity.activity_type)}
               </div>
             </div>
             
             <div className="flex-1 pt-1">
               <p className="text-sm text-gray-800 dark:text-gray-200 leading-tight mb-1">
                 <strong className="font-semibold mr-1">{activity.profile?.name || 'Student'}</strong>
                 {getActivityTitle(activity)}
               </p>
               <p className="text-xs text-gray-500 flex items-center gap-1">
                 <Clock size={12} /> {new Date(activity.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
               </p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
