import { pgTable, text, uuid, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  password_hash: text('password_hash'),
  avatar_url: text('avatar_url'),
  xp: integer('xp').default(0).notNull(),
  level: text('level').default('Beginner').notNull(),
  role: text('role').default('student').notNull(),
  status: text('status').default('active').notNull(),
  streak_days: integer('streak_days').default(0).notNull(),
  last_active_at: timestamp('last_active_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  social_links: jsonb('social_links'),
  graduation_period: text('graduation_period'),
  cgpa: integer('cgpa'),
  sgpa: jsonb('sgpa'),
  admission_filled: boolean('admission_filled').default(false),
});

export const instructor_applications = pgTable('instructor_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => profiles.id).notNull(),
  bio: text('bio'),
  experience: text('experience'),
  status: text('status').default('pending').notNull(),
  submitted_at: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  approved_at: timestamp('approved_at', { withTimezone: true }),
});

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  difficulty: text('difficulty').notNull(),
  thumbnail_url: text('thumbnail_url'),
  tags: jsonb('tags').$type<string[]>(),
  total_xp: integer('total_xp').default(0).notNull(),
  lesson_count: integer('lesson_count').default(0).notNull(),
  is_published: boolean('is_published').default(false).notNull(),
  is_deleted: boolean('is_deleted').default(false).notNull(),
  enrollment_restriction: text('enrollment_restriction').default('any'),
  created_by: uuid('created_by').references(() => profiles.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const enrollments = pgTable('enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => profiles.id).notNull(),
  course_id: uuid('course_id').references(() => courses.id).notNull(),
  progress: integer('progress').default(0).notNull(),
  enrolled_at: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
  completed_at: timestamp('completed_at', { withTimezone: true }),
});

export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  course_id: uuid('course_id').references(() => courses.id).notNull(),
  title: text('title').notNull(),
  youtube_url: text('youtube_url'),
  notes: text('notes'),
  pdf_url: text('pdf_url'),
  xp_reward: integer('xp_reward').default(0).notNull(),
  sort_order: integer('sort_order').default(0).notNull(),
  week_number: integer('week_number').default(1).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  lesson_id: uuid('lesson_id').references(() => lessons.id).notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  question: jsonb('question'),
  expected_output: text('expected_output'),
  xp_reward: integer('xp_reward').default(0).notNull(),
  requires_github: boolean('requires_github').default(false).notNull(),
  requires_deploy: boolean('requires_deploy').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => profiles.id).notNull(),
  assignment_id: uuid('assignment_id').references(() => assignments.id).notNull(),
  answer: jsonb('answer'),
  github_link: text('github_link'),
  deploy_link: text('deploy_link'),
  status: text('status').default('pending').notNull(),
  score: integer('score').default(0).notNull(),
  feedback: text('feedback'),
  submitted_at: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
});

export const company_settings = pgTable('company_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_name: text('company_name').notNull(),
  logo_url: text('logo_url'),
  tagline: text('tagline'),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  is_admission_pinned: boolean('is_admission_pinned').default(false),
});

export const badges = pgTable('badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon').notNull(),
  condition_type: text('condition_type'),
  condition_value: integer('condition_value'),
  course_id: uuid('course_id').references(() => courses.id),
  bonus_xp: integer('bonus_xp').default(0),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const user_badges = pgTable('user_badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => profiles.id).notNull(),
  badge_id: uuid('badge_id').references(() => badges.id).notNull(),
  earned_at: timestamp('earned_at', { withTimezone: true }).defaultNow().notNull(),
});

export const lesson_progress = pgTable('lesson_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => profiles.id).notNull(),
  lesson_id: uuid('lesson_id').references(() => lessons.id).notNull(),
  completed: boolean('completed').default(false).notNull(),
  completed_at: timestamp('completed_at', { withTimezone: true }),
});

export const xp_log = pgTable('xp_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => profiles.id).notNull(),
  action: text('action').notNull(),
  xp_amount: integer('xp_amount').notNull(),
  source_type: text('source_type'),
  source_id: text('source_id'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => profiles.id).notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  category: text('category').notNull(),
  message: text('message').notNull(),
  status: text('status').default('open').notNull(),
  image_url: text('image_url'),
  admin_reply: text('admin_reply'),
  replied_at: timestamp('replied_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const certificates = pgTable('certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => profiles.id).notNull(),
  course_id: uuid('course_id').references(() => courses.id).notNull(),
  issued_at: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
});
