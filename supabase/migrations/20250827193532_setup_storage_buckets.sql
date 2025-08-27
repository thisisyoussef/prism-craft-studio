-- Create or update public storage buckets and policies for product and variant images
-- Idempotent migration
begin;

-- Ensure product-images bucket exists and is public
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

-- Ensure variant-images bucket exists and is public (used for per-variant uploads)
insert into storage.buckets (id, name, public)
values ('variant-images', 'variant-images', true)
on conflict (id) do update set public = excluded.public;

-- Policies for product-images
drop policy if exists "Public read access for product-images" on storage.objects;
create policy "Public read access for product-images"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');

drop policy if exists "Authenticated insert for product-images" on storage.objects;
create policy "Authenticated insert for product-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "Authenticated update for product-images" on storage.objects;
create policy "Authenticated update for product-images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

drop policy if exists "Authenticated delete for product-images" on storage.objects;
create policy "Authenticated delete for product-images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');

-- Policies for variant-images
drop policy if exists "Public read access for variant-images" on storage.objects;
create policy "Public read access for variant-images"
  on storage.objects for select
  to public
  using (bucket_id = 'variant-images');

drop policy if exists "Authenticated insert for variant-images" on storage.objects;
create policy "Authenticated insert for variant-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'variant-images');

drop policy if exists "Authenticated update for variant-images" on storage.objects;
create policy "Authenticated update for variant-images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'variant-images')
  with check (bucket_id = 'variant-images');

drop policy if exists "Authenticated delete for variant-images" on storage.objects;
create policy "Authenticated delete for variant-images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'variant-images');

commit;
