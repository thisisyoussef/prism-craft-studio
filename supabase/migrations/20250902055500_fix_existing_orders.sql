-- Fix existing orders before applying new constraints
-- This migration updates existing order statuses to match the new flow

-- First, update any existing orders with old statuses to new ones
UPDATE public.orders 
SET status = CASE 
  WHEN status = 'quote_requested' THEN 'deposit_pending'
  WHEN status = 'quoted' THEN 'deposit_pending'
  WHEN status = 'deposit_paid' THEN 'deposit_paid'
  WHEN status = 'in_production' THEN 'in_production'
  WHEN status = 'quality_control' THEN 'quality_check'
  WHEN status = 'ready_to_ship' THEN 'ready_to_ship'
  WHEN status = 'final_payment_due' THEN 'balance_pending'
  WHEN status = 'shipped' THEN 'shipped'
  WHEN status = 'delivered' THEN 'delivered'
  WHEN status = 'completed' THEN 'completed'
  WHEN status = 'cancelled' THEN 'cancelled'
  ELSE 'deposit_pending'
END
WHERE status NOT IN (
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
);

-- Now drop and recreate the constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

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
