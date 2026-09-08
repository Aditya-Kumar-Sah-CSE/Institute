# 39. Database Entity-Relationship Map

STATUS: ✅ IMPLEMENTED

## Primary Foreign Key Linkages
- `enrollments.user_id` -> `profiles.id`
- `enrollments.course_id` -> `courses.id`
- `lessons.course_id` -> `courses.id`
- `lesson_progress.lesson_id` -> `lessons.id`
- `doubts.user_id` -> `profiles.id`
- `user_ai_providers.user_id` -> `profiles.id`
- `user_badges.user_id` -> `profiles.id`
