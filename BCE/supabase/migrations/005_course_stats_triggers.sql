-- Function to calculate and update course stats
CREATE OR REPLACE FUNCTION update_course_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_course_id UUID;
  v_lesson_count INT;
  v_total_xp INT;
BEGIN
  -- Determine course_id based on TG_OP and TG_TABLE_NAME
  IF TG_TABLE_NAME = 'lessons' THEN
    IF TG_OP = 'DELETE' THEN
      v_course_id := OLD.course_id;
    ELSE
      v_course_id := NEW.course_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'assignments' THEN
    -- For assignments, we need to get course_id via the lesson
    IF TG_OP = 'DELETE' THEN
      SELECT course_id INTO v_course_id FROM lessons WHERE id = OLD.lesson_id;
    ELSE
      SELECT course_id INTO v_course_id FROM lessons WHERE id = NEW.lesson_id;
    END IF;
  END IF;

  -- Calculate total lessons
  SELECT COUNT(*) INTO v_lesson_count FROM lessons WHERE course_id = v_course_id;

  -- Calculate total XP (lessons + assignments)
  SELECT 
    COALESCE(SUM(l.xp_reward), 0) + 
    COALESCE((SELECT SUM(a.xp_reward) FROM assignments a JOIN lessons l2 ON a.lesson_id = l2.id WHERE l2.course_id = v_course_id), 0)
  INTO v_total_xp
  FROM lessons l
  WHERE l.course_id = v_course_id;

  -- Update the courses table
  UPDATE courses 
  SET 
    lesson_count = v_lesson_count,
    total_xp = v_total_xp
  WHERE id = v_course_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for lessons table
DROP TRIGGER IF EXISTS on_lesson_change ON lessons;
CREATE TRIGGER on_lesson_change
AFTER INSERT OR UPDATE OR DELETE ON lessons
FOR EACH ROW
EXECUTE FUNCTION update_course_stats();

-- Triggers for assignments table
DROP TRIGGER IF EXISTS on_assignment_change ON assignments;
CREATE TRIGGER on_assignment_change
AFTER INSERT OR UPDATE OR DELETE ON assignments
FOR EACH ROW
EXECUTE FUNCTION update_course_stats();

-- Manually trigger update for all existing courses to sync them up
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN SELECT id FROM courses LOOP
    -- Manually call the logic for each course to seed the initial accurate values
    UPDATE courses c2
    SET 
      lesson_count = (SELECT COUNT(*) FROM lessons WHERE course_id = c.id),
      total_xp = (
        SELECT COALESCE(SUM(l.xp_reward), 0) + COALESCE((SELECT SUM(a.xp_reward) FROM assignments a JOIN lessons l2 ON a.lesson_id = l2.id WHERE l2.course_id = c.id), 0)
        FROM lessons l WHERE l.course_id = c.id
      )
    WHERE c2.id = c.id;
  END LOOP;
END;
$$;
