## Supabase Migration Checklist

Follow these steps to align your Supabase project with the updated app schema.

### 0) Prep
- **Backup**: Export current database and Storage.
- **Maintenance window**: Plan a short read-only window if production.

### 1) Run SQL in order
Run these statements in Supabase SQL editor (or split into migrations):

1. Functions and triggers (already present in `database/schema.sql`).
2. Enums: `order_status`, `sample_status`, `booking_status`, `payment_phase`, `payment_status`.
3. Tables:
   - `orders` (new shape) — if table exists, perform ALTERs instead of CREATE
   - `samples` (uses `total_amount`, enum status)
   - `designer_bookings` (uses `preferred_date`, enum status)
   - `addresses` (user-owned)
   - `product_variants`
   - `payments`
4. RLS policies for `addresses`, `product_variants`, `payments`.
5. Timestamp update triggers for new tables.

Reference file: `database/schema.sql`.

### 2) If tables already exist: ALTERs instead of CREATEs
Examples (adjust to current state):

```sql
-- Orders shape alignment
alter table public.orders add column if not exists product_id uuid references public.products(id);
alter table public.orders add column if not exists colors text[];
alter table public.orders add column if not exists sizes text[];
alter table public.orders add column if not exists customization_details jsonb;
alter table public.orders add column if not exists artwork_files text[];
alter table public.orders add column if not exists custom_text text;
alter table public.orders add column if not exists placement text;
alter table public.orders add column if not exists notes text;
do $$ begin create type public.order_status as enum ('draft','pending','confirmed','in_production','shipped','delivered','cancelled'); exception when duplicate_object then null; end $$;
alter table public.orders add column if not exists status public.order_status default 'draft';
alter table public.orders add column if not exists total_amount numeric(10,2);

-- Samples
do $$ begin create type public.sample_status as enum ('pending','approved','shipped','delivered','converted_to_order'); exception when duplicate_object then null; end $$;
alter table public.samples add column if not exists total_amount numeric(10,2);
alter table public.samples add column if not exists shipping_address jsonb;
alter table public.samples add column if not exists converted_order_id uuid references public.orders(id);
alter table public.samples add column if not exists status public.sample_status default 'pending';

-- Designer bookings
do $$ begin create type public.booking_status as enum ('pending','confirmed','completed','cancelled'); exception when duplicate_object then null; end $$;
alter table public.designer_bookings add column if not exists preferred_date timestamptz;
alter table public.designer_bookings add column if not exists status public.booking_status default 'pending';

-- Addresses
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text, full_name text, company text, phone text,
  address1 text not null, address2 text, city text not null, state text, postal_code text, country text not null default 'US',
  is_default_shipping boolean default false, is_default_billing boolean default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Product variants
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade not null,
  color_name text not null,
  color_hex text,
  image_url text, front_image_url text, back_image_url text, sleeve_image_url text,
  active boolean default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Payments
do $$ begin create type public.payment_phase as enum ('deposit','balance'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_status as enum ('requires_payment_method','requires_action','processing','succeeded','canceled','failed','refunded','partially_refunded'); exception when duplicate_object then null; end $$;
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  order_id uuid references public.orders(id) on delete cascade not null,
  phase public.payment_phase not null,
  amount_cents integer not null,
  currency text not null default 'USD',
  status public.payment_status not null default 'requires_payment_method',
  paid_at timestamptz,
  stripe_checkout_session_id text, stripe_payment_intent_id text, stripe_charge_id text,
  metadata jsonb
);
```

### 3) RLS policies
Ensure policies exist for:
- `orders`: company-based read/write; end-users can read own orders.
- `samples`: company-based read/insert.
- `payments`: read company’s orders or own orders.
- `addresses`: user-owned all.
- `product_variants`: public read.

### 4) Backfill data
- `orders.total_amount`: recompute from historical unit/quantity if previous columns existed, or set to 0 until recalculated by app.
- `orders.status`: map old statuses to new enum: quote_requested/quoted/deposit_paid/final_payment_due → `pending` or `confirmed` as applicable.
- `samples.total_amount`: copy from prior `total_price` if existed.
- `designer_bookings.preferred_date`: copy from previous scheduled date if present.

### 5) Storage & buckets
- Create `artwork` bucket; allow signed read; write restricted to authenticated users.
- Optional: `proofs` bucket for PDFs.

### 6) Edge functions / webhooks (optional)
- Create Stripe webhook and reconciliation function for payments.
- Add `reconcile-payment` function URL to Stripe Dashboard.

### 7) Env and secrets
- `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- For payments: Stripe keys if integrating now.

### 8) Verify
- Run through: customize → quote → deposit → production update → balance.
- Check RLS by testing a user from a different company (deny access).

### 9) Rollback plan
- Keep backup; have scripts to drop new columns/tables if needed.

