-- PTRN B2B Custom Apparel Platform Database Schema
-- Run this in your Supabase SQL editor

-- Enable RLS on all tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  size TEXT,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  billing_address JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'member',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products catalog
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  description TEXT,
  images JSONB,
  materials JSONB,
  colors JSONB,
  sizes JSONB,
  moq INTEGER DEFAULT 50,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  product_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  customization JSONB,
  status TEXT DEFAULT 'quote_requested' CHECK (status IN ('quote_requested', 'quoted', 'deposit_paid', 'in_production', 'quality_control', 'ready_to_ship', 'final_payment_due', 'shipped', 'delivered', 'completed', 'cancelled')),
  deposit_amount DECIMAL(10,2),
  deposit_paid BOOLEAN DEFAULT false,
  final_payment_paid BOOLEAN DEFAULT false,
  estimated_delivery DATE,
  production_notes TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Samples table
CREATE TABLE public.samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sample_number TEXT UNIQUE NOT NULL,
  products JSONB NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'ordered' CHECK (status IN ('ordered', 'processing', 'shipped', 'delivered', 'converted_to_order')),
  shipping_address JSONB,
  tracking_number TEXT,
  converted_order_id UUID REFERENCES public.orders(id),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Designer bookings
CREATE TABLE public.designer_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  designer_id TEXT NOT NULL,
  consultation_type TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled')),
  price DECIMAL(10,2) NOT NULL,
  meeting_link TEXT,
  notes TEXT,
  project_files JSONB,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- File uploads
CREATE TABLE public.file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.designer_bookings(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_purpose TEXT CHECK (file_purpose IN ('artwork', 'tech_pack', 'reference', 'proof', 'final_design')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Production updates
CREATE TABLE public.production_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT,
  photos JSONB,
  estimated_completion TIMESTAMPTZ,
  actual_completion TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pricing rules (for admin configuration)
CREATE TABLE public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type TEXT NOT NULL,
  customization_type TEXT NOT NULL,
  quantity_min INTEGER NOT NULL,
  quantity_max INTEGER,
  base_price DECIMAL(10,2) NOT NULL,
  customization_cost DECIMAL(10,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default products
INSERT INTO public.products (name, category, base_price, description, materials, colors, sizes) VALUES
('Classic T-Shirt', 'T-Shirts', 12.99, 'High-quality cotton tees ideal for events, promotions, and team uniforms.', 
 '["100% Cotton", "Cotton Blend", "Tri-Blend"]'::jsonb,
 '["Black", "White", "Gray", "Navy", "Red", "Blue", "Green"]'::jsonb,
 '["XS", "S", "M", "L", "XL", "XXL"]'::jsonb),
('Premium Hoodie', 'Hoodies', 24.99, 'Premium quality hoodies perfect for corporate merchandise and team wear.',
 '["Cotton Blend", "Organic Cotton", "Polyester"]'::jsonb,
 '["Black", "White", "Gray", "Navy", "Red"]'::jsonb,
 '["XS", "S", "M", "L", "XL", "XXL"]'::jsonb),
('Performance Polo', 'Polos', 18.99, 'Professional polo shirts with moisture-wicking technology.',
 '["Moisture-Wicking", "Cotton Blend", "Performance Poly"]'::jsonb,
 '["Black", "White", "Navy", "Gray", "Royal Blue"]'::jsonb,
 '["XS", "S", "M", "L", "XL", "XXL"]'::jsonb),
('Crew Sweatshirt', 'Sweatshirts', 22.99, 'Comfortable crew neck sweatshirts for casual corporate wear.',
 '["Cotton Fleece", "Organic Cotton", "Recycled Poly"]'::jsonb,
 '["Black", "White", "Gray", "Navy", "Maroon"]'::jsonb,
 '["XS", "S", "M", "L", "XL", "XXL"]'::jsonb);

-- Insert default pricing rules
INSERT INTO public.pricing_rules (product_type, customization_type, quantity_min, quantity_max, base_price, customization_cost, discount_percentage) VALUES
-- T-Shirt pricing
('t-shirt', 'screen-print', 50, 99, 12.99, 3.99, 0),
('t-shirt', 'screen-print', 100, 249, 12.99, 3.99, 5),
('t-shirt', 'screen-print', 250, 499, 12.99, 3.99, 10),
('t-shirt', 'screen-print', 500, 999, 12.99, 3.99, 15),
('t-shirt', 'screen-print', 1000, null, 12.99, 3.99, 20),

-- Hoodie pricing
('hoodie', 'screen-print', 50, 99, 24.99, 3.99, 0),
('hoodie', 'screen-print', 100, 249, 24.99, 3.99, 5),
('hoodie', 'screen-print', 250, 499, 24.99, 3.99, 10),
('hoodie', 'screen-print', 500, 999, 24.99, 3.99, 15),
('hoodie', 'screen-print', 1000, null, 24.99, 3.99, 20),

-- Embroidery pricing (higher cost)
('t-shirt', 'embroidery', 50, 99, 12.99, 5.99, 0),
('t-shirt', 'embroidery', 100, 249, 12.99, 5.99, 5),
('hoodie', 'embroidery', 50, 99, 24.99, 5.99, 0),
('hoodie', 'embroidery', 100, 249, 24.99, 5.99, 5);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designer_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Companies: Users can only see their own company
CREATE POLICY "Users can view own company" ON public.companies FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own company" ON public.companies FOR UPDATE USING (id = auth.uid());

-- Profiles: Users can manage their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR ALL USING (id = auth.uid());

-- Products: Public read access
CREATE POLICY "Products are publicly readable" ON public.products FOR SELECT USING (active = true);

-- Orders: Users can only see their company's orders
CREATE POLICY "Users can view company orders" ON public.orders FOR SELECT USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can insert company orders" ON public.orders FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can update company orders" ON public.orders FOR UPDATE USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Samples: Users can only see their company's samples
CREATE POLICY "Users can view company samples" ON public.samples FOR SELECT USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can insert company samples" ON public.samples FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Designer bookings: Users can only see their company's bookings
CREATE POLICY "Users can view company bookings" ON public.designer_bookings FOR SELECT USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can insert company bookings" ON public.designer_bookings FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- File uploads: Users can only see their own files
CREATE POLICY "Users can view own files" ON public.file_uploads FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own files" ON public.file_uploads FOR INSERT WITH CHECK (user_id = auth.uid());

-- Production updates: Users can view updates for their orders
CREATE POLICY "Users can view production updates" ON public.production_updates FOR SELECT USING (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Pricing rules: Public read access
CREATE POLICY "Pricing rules are publicly readable" ON public.pricing_rules FOR SELECT USING (active = true);

-- Functions

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'PTRN-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 100000;

-- Generate sample number
CREATE OR REPLACE FUNCTION generate_sample_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'SMPL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('sample_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create sequence for sample numbers
CREATE SEQUENCE IF NOT EXISTS sample_number_seq START 10000;

-- Trigger to auto-generate order numbers
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Trigger to auto-generate sample numbers
CREATE OR REPLACE FUNCTION set_sample_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sample_number IS NULL THEN
    NEW.sample_number := generate_sample_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_sample_number
  BEFORE INSERT ON public.samples
  FOR EACH ROW
  EXECUTE FUNCTION set_sample_number();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp triggers to all tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_samples_updated_at BEFORE UPDATE ON public.samples FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_designer_bookings_updated_at BEFORE UPDATE ON public.designer_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON public.pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Additional tables to align with current application code

-- Addresses (user-owned address book)
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT,
  full_name TEXT,
  company TEXT,
  phone TEXT,
  address1 TEXT NOT NULL,
  address2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  is_default_shipping BOOLEAN DEFAULT false,
  is_default_billing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can manage own addresses" ON public.addresses FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Update timestamp trigger for addresses
CREATE TRIGGER IF NOT EXISTS update_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Product variants (colors and images per view)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  color_name TEXT NOT NULL,
  color_hex TEXT,
  image_url TEXT,
  front_image_url TEXT,
  back_image_url TEXT,
  sleeve_image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Product variants are publicly readable" ON public.product_variants FOR SELECT USING (active = true);

-- Update timestamp trigger for product_variants
CREATE TRIGGER IF NOT EXISTS update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();