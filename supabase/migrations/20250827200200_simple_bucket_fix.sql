-- Simple bucket public access fix
-- Only update what we have permissions for

-- Force update buckets to be public
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('product-images', 'variant-images');

-- Show final bucket status to verify
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id IN ('product-images', 'variant-images');
