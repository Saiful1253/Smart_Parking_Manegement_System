-- Fix infinite recursion in profiles RLS policy
-- Remove the problematic admin check that creates self-referential query
DROP POLICY IF EXISTS profiles_select ON profiles;

-- Users can only select their own profile
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);