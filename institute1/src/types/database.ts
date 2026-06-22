/* ============================================
   Database Types
   ============================================ */

export type UserRole = 'student' | 'admin' | 'instructor';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type AssignmentType = 'mcq' | 'code' | 'ui' | 'github' | 'deploy';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type LevelName = 'Beginner' | 'Intermediate' | 'Advanced' | 'Pro';

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  xp: number;
  level: LevelName;
  role: UserRole;
  status: 'active' | 'pending' | 'rejected' | 'suspended';
  streak_days: number;
  last_active_at: string | null;
  created_at: string;
}

export interface InstructorApplication {
  id: string;
  user_id: string;
  bio: string | null;
  experience: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  approved_at: string | null;
  profile?: Profile;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  difficulty: Difficulty;
  thumbnail_url: string | null;
  tags: string[];
  total_xp: number;
  lesson_count: number;
  is_published: boolean;
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
  profiles?: { name: string } | null;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  youtube_url: string | null;
  notes: string | null;
  xp_reward: number;
  sort_order: number;
  week_number: number;
  created_at: string;
}

export interface Assignment {
  id: string;
  lesson_id: string;
  type: AssignmentType;
  title: string;
  description: string | null;
  question: MCQQuestion | CodeQuestion | null;
  expected_output: string | null;
  xp_reward: number;
  requires_github: boolean;
  requires_deploy: boolean;
  created_at: string;
}

export interface MCQQuestion {
  prompt: string;
  options: string[];
  correct_index: number;
}

export interface CodeQuestion {
  prompt: string;
  starter_code?: string;
  language?: string;
}

export interface Submission {
  id: string;
  user_id: string;
  assignment_id: string;
  answer: unknown;
  github_link: string | null;
  deploy_link: string | null;
  status: SubmissionStatus;
  score: number;
  feedback: string | null;
  submitted_at: string;
  // Joined fields
  assignment?: Assignment;
  profile?: Profile;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  condition_type: string | null;
  condition_value: number | null;
  course_id?: string | null;
  bonus_xp?: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  enrolled_at: string;
  completed_at: string | null;
  course?: Course;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
}

export interface XPLog {
  id: string;
  user_id: string;
  action: string;
  xp_amount: number;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  logo_url: string | null;
  tagline: string | null;
  updated_at: string;
}

// Leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  avatar_url: string | null;
  xp: number;
  level: LevelName;
  badge_count: number;
}

// Admin analytics
export interface AdminStats {
  totalStudents: number;
  activeStudents: number;
  totalCourses: number;
  avgXP: number;
  completionRate: number;
  totalSubmissions: number;
}

export interface Feedback {
  id: string;
  user_id: string;
  name: string;
  role: string;
  category: string;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}
