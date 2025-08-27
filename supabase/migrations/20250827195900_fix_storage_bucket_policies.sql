-- Fix storage bucket policies to make images publicly readable
-- This allows the frontend to access uploaded product and variant images

-- Make product-images bucket publicly readable
UPDATE storage.buckets 
SET public = true 
WHERE id = 'product-images';

-- Make variant-images bucket publicly readable  
UPDATE storage.buckets 
SET public = true 
WHERE id = 'variant-images';

-- Add RLS policies for public read access (if they don't exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access for product images'
  ) THEN
    CREATE POLICY "Public read access for product images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access for variant images'
  ) THEN
    CREATE POLICY "Public read access for variant images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'variant-images');
  END IF;
END $$;
