ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_type_check;
ALTER TABLE assignments ADD CONSTRAINT assignments_type_check CHECK (type IN ('mcq', 'code', 'ui', 'github', 'deploy', 'any'));
