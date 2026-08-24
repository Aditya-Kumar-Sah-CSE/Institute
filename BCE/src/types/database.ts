/* ============================================
   Database Types
   ============================================ */

export type UserRole = 'student' | 'admin' | 'instructor' | 'developer';
export type Difficulty = string;
export type AssignmentType = 'mcq' | 'code' | 'ui' | 'github' | 'deploy' | 'any';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type LevelName = 'Beginner' | 'Novice' | 'Intermediate' | 'Advanced' | 'Expert' | 'Master' | 'Grandmaster' | 'Legend' | 'Mythic';

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
  social_links?: Record<string, string>;
  graduation_period?: string | null;
  college_name?: string | null;
  cgpa?: number | null;
  sgpa?: Record<string, number> | null;
  admission_filled?: boolean;
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
  is_completed?: boolean;
  enrollment_restriction?: 'any' | 'approval';
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
  pdf_url: string | null;
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
  is_admission_pinned?: boolean;
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
  image_url?: string | null;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

// ==============================
// GLOBAL CHAT
// ==============================

export interface ChatConversation {
  id: string;
  type: 'personal' | 'group';
  name: string | null;
  description: string | null;
  icon_url: string | null;
  is_private: boolean;
  join_requires_approval: boolean;
  settings_jsonb: any;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  
  // Custom joined fields for frontend selection
  members?: ChatMember[];
}

export interface ChatMember {
  conversation_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'moderator' | 'member' | 'pending';
  mute_until: string | null;
  last_read_message_id: string | null;
  joined_at: string;
  is_pinned?: boolean;
  
  profile?: Profile;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  attachment_type: 'text' | 'image' | 'video' | 'pdf' | 'audio' | 'lesson' | 'assignment' | 'notice' | 'course' | 'doubt' | null;
  attachment_link: string | null;
  reply_to_id: string | null;
  is_edited: boolean;
  is_pinned: boolean;
  deleted_for_everyone: boolean;
  created_at: string;
  updated_at: string;
  
  // Custom joined fields
  sender?: Profile;
  reactions?: MessageReaction[];
  deliveries?: MessageDelivery[];
  reply_to?: ChatMessage;
}

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface MessageDelivery {
  message_id: string;
  user_id: string;
  status: 'delivered' | 'read';
  updated_at: string;
}

// ==============================
// ==============================
// STORIES (STATUS V3)
// ==============================

export type StoryPrivacyLevel = 'everyone' | 'contacts' | 'close_friends' | 'only_me' | 'custom';
export type StoryMediaType = 'image' | 'video' | 'text';

export interface Story {
  id: string;
  user_id: string;
  visibility: StoryPrivacyLevel;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string;
  deleted_at: string | null;
  
  // Joined relational data
  profile?: Profile;
  items?: StoryItem[];
}

export interface StoryItem {
  id: string;
  story_id: string;
  media_url: string | null;
  thumbnail_url: string | null;
  media_type: StoryMediaType;
  caption: string | null;
  duration: number;
  order_index: number;
  created_at: string;
  expires_at: string;
  deleted_at: string | null;
  
  // Joined stats
  views?: StoryView[];
  reactions?: StoryReaction[];
  replies?: StoryReply[];
}

export interface StoryView {
  id: string;
  story_item_id: string;
  viewer_id: string;
  viewed_at: string;
  viewer?: Profile;
}

export interface StoryReaction {
  id: string;
  story_item_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: Profile;
}

export interface StoryReply {
  id: string;
  story_item_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender?: Profile;
}


// ==============================
// ACTIVITY FEED
// ==============================

export interface ActivityFeedItem {
  id: string;
  user_id: string;
  activity_type: string;
  metadata: any;
  created_at: string;
  
  profile?: Profile;
}

