-- Addresses table for user address book
create extension if not exists pgcrypto;

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,

  label text, -- e.g., "Office", "Warehouse"
  full_name text,
  company text,
  phone text,

  address1 text not null,
  address2 text,
  city text not null,
  state text,
  postal_code text,
  country text not null default 'US',

  is_default_shipping boolean not null default false,
  is_default_billing boolean not null default false
);

alter table public.addresses enable row level security;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_addresses_updated_at
before update on public.addresses
for each row execute function public.set_updated_at();

-- RLS: users can manage their own addresses
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'addresses' and policyname = 'addresses_select_own'
  ) then
    create policy "addresses_select_own" on public.addresses for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'addresses' and policyname = 'addresses_insert_own'
  ) then
    create policy "addresses_insert_own" on public.addresses for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'addresses' and policyname = 'addresses_update_own'
  ) then
    create policy "addresses_update_own" on public.addresses for update using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'addresses' and policyname = 'addresses_delete_own'
  ) then
    create policy "addresses_delete_own" on public.addresses for delete using (auth.uid() = user_id);
  end if;
end $$;
