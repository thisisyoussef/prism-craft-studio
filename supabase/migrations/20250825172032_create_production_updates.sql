-- Create production_updates table if it doesn't exist and add to realtime publication
-- Run: supabase db push (locally) or apply via Supabase SQL editor

create table if not exists public.production_updates (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  stage text not null,
  status text not null,
  description text,
  photos jsonb,
  estimated_completion timestamptz,
  actual_completion timestamptz,
  created_at timestamptz not null default now()
);

-- Enable RLS and basic select policy (company members can view their orders' updates)
alter table public.production_updates enable row level security;

-- Policy may already exist in another migration; drop/create defensively
drop policy if exists "Users can view production updates" on public.production_updates;
create policy "Users can view production updates"
  on public.production_updates for select to authenticated
  using (
    order_id in (
      select id from public.orders
      where company_id in (select company_id from public.profiles where id = auth.uid())
    )
  );

-- Allow admins/moderators to manage updates (defensive recreate)
drop policy if exists "Admins manage production updates" on public.production_updates;
create policy "Admins manage production updates"
  on public.production_updates for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','moderator')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','moderator')));

-- Add table to realtime publication so clients can subscribe
-- (Will no-op if already added)
alter publication supabase_realtime add table public.production_updates;
