-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE public.order_status AS ENUM ('draft', 'pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.sample_status AS ENUM ('pending', 'approved', 'shipped', 'delivered', 'converted_to_order');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    base_price DECIMAL(10,2),
    image_url TEXT,
    available_colors TEXT[],
    available_sizes TEXT[],
    customization_options JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    colors TEXT[],
    sizes TEXT[],
    customization_details JSONB,
    artwork_files TEXT[],
    custom_text TEXT,
    placement TEXT,
    notes TEXT,
    total_amount DECIMAL(10,2),
    status order_status DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create samples table
CREATE TABLE IF NOT EXISTS public.samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_number TEXT UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    product_names TEXT[],
    shipping_address JSONB,
    total_amount DECIMAL(10,2),
    status sample_status DEFAULT 'pending',
    converted_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create designer_bookings table
CREATE TABLE IF NOT EXISTS public.designer_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    consultation_type TEXT,
    preferred_date TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 60,
    notes TEXT,
    status booking_status DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designer_bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for companies
CREATE POLICY "Users can view their company" ON public.companies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.company_id = companies.id
        )
    );

-- Create RLS policies for products (publicly readable)
CREATE POLICY "Products are publicly readable" ON public.products
    FOR SELECT USING (true);

-- Create RLS policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON public.orders
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for samples
CREATE POLICY "Users can view their own samples" ON public.samples
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own samples" ON public.samples
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own samples" ON public.samples
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for designer bookings
CREATE POLICY "Users can view their own bookings" ON public.designer_bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookings" ON public.designer_bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON public.designer_bookings
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_samples_updated_at ON public.samples;
CREATE TRIGGER update_samples_updated_at
    BEFORE UPDATE ON public.samples
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_designer_bookings_updated_at ON public.designer_bookings;
CREATE TRIGGER update_designer_bookings_updated_at
    BEFORE UPDATE ON public.designer_bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create sequences for order and sample numbers
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS public.sample_number_seq START 1000;

-- Create functions to generate order and sample numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'ORD-' || LPAD(nextval('public.order_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.generate_sample_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'SMP-' || LPAD(nextval('public.sample_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-generate order and sample numbers
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number = public.generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_sample_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sample_number IS NULL THEN
        NEW.sample_number = public.generate_sample_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number_trigger ON public.orders;
CREATE TRIGGER set_order_number_trigger
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_order_number();

DROP TRIGGER IF EXISTS set_sample_number_trigger ON public.samples;
CREATE TRIGGER set_sample_number_trigger
    BEFORE INSERT ON public.samples
    FOR EACH ROW
    EXECUTE FUNCTION public.set_sample_number();

-- Insert some sample products
INSERT INTO public.products (name, description, category, base_price, image_url, available_colors, available_sizes) 
VALUES
('Premium Cotton T-Shirt', 'High-quality 100% cotton t-shirt perfect for custom printing', 'T-Shirts', 24.99, '/placeholder.svg', ARRAY['White', 'Black', 'Navy', 'Gray', 'Red'], ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL']),
('Polo Shirt', 'Professional polo shirt ideal for corporate branding', 'Polo Shirts', 34.99, '/placeholder.svg', ARRAY['White', 'Black', 'Navy', 'Gray'], ARRAY['S', 'M', 'L', 'XL', 'XXL']),
('Hoodie', 'Comfortable fleece hoodie for casual wear', 'Hoodies', 49.99, '/placeholder.svg', ARRAY['Black', 'Gray', 'Navy', 'Maroon'], ARRAY['S', 'M', 'L', 'XL', 'XXL']),
('Baseball Cap', 'Adjustable baseball cap with custom embroidery options', 'Accessories', 19.99, '/placeholder.svg', ARRAY['Black', 'Navy', 'White', 'Red'], ARRAY['One Size'])
ON CONFLICT DO NOTHING;