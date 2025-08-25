-- Create storage bucket for variant images with public read and admin-only write
begin;

-- Ensure storage schema exists (on hosted supabase it does by default)
-- Create bucket if not exists
insert into storage.buckets (id, name, public)
values ('variant-images', 'variant-images', true)
on conflict (id) do nothing;

-- Policies on storage.objects
-- Enable RLS (enabled by default)

-- Public can read images
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read variant images'
  ) then
    create policy "Public read variant images"
      on storage.objects for select
      using ( bucket_id = 'variant-images' );
  end if;
end $$;

-- Only admins can insert/update/delete
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Admins write variant images'
  ) then
    create policy "Admins write variant images"
      on storage.objects for all
      using (
        bucket_id = 'variant-images' and
        exists (
          select 1 from public.profiles p
          where p.user_id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        bucket_id = 'variant-images' and
        exists (
          select 1 from public.profiles p
          where p.user_id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end $$;

commit;
