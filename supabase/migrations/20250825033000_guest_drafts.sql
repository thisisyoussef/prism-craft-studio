-- guest_drafts table for storing guest quote/sample drafts
create extension if not exists pgcrypto;

create table if not exists public.guest_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('sample','quote')),
  info jsonb not null,
  address jsonb,
  draft jsonb not null,
  totals jsonb,
  pricing jsonb,
  status text not null default 'new',
  email_sent boolean not null default false
);

alter table public.guest_drafts enable row level security;

-- Allow anonymous inserts only. No update/delete/select for anon.
create policy guest_drafts_insert_anon on public.guest_drafts
  for insert
  to anon
  with check (true);

-- Allow authenticated staff to select if they have a custom claim role = 'staff'.
-- Adjust as needed for your project.
create policy guest_drafts_select_staff on public.guest_drafts
  for select
  to authenticated
  using (
    coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'staff', false)
  );

-- No update/delete by default
