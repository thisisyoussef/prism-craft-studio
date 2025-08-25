-- RLS policies to support admin tooling and updates

-- Allow admins/moderators to update any order status
DROP POLICY IF EXISTS "Admins can update any order" ON public.orders;
CREATE POLICY "Admins can update any order"
  ON public.orders FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','moderator')
    )
  );

-- Production updates: allow admins/moderators to insert and update
DROP POLICY IF EXISTS "Admins manage production updates" ON public.production_updates;
CREATE POLICY "Admins manage production updates"
  ON public.production_updates FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','moderator')
    )
  );

-- Optionally, allow company members to insert updates for their own company's orders
DROP POLICY IF EXISTS "Company can insert own order updates" ON public.production_updates;
CREATE POLICY "Company can insert own order updates"
  ON public.production_updates FOR INSERT TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT o.id FROM public.orders o
      WHERE o.company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Storage: allow any authenticated user to select objects metadata in 'artwork' bucket
-- Required for client-side createSignedUrl. Objects remain private unless signed URL is created.
DROP POLICY IF EXISTS "artwork auth select all" ON storage.objects;
CREATE POLICY "artwork auth select all"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'artwork');
