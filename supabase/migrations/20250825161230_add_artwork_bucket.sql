-- Create private Storage bucket for artwork assets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('artwork', 'artwork', false, null, null)
on conflict (id) do nothing;

-- Policies for storage.objects in 'artwork' bucket
-- Allow only admins/moderators (from public.profiles.role) to insert/update/delete objects
-- Optional: allow admins/moderators to select (list) objects. Regular users will access via signed URLs.

drop policy if exists "artwork admin insert" on storage.objects;
create policy "artwork admin insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'artwork'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role in ('admin','moderator')
    )
  );

drop policy if exists "artwork admin update" on storage.objects;
create policy "artwork admin update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'artwork'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role in ('admin','moderator')
    )
  )
  with check (
    bucket_id = 'artwork'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role in ('admin','moderator')
    )
  );

drop policy if exists "artwork admin delete" on storage.objects;
create policy "artwork admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'artwork'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role in ('admin','moderator')
    )
  );

drop policy if exists "artwork admin select" on storage.objects;
create policy "artwork admin select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'artwork'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role in ('admin','moderator')
    )
  );
