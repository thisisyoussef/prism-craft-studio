-- Fix order timeline RLS policies to allow system triggers
-- The database triggers need to be able to insert timeline events

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view timeline for their orders" ON public.order_timeline;
DROP POLICY IF EXISTS "Admins can view all order timelines" ON public.order_timeline;

-- Create more permissive policies that allow system operations
CREATE POLICY "Users can view timeline for their orders" ON public.order_timeline
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE id = order_timeline.order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order timelines" ON public.order_timeline
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Allow system/triggers to insert timeline events
CREATE POLICY "System can insert timeline events" ON public.order_timeline
  FOR INSERT WITH CHECK (true);

-- Allow admins to insert timeline events manually
CREATE POLICY "Admins can insert timeline events" ON public.order_timeline
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Allow system/triggers to update timeline events
CREATE POLICY "System can update timeline events" ON public.order_timeline
  FOR UPDATE USING (true);
