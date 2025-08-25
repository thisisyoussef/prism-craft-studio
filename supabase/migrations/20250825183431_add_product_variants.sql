-- Product variants: per-color stock/pricing
-- Conventions follow existing schema and RLS approach

BEGIN;

-- Table: product_variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10,2), -- optional override of products.base_price
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_product_color UNIQUE (product_id, color_hex)
);

-- Enable RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- Public read (variants are visible to all like products)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_variants' AND policyname='Variants are publicly readable'
  ) THEN
    CREATE POLICY "Variants are publicly readable" ON public.product_variants FOR SELECT USING (true);
  END IF;
END $$;

-- Admin write policies
-- Allow admins to insert/update/delete
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_variants' AND policyname='Admins can insert variants'
  ) THEN
    CREATE POLICY "Admins can insert variants" ON public.product_variants
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_variants' AND policyname='Admins can update variants'
  ) THEN
    CREATE POLICY "Admins can update variants" ON public.product_variants
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_variants' AND policyname='Admins can delete variants'
  ) THEN
    CREATE POLICY "Admins can delete variants" ON public.product_variants
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
      );
  END IF;
END $$;

-- Trigger to maintain updated_at
CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill helper: seed variants from existing available_colors if present
-- This creates one variant per color with default stock=0 and no price override
INSERT INTO public.product_variants (product_id, color_name, color_hex, stock, price, image_url, active)
SELECT
  p.id,
  c AS color_name,
  -- naive hex fallback for common color names; otherwise use '#000000'
  CASE LOWER(c)
    WHEN 'white' THEN '#FFFFFF'
    WHEN 'black' THEN '#000000'
    WHEN 'navy' THEN '#001F3F'
    WHEN 'gray' THEN '#808080'
    WHEN 'grey' THEN '#808080'
    WHEN 'red' THEN '#FF0000'
    WHEN 'maroon' THEN '#800000'
    WHEN 'blue' THEN '#0000FF'
    WHEN 'green' THEN '#008000'
    WHEN 'yellow' THEN '#FFFF00'
    ELSE '#000000'
  END AS color_hex,
  0 AS stock,
  NULL::DECIMAL(10,2) AS price,
  p.image_url,
  true AS active
FROM public.products p
CROSS JOIN LATERAL UNNEST(COALESCE(p.available_colors, ARRAY[]::TEXT[])) AS c
ON CONFLICT DO NOTHING;

COMMIT;
