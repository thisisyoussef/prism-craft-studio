-- Grant admin-wide SELECT access on orders, production_updates, and samples
-- Uses DO blocks to be idempotent across environments

-- Orders: admins can read all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Admins can read all orders'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can read all orders"
      ON public.orders
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    $policy$;
  END IF;
END $$;

-- Production updates: admins can read all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'production_updates' AND policyname = 'Admins can read all production updates'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can read all production updates"
      ON public.production_updates
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    $policy$;
  END IF;
END $$;

-- Samples: admins can read all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'samples' AND policyname = 'Admins can read all samples'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can read all samples"
      ON public.samples
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    $policy$;
  END IF;
END $$;
