-- Fix RLS policies for production_updates and orders to use profiles.user_id
-- This addresses RLS violations when admins or company members insert production updates

-- production_updates: users can view updates for their company's orders
DROP POLICY IF EXISTS "Users can view production updates" ON public.production_updates;
CREATE POLICY "Users can view production updates"
  ON public.production_updates FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT o.id
      FROM public.orders o
      WHERE o.company_id IN (
        SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid()
      )
    )
  );

-- production_updates: admins/moderators can manage all updates
DROP POLICY IF EXISTS "Admins manage production updates" ON public.production_updates;
CREATE POLICY "Admins manage production updates"
  ON public.production_updates FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin','moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin','moderator')
    )
  );

-- Optional: company members can insert updates for their own company's orders
DROP POLICY IF EXISTS "Company can insert own order updates" ON public.production_updates;
CREATE POLICY "Company can insert own order updates"
  ON public.production_updates FOR INSERT TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT o.id FROM public.orders o
      WHERE o.company_id IN (
        SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid()
      )
    )
  );

-- orders: admins/moderators can update any order (status etc.)
DROP POLICY IF EXISTS "Admins can update any order" ON public.orders;
CREATE POLICY "Admins can update any order"
  ON public.orders FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin','moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('admin','moderator')
    )
  );
