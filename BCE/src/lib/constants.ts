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
  // Course Enrolled
  { name: 'Beginner Scholar', icon: '📚', description: '1 course enrolled successfully', condition_type: 'course_enrolled', condition_value: 1 },
  { name: 'Dedicated Learner', icon: '🎓', description: '5 courses enrolled successfully', condition_type: 'course_enrolled', condition_value: 5 },
  { name: 'Knowledge Seeker', icon: '🧠', description: '10 courses enrolled successfully', condition_type: 'course_enrolled', condition_value: 10 },
  { name: 'Academic Legend', icon: '👑', description: '50+ courses enrolled successfully', condition_type: 'course_enrolled', condition_value: 50 },

  // Active Days
  { name: 'First Day', icon: '🌱', description: 'Day 1 of learning', condition_type: 'active_days', condition_value: 1 },
  { name: '1-Week Streak', icon: '🔥', description: 'Active for 7 days', condition_type: 'active_days', condition_value: 7 },
  { name: '1-Month Explorer', icon: '🗺️', description: 'Active for 30 days', condition_type: 'active_days', condition_value: 30 },
  { name: '3-Month Veteran', icon: '🏅', description: 'Active for 90 days', condition_type: 'active_days', condition_value: 90 },

  // XP Badges
  { name: 'XP Rookie', icon: '⭐', description: 'Earned 20 XP', condition_type: 'xp_threshold', condition_value: 20 },
  { name: 'XP Elite', icon: '🔥', description: 'Earned 500 XP', condition_type: 'xp_threshold', condition_value: 500 },
  { name: 'XP Legend', icon: '👑', description: 'Earned 5000 XP', condition_type: 'xp_threshold', condition_value: 5000 },

  // Coding Badges
  { name: '7-Day Coder', icon: '🔥', description: 'Solve coding problems for 7 consecutive days', condition_type: '7_day_streak', condition_value: 7 },
  { name: '30-Day Coder', icon: '☄️', description: 'Solve coding problems for 30 consecutive days', condition_type: '30_day_streak', condition_value: 30 },
  { name: 'Problem Starter', icon: '🧑‍💻', description: 'First 10 coding problems solved', condition_type: 'problem_starter', condition_value: 10 },
  { name: '100 Club', icon: '🥉', description: '100 total coding problems solved', condition_type: '100_club', condition_value: 100 },
  { name: '500 Club', icon: '🥇', description: '500 total coding problems solved', condition_type: '500_club', condition_value: 500 },
  { name: '1000 Club', icon: '🏆', description: '1000 total coding problems solved', condition_type: '1000_club', condition_value: 1000 },
  { name: 'DSA Master', icon: '🧠', description: 'Complete a major DSA Sheet', condition_type: 'dsa_master', condition_value: 1 },
  { name: 'Multi-Platform Coder', icon: '🌐', description: 'Solve problems on Smart Learn, LeetCode, and CodeChef', condition_type: 'multi_platform', condition_value: 3 },
  { name: 'Monthly Champion', icon: '👑', description: 'Achieve Rank #1 overall in the Monthly Coding Champions', condition_type: 'monthly_champion', condition_value: 1 },
  { name: 'Contest Warrior', icon: '⚔️', description: 'Participate in 3 or more Coding Battles', condition_type: 'contest_warrior', condition_value: 3 },
  { name: 'Problem Hunter', icon: '🕵️', description: 'Solve at least 5 Easy, 5 Medium, and 5 Hard problems', condition_type: 'problem_hunter', condition_value: 5 },
];

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'Dashboard' },
  { label: 'Courses', href: '/courses', icon: 'Courses' },
  { label: 'My NPTEL Courses', href: '/student/nptel', icon: 'Courses' },
  { label: 'Code Arena', href: '/code-arena', icon: 'Code' },
  { label: 'Coding Sheets', href: '/code-arena/sheets', icon: 'Submissions' },
  { label: 'Compiler', href: '/code-arena/compiler', icon: 'Code' },
  { label: 'Brick Breaker', href: '/code-arena/game', icon: 'Game' },
  { label: 'SQL Editor', href: '/dashboard/sql-editor', icon: 'Database' },
  { label: 'LaTeX Editor', href: '/latex-editor', icon: 'LaTeX' },
  { label: 'Leaderboard', href: '/leaderboard', icon: 'Leaderboard' },
  { label: 'Batch Doubts', href: '/doubts', icon: 'Doubts' },
  { label: 'Notices', href: '/notices', icon: 'Notices' },
  { label: 'Chat', href: '/dashboard/chat', icon: 'Chat' },
  { label: 'Profile', href: '/profile', icon: 'Profile' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
];

export const ADMIN_NAV_ITEMS = [
  { label: 'Overview', href: '/admin', icon: 'Dashboard' },
  { label: 'Courses', href: '/admin/courses', icon: 'Courses' },
  { label: 'NPTEL Management', href: '/admin/nptel', icon: 'Courses' },
  { label: 'Enrollments', href: '/admin/enrollments', icon: 'Enrollments' },
  { label: 'Administration', href: '/admin/students', icon: 'Students' },
  { label: 'Submissions', href: '/admin/submissions', icon: 'Submissions' },
  { label: 'Batch Doubts', href: '/doubts', icon: 'Doubts' },
  { label: 'Feedback', href: '/admin/feedback', icon: 'Feedback' },
  { label: 'Notices', href: '/admin/notices', icon: 'Notices' },
  { label: 'Polls', href: '/admin/polls', icon: 'Polls' },
];

export const INSTRUCTOR_NAV_ITEMS = [
  { label: 'Dashboard', href: '/instructor', icon: 'Dashboard' },
  { label: 'My Courses', href: '/instructor/courses', icon: 'Courses' },
  { label: 'Code Arena', href: '/instructor/code-arena', icon: 'Code' },
  { label: 'Coding Sheets', href: '/code-arena/sheets', icon: 'Submissions' },
  { label: 'Enrollments', href: '/instructor/enrollments', icon: 'Enrollments' },
  { label: 'Review Submissions', href: '/instructor/submissions', icon: 'Submissions' },
  { label: 'Polls', href: '/instructor/polls', icon: 'Polls' },
];
