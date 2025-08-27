-- Add labels column to orders for tagging
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}'::text[];
