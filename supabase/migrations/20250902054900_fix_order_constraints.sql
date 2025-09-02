-- Fix order flow constraints and add missing fields
-- This migration updates the orders table to match the new order flow

-- Drop the old status constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the new status constraint with updated statuses
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'deposit_pending',
  'deposit_paid', 
  'balance_pending',
  'balance_paid',
  'in_production', 
  'quality_check', 
  'ready_to_ship', 
  'shipped', 
  'delivered', 
  'completed', 
  'cancelled'
));

-- Add missing fields if they don't exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2);

-- Update default status to match new flow
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'deposit_pending';

-- Add payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('deposit', 'balance')),
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('requires_payment_method', 'processing', 'succeeded', 'failed', 'cancelled')),
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id, phase)
);

-- Add production_updates table if missing fields
ALTER TABLE public.production_updates ADD COLUMN IF NOT EXISTS photos_urls TEXT[];
ALTER TABLE public.production_updates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Enable RLS on new tables
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payments
CREATE POLICY "Users can view their company's payments" ON public.payments
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders 
      WHERE company_id IN (
        SELECT company_id FROM public.profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can manage all payments" ON public.payments
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
