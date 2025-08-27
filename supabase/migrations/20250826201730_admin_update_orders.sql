-- Admin UPDATE policy for orders using profiles.user_id
-- Idempotently create or alter the policy

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Admins can update all orders'
  ) THEN
    EXECUTE $sql$
      ALTER POLICY "Admins can update all orders"
      ON public.orders
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
      )
    $sql$;
  ELSE
    EXECUTE $sql$
      CREATE POLICY "Admins can update all orders"
      ON public.orders
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
      )
    $sql$;
  END IF;
END $$;
