export const XP_VALUES = {
  WATCH_LESSON: 10,
  COMPLETE_PRACTICE: 50,
  GITHUB_PUSH: 100,
  DEPLOY_PROJECT: 150,
  DAILY_STREAK: 20,
  ASK_DOUBT: 10,
  REPLY_DOUBT: 5,
  ACCEPTED_ANSWER: 30,
  FACULTY_ACCEPTED: 50,
  LIKE_DOUBT: 2,
  COURSE_JOIN: 20,
  POLL_VOTE: 1,
  FEEDBACK_SUBMIT: 5,
} as const;

export const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'iambestadi@gmail.com';

// Level thresholds
export const LEVEL_THRESHOLDS = [
  { name: 'Beginner' as const, min: 0, max: 99 },
  { name: 'Novice' as const, min: 100, max: 499 },
  { name: 'Intermediate' as const, min: 500, max: 999 },
  { name: 'Advanced' as const, min: 1000, max: 2499 },
  { name: 'Expert' as const, min: 2500, max: 4999 },
  { name: 'Master' as const, min: 5000, max: 9999 },
  { name: 'Grandmaster' as const, min: 10000, max: 24999 },
  { name: 'Legend' as const, min: 25000, max: 99999 },
  { name: 'Mythic' as const, min: 100000, max: Infinity },
];

// Default badge definitions
export const DEFAULT_BADGES = [
  { name: 'Git Starter', icon: '🧑‍💻', description: 'Made your first GitHub submission', condition_type: 'github_count', condition_value: 1 },
  { name: 'First Deploy', icon: '🚀', description: 'Deployed your first project', condition_type: 'deploy_count', condition_value: 1 },
  { name: 'JS Master', icon: '⚡', description: 'Earned 500+ XP in JavaScript', condition_type: 'xp_threshold', condition_value: 500 },
  { name: 'React Builder', icon: '⚛️', description: 'Completed the React course', condition_type: 'course_complete', condition_value: 1 },
  { name: 'Full Stack Warrior', icon: '🏆', description: 'Reached Pro level', condition_type: 'xp_threshold', condition_value: 3000 },
  { name: 'Streak Master', icon: '🔥', description: '7-day learning streak', condition_type: 'streak_days', condition_value: 7 },
  { name: 'Quiz Ace', icon: '🎯', description: 'Scored 100% on 5 quizzes', condition_type: 'perfect_score', condition_value: 5 },
  { name: 'Code Ninja', icon: '🥷', description: 'Completed 20 coding tasks', condition_type: 'code_complete', condition_value: 20 },
  { name: 'Daily Helpful Contributor', icon: '🤝', description: 'Replied to 5 doubts in one day', condition_type: 'daily_replies', condition_value: 5 },
  { name: 'Top Doubt Solver', icon: '💡', description: 'Got 10 accepted answers', condition_type: 'accepted_answers', condition_value: 10 },
];

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'Dashboard' },
  { label: 'Courses', href: '/courses', icon: 'Courses' },
  { label: 'Leaderboard', href: '/leaderboard', icon: 'Leaderboard' },
  { label: 'Batch Doubts', href: '/doubts', icon: 'Doubts' },
  { label: 'Notices', href: '/notices', icon: 'Notices' },
  { label: 'Chat', href: '/dashboard/chat', icon: 'Chat' },
  { label: 'SQL Editor', href: '/dashboard/sql-editor', icon: 'Database' },
  { label: 'Profile', href: '/profile', icon: 'Profile' },
];

export const ADMIN_NAV_ITEMS = [
  { label: 'Overview', href: '/admin', icon: 'Dashboard' },
  { label: 'Institutions', href: '/admin/institutions', icon: 'Building' },
  { label: 'Domain Settings', href: '/admin/domain-settings', icon: 'Building' },
  { label: 'Courses', href: '/admin/courses', icon: 'Courses' },
  { label: 'Enrollments', href: '/admin/enrollments', icon: 'Enrollments' },
  { label: 'Administration', href: '/admin/students', icon: 'Students' },
  { label: 'Submissions', href: '/admin/submissions', icon: 'Submissions' },
  { label: 'Batch Doubts', href: '/doubts', icon: 'Doubts' },
  { label: 'Feedback', href: '/admin/feedback', icon: 'Feedback' },
  { label: 'Notices', href: '/admin/notices', icon: 'Notices' },
  { label: 'Payment', href: '/admin/payment-model', icon: 'Payments' },
];

export const INSTRUCTOR_NAV_ITEMS = [
  { label: 'Dashboard', href: '/instructor', icon: 'Dashboard' },
  { label: 'My Courses', href: '/instructor/courses', icon: 'Courses' },
  { label: 'Enrollments', href: '/instructor/enrollments', icon: 'Enrollments' },
  { label: 'Review Submissions', href: '/instructor/submissions', icon: 'Submissions' },
];
