-- Payments schema for two-phase (deposit + balance) Stripe flow
-- 1) Enums
create type payment_status as enum ('requires_payment_method', 'requires_action', 'processing', 'succeeded', 'canceled', 'failed', 'refunded', 'partially_refunded');
create type payment_phase as enum ('deposit', 'balance');

-- 2) payments table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  order_id uuid not null references public.orders(id) on delete cascade,
  phase payment_phase not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',

  status payment_status not null default 'requires_payment_method',
  paid_at timestamptz,

  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,

  metadata jsonb default '{}'::jsonb
);

-- Ensure one row per phase per order
create unique index if not exists payments_order_phase_unique on public.payments(order_id, phase);
create index if not exists payments_order_idx on public.payments(order_id);
create index if not exists payments_status_idx on public.payments(status);

-- 3) orders helper amounts (optional, denormalized for UI)
alter table public.orders add column if not exists deposit_amount_cents integer;
alter table public.orders add column if not exists balance_amount_cents integer;

-- 4) trigger to update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

-- 5) RLS policies (open to authenticated users for their own orders)
alter table public.payments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_select_own'
  ) then
    execute 'create policy "payments_select_own" on public.payments for select using (exists (select 1 from public.orders o where o.id = payments.order_id and o.user_id = auth.uid()))';
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_insert_by_owner'
  ) then
    execute 'create policy "payments_insert_by_owner" on public.payments for insert with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()))';
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_update_by_owner'
  ) then
    execute 'create policy "payments_update_by_owner" on public.payments for update using (exists (select 1 from public.orders o where o.id = payments.order_id and o.user_id = auth.uid()))';
  end if;
end$$;
