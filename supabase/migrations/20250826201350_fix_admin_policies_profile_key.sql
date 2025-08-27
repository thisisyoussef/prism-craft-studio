-- Fix admin-wide SELECT policies to use profiles.user_id instead of profiles.id
-- Idempotently ALTER existing policies if they exist; otherwise create them with correct USING clause.

-- Orders policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Admins can read all orders'
  ) THEN
    EXECUTE $sql$
      ALTER POLICY "Admins can read all orders"
      ON public.orders
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
      )
    $sql$;
  ELSE
    EXECUTE $sql$
      CREATE POLICY "Admins can read all orders"
      ON public.orders
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
      )
    $sql$;
  END IF;
END $$;

-- Production updates policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'production_updates' AND policyname = 'Admins can read all production updates'
  ) THEN
    EXECUTE $sql$
      ALTER POLICY "Admins can read all production updates"
      ON public.production_updates
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
      )
    $sql$;
  ELSE
    EXECUTE $sql$
      CREATE POLICY "Admins can read all production updates"
      ON public.production_updates
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
      )
    $sql$;
  END IF;
END $$;

-- Samples policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'samples' AND policyname = 'Admins can read all samples'
  ) THEN
    EXECUTE $sql$
      ALTER POLICY "Admins can read all samples"
      ON public.samples
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
      )
    $sql$;
  ELSE
    EXECUTE $sql$
      CREATE POLICY "Admins can read all samples"
      ON public.samples
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
      )
    $sql$;
  END IF;
END $$;
