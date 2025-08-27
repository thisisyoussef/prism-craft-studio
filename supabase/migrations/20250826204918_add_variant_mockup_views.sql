-- Add front/back/sleeve mockup image URLs to product_variants
alter table public.product_variants
  add column if not exists front_image_url text,
  add column if not exists back_image_url text,
  add column if not exists sleeve_image_url text;

-- Optional: create policies to allow admins to update these columns (assuming existing RLS permits admin updates)
-- No changes if policies already allow update on product_variants for admins.
