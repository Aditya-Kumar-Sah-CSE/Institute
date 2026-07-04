-- Add institute_id to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS institute_id TEXT;

-- Update the handle_new_user function to include institute_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, institute_id)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'name', 
    new.email,
    new.raw_user_meta_data->>'institute_id'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
