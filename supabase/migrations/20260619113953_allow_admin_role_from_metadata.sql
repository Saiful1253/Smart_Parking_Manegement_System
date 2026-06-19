-- Update trigger to allow 'admin' role from metadata (for trusted signup flows)
-- Public signups can still specify admin role in metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_role TEXT;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Allow role from metadata, but default to 'customer' if not specified
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  
  -- Validate role is either 'admin' or 'customer'
  IF v_role NOT IN ('admin', 'customer') THEN
    v_role := 'customer';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, v_full_name, v_role)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;