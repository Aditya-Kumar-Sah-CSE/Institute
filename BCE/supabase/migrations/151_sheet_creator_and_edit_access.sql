-- Migration 151: Assign creator ownership of all existing sheets to iambestadi@gmail.com
-- and ensure sheet creators/instructors can manage sheets and sheet questions cleanly.

DO $$
DECLARE
  v_master_id UUID;
BEGIN
  SELECT id INTO v_master_id
  FROM auth.users
  WHERE lower(email) = 'iambestadi@gmail.com'
  LIMIT 1;

  IF v_master_id IS NOT NULL THEN
    -- Ensure profile is active and retains super_admin privileges
    UPDATE public.profiles
    SET
      status = 'active',
      role = CASE
        WHEN lower(coalesce(role, '')) IN ('super_admin', 'superadmin', 'platform_owner', 'root_admin') THEN role
        ELSE 'super_admin'
      END
    WHERE id = v_master_id;

    -- Assign all created sheets so far to iambestadi@gmail.com
    UPDATE public.coding_sheets
    SET created_by = v_master_id
    WHERE created_by IS DISTINCT FROM v_master_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.can_create_learning_content()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'iambestadi@gmail.com'
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND lower(trim(role)) IN (
          'instructor', 'admin', 'developer', 'super_admin', 'superadmin'
        )
        AND COALESCE(status, 'active') = 'active'
    )
  );
$$;

DROP POLICY IF EXISTS "Code Arena instructors manage owned sheets" ON public.coding_sheets;
CREATE POLICY "Code Arena instructors manage owned sheets"
  ON public.coding_sheets
  FOR ALL
  USING (created_by = auth.uid() OR public.can_create_learning_content())
  WITH CHECK (created_by = auth.uid() OR public.can_create_learning_content());

NOTIFY pgrst, 'reload schema';

