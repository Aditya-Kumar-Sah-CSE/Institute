-- Update the handle_new_user function to properly extract and inherit the 'institution_id' multitenant pointer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, institute_id, graduation_period, institution_id)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'name', 
    new.email,
    new.raw_user_meta_data->>'institute_id',
    new.raw_user_meta_data->>'graduation_period',
    NULLIF(new.raw_user_meta_data->>'institution_id', '')::uuid
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
