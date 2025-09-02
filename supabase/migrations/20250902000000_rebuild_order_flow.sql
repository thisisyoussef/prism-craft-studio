-- Complete Order Flow Rebuild - Database Schema
-- This migration rebuilds the entire order flow system from scratch

-- Drop existing problematic tables and recreate
DROP TABLE IF EXISTS public.production_updates CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;

-- Create enhanced orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  
  -- Customer info
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Product details
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_category TEXT NOT NULL,
  
  -- Order specifics
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  
  -- Customization details (JSONB for flexibility)
  customization JSONB NOT NULL DEFAULT '{}',
  colors TEXT[] NOT NULL DEFAULT '{}',
  sizes JSONB NOT NULL DEFAULT '{}',
  print_locations JSONB NOT NULL DEFAULT '[]',
  
  -- Order status and workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      'draft',           -- Initial creation
      'quote_requested', -- Customer requested quote
      'quoted',          -- Admin provided quote
      'deposit_pending', -- Waiting for deposit payment
      'deposit_paid',    -- Deposit received, ready for production
      'in_production',   -- Currently being produced
      'quality_check',   -- In quality control
      'balance_pending', -- Waiting for final payment
      'balance_paid',    -- Final payment received
      'ready_to_ship',   -- Ready for shipping
      'shipped',         -- Order shipped
      'delivered',       -- Order delivered
      'completed',       -- Order completed
      'cancelled',       -- Order cancelled
      'refunded'         -- Order refunded
    )
  ),
  
  -- Payment tracking
  deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  deposit_paid_at TIMESTAMPTZ,
  balance_paid_at TIMESTAMPTZ,
  
  -- Shipping and delivery
  shipping_address JSONB,
  tracking_number TEXT,
  estimated_delivery DATE,
  actual_delivery DATE,
  
  -- Files and notes
  artwork_files JSONB DEFAULT '[]',
  production_notes TEXT,
  customer_notes TEXT,
  admin_notes TEXT,
  
  -- Stripe integration
  stripe_deposit_payment_intent TEXT,
  stripe_balance_payment_intent TEXT,
  
  -- Metadata
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  labels TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_amounts CHECK (deposit_amount + balance_amount = total_amount)
);

-- Create payments table for detailed payment tracking
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  
  -- Payment details
  phase TEXT NOT NULL CHECK (phase IN ('deposit', 'balance', 'full', 'refund')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  
  -- Payment status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'processing',
      'succeeded',
      'failed',
      'cancelled',
      'refunded',
      'partially_refunded'
    )
  ),
  
  -- Stripe integration
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_charge_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Unique constraint: one payment per phase per order
  UNIQUE(order_id, phase)
);

-- Create production updates table
CREATE TABLE public.production_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  
  -- Update details
  stage TEXT NOT NULL, -- e.g., 'design', 'printing', 'quality_check', 'packaging'
  status TEXT NOT NULL, -- e.g., 'started', 'in_progress', 'completed', 'delayed'
  title TEXT NOT NULL,
  description TEXT,
  
  -- Media attachments
  photos JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  
  -- Timeline
  estimated_completion TIMESTAMPTZ,
  actual_completion TIMESTAMPTZ,
  
  -- Admin who created the update
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Visibility
  visible_to_customer BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order timeline table for audit trail
CREATE TABLE public.order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  
  -- Event details
  event_type TEXT NOT NULL, -- e.g., 'status_change', 'payment', 'note_added', 'file_uploaded'
  event_data JSONB NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  
  -- Who triggered the event
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_source TEXT DEFAULT 'manual', -- 'manual', 'system', 'webhook', 'api'
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_company_id ON public.orders(company_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);

CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_stripe_payment_intent ON public.payments(stripe_payment_intent_id);

CREATE INDEX idx_production_updates_order_id ON public.production_updates(order_id);
CREATE INDEX idx_production_updates_created_at ON public.production_updates(created_at DESC);

CREATE INDEX idx_order_timeline_order_id ON public.order_timeline(order_id);
CREATE INDEX idx_order_timeline_created_at ON public.order_timeline(created_at DESC);

-- Create sequences for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 100000;

-- Create function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'PTRN-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically set order number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to log order events
CREATE OR REPLACE FUNCTION log_order_event()
RETURNS TRIGGER AS $$
DECLARE
  event_desc TEXT;
  event_data JSONB;
BEGIN
  -- Determine event type and description
  IF TG_OP = 'INSERT' THEN
    event_desc := 'Order created';
    event_data := jsonb_build_object('status', NEW.status, 'total_amount', NEW.total_amount);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      event_desc := 'Status changed from ' || OLD.status || ' to ' || NEW.status;
      event_data := jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status);
    ELSE
      event_desc := 'Order updated';
      event_data := jsonb_build_object('status', NEW.status);
    END IF;
  END IF;
  
  -- Insert timeline event
  INSERT INTO public.order_timeline (order_id, event_type, event_data, description, trigger_source)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'INSERT' THEN 'order_created' 
         WHEN OLD.status != NEW.status THEN 'status_change'
         ELSE 'order_updated' END,
    event_data,
    event_desc,
    'system'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_production_updates_updated_at
  BEFORE UPDATE ON public.production_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_log_order_events
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_event();

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_timeline ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own draft orders" ON public.orders
  FOR UPDATE USING (user_id = auth.uid() AND status = 'draft');

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can update all orders" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for payments
CREATE POLICY "Users can view their order payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE id = payments.order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage payments" ON public.payments
  FOR ALL USING (true); -- Payments are managed by system/webhooks

-- RLS Policies for production updates
CREATE POLICY "Users can view updates for their orders" ON public.production_updates
  FOR SELECT USING (
    visible_to_customer = true AND
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE id = production_updates.order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all production updates" ON public.production_updates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for order timeline
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

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_timeline;

-- Insert sample data for testing
INSERT INTO public.orders (
  user_id, 
  product_name, 
  product_category, 
  quantity, 
  unit_price, 
  total_amount, 
  deposit_amount, 
  balance_amount,
  customization, 
  colors, 
  sizes,
  customer_notes
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'Classic T-Shirt',
  'T-Shirts',
  100,
  15.99,
  1599.00,
  639.60,
  959.40,
  '{"method": "screen-print", "locations": ["front", "back"]}'::jsonb,
  ARRAY['Black', 'White'],
  '{"S": 20, "M": 30, "L": 30, "XL": 20}'::jsonb,
  'Please use high-quality ink for durability'
) ON CONFLICT DO NOTHING;
