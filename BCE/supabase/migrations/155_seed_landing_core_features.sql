-- Seed real verified Core Platform Features into landing_core_features (idempotent)
-- Each row maps directly to implemented capabilities in the codebase and remains editable via /super-admin/landing.

INSERT INTO public.landing_core_features (title, description, icon, image_url, sort_order, is_active)
SELECT v.title, v.description, v.icon, v.image_url, v.sort_order, v.is_active
FROM (
  VALUES
    (
      'Multi-Language Cloud Compiler',
      'Compile and execute C, C++17 (GCC 13), Java (JDK 21), Python 3.12, TypeScript, and sandboxed JavaScript or HTML/CSS with custom stdin and instant cached re-runs.',
      'Cpu',
      NULL,
      1,
      true
    ),
    (
      'Monaco IDE & Terminal Workspace',
      'Code inside a resizable Monaco editor featuring IntelliSense autocomplete, inline error highlighting, clipboard guard, virtual file trees, snippets, and live terminal.',
      'Code2',
      NULL,
      2,
      true
    ),
    (
      'Interactive SQL Playground & Sheet',
      'Write and execute SQL queries against preloaded relational schemas with instant tabular results, query timing, and 530+ SQL MCQ and hands-on challenges.',
      'Database',
      NULL,
      3,
      true
    ),
    (
      'Voice LaTeX & Resume Studio',
      'Draft ATS-ready academic CV and technical resumes in a browser LaTeX workspace with live KaTeX preview, syntax checks, EN/HI voice commands, and export.',
      'FileText',
      NULL,
      4,
      true
    ),
    (
      '1v1 & Team Coding Battles',
      'Create or join live and scheduled coding rooms (Code, Batch, or Private) with team mode, real-time leaderboards, anti-cheat activity logs, analytics, and certificates.',
      'Swords',
      NULL,
      5,
      true
    ),
    (
      'Unified Coding Profile Sync',
      'Connect LeetCode, Codeforces, CodeChef, and GeeksforGeeks handles to track contest ratings, peak titles, and total problems solved from one dashboard.',
      'UserCheck',
      NULL,
      6,
      true
    ),
    (
      'Live Contest Hub (LC, CC, CF, GFG)',
      'Track live, starting-soon, and upcoming contests across LeetCode, CodeChef, Codeforces, GeeksforGeeks, and Code360 with schedules and registration tracking.',
      'Trophy',
      NULL,
      7,
      true
    ),
    (
      'Gamified XP, Streaks & Leaderboards',
      'Earn XP across solved DSA problems, SQL/Aptitude sheets, course lessons, and quizzes to climb course and global leaderboards with monthly reward tracking.',
      'Zap',
      NULL,
      8,
      true
    ),
    (
      'TCS NQT & Aptitude Prep Engine',
      'Master placement tests with 1,139 Aptitude Mastery questions, 1,427 TCS NQT prep questions, Passage Recalls, Email Labs, C++ Labs, and 13 timed 191-minute mocks.',
      'Target',
      NULL,
      9,
      true
    ),
    (
      'Structured Courses, Doubts & NPTEL',
      'Study guided video and PDF lessons backed by chapter quizzes, classroom notices, live polls, peer doubt threads, coding roadmaps, and NPTEL quiz preparation.',
      'BookOpen',
      NULL,
      10,
      true
    )
) AS v(title, description, icon, image_url, sort_order, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.landing_core_features existing WHERE existing.title = v.title
);

