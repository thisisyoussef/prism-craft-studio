-- Admins can read all profiles safely via a SECURITY DEFINER function
-- Creates helper function public.is_admin(uid) and a policy on profiles

-- Helper function to check admin role without being blocked by RLS on profiles
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = uid AND p.role = 'admin'
  );
$$;

-- Ensure only necessary privileges to execute the function
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, service_role;

-- Create or alter policy for admin-wide SELECT on profiles using the helper
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can read all profiles'
  ) THEN
    EXECUTE $sql$
      ALTER POLICY "Admins can read all profiles"
      ON public.profiles
      USING (public.is_admin(auth.uid()));
    $sql$;
  ELSE
    EXECUTE $sql$
      CREATE POLICY "Admins can read all profiles"
      ON public.profiles
      FOR SELECT
      USING (public.is_admin(auth.uid()));
    $sql$;
  END IF;
END $$;
