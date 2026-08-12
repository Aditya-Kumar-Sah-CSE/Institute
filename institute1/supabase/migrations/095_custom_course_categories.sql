-- Drop the check constraint on courses.difficulty to allow custom category strings
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'courses' AND column_name = 'difficulty'
    ) LOOP
        EXECUTE 'ALTER TABLE courses DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;
