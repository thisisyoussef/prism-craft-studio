-- Create 'artwork' storage bucket (idempotent) and basic RLS policies
-- Run via supabase db push or in SQL editor

-- 1) Bucket
insert into storage.buckets (id, name, public)
select 'artwork', 'artwork', false
where not exists (select 1 from storage.buckets where id = 'artwork');

-- 2) Allow authenticated users to select metadata in 'artwork' (needed for createSignedUrl)
drop policy if exists "artwork auth select all" on storage.objects;
create policy "artwork auth select all"
  on storage.objects for select to authenticated
  using (bucket_id = 'artwork');

-- 3) Allow authenticated users to upload/update their own objects
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'artwork insert own'
  ) then
    execute 'create policy "artwork insert own" on storage.objects for insert to authenticated with check (bucket_id = ''artwork'')';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'artwork update own'
  ) then
    execute 'create policy "artwork update own" on storage.objects for update to authenticated using (bucket_id = ''artwork'') with check (bucket_id = ''artwork'')';
  end if;
end$$;

-- 4) Optionally allow admins/moderators to manage any objects in artwork bucket
-- Requires profiles.role mapping (adjust if different)
create or replace view public.admin_user as
select id from public.profiles where role in ('admin','moderator');

drop policy if exists "artwork admin manage" on storage.objects;
create policy "artwork admin manage"
  on storage.objects for all to authenticated
  using (bucket_id = 'artwork' and exists (select 1 from public.admin_user a where a.id = auth.uid()))
  with check (bucket_id = 'artwork' and exists (select 1 from public.admin_user a where a.id = auth.uid()));
