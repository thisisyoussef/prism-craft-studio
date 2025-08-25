-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.order_status AS ENUM ('draft', 'pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled');
CREATE TYPE public.sample_status AS ENUM ('pending', 'approved', 'shipped', 'delivered', 'converted_to_order');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- Create companies table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    role app_role DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Create products table
CREATE TABLE public.products (
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
CREATE TABLE public.orders (
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
CREATE TABLE public.samples (
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
CREATE TABLE public.designer_bookings (
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

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

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
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_samples_updated_at
    BEFORE UPDATE ON public.samples
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_designer_bookings_updated_at
    BEFORE UPDATE ON public.designer_bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create sequences for order and sample numbers
CREATE SEQUENCE public.order_number_seq START 1000;
CREATE SEQUENCE public.sample_number_seq START 1000;

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

CREATE TRIGGER set_order_number_trigger
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_order_number();

CREATE TRIGGER set_sample_number_trigger
    BEFORE INSERT ON public.samples
    FOR EACH ROW
    EXECUTE FUNCTION public.set_sample_number();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, first_name, last_name, email)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'last_name',
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample products
INSERT INTO public.products (name, description, category, base_price, image_url, available_colors, available_sizes) VALUES
('Premium Cotton T-Shirt', 'High-quality 100% cotton t-shirt perfect for custom printing', 'T-Shirts', 24.99, '/placeholder.svg', ARRAY['White', 'Black', 'Navy', 'Gray', 'Red'], ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL']),
('Polo Shirt', 'Professional polo shirt ideal for corporate branding', 'Polo Shirts', 34.99, '/placeholder.svg', ARRAY['White', 'Black', 'Navy', 'Gray'], ARRAY['S', 'M', 'L', 'XL', 'XXL']),
('Hoodie', 'Comfortable fleece hoodie for casual wear', 'Hoodies', 49.99, '/placeholder.svg', ARRAY['Black', 'Gray', 'Navy', 'Maroon'], ARRAY['S', 'M', 'L', 'XL', 'XXL']),
('Baseball Cap', 'Adjustable baseball cap with custom embroidery options', 'Accessories', 19.99, '/placeholder.svg', ARRAY['Black', 'Navy', 'White', 'Red'], ARRAY['One Size']);